import express, { type NextFunction, type Request, type Response } from 'express';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { getProduct, NotFoundError, products } from './catalog';
import * as mercadolibre from './integrations/mercadolibre';
import * as shopify from './integrations/shopify';
import { ingestOrder } from './pipeline';
import { resetQueue, retryJob } from './queue';
import { recommend } from './recommend';
import { bus, inventoryRow, log, resetState, snapshot, state } from './store';

// `--dev`: API on a fixed port behind Vite's proxy. Production: one process on $PORT serving API + built React app.
const DEV = process.argv.includes('--dev');
const PORT = DEV ? 5551 : Number(process.env.PORT ?? 5551);
const SELF = `http://127.0.0.1:${PORT}`;
const app = express();
app.disable('x-powered-by');
if (!DEV) app.set('trust proxy', 1); // real client IP behind the host's load balancer

resetState();

// ---------------------------------------------------------------------------
// Webhooks (registered BEFORE the JSON parser: Shopify's HMAC is computed on the raw body)
// ---------------------------------------------------------------------------

app.post('/webhooks/shopify/orders-create', express.raw({ type: 'application/json' }), (req, res) => {
  const raw = req.body as Buffer;
  if (!shopify.verifyHmac(raw, req.get('x-shopify-hmac-sha256'))) {
    log('error', 'security', 'Shopify webhook rejected: HMAC signature mismatch → 401, nothing processed');
    return res.sendStatus(401);
  }
  let order;
  try {
    order = shopify.normalize(JSON.parse(raw.toString('utf8')));
  } catch (err) {
    log('error', 'shopify', `Bad webhook payload: ${(err as Error).message}`);
    return res.sendStatus(400);
  }
  res.sendStatus(200); // acknowledge fast; Shopify retries anything slow or non-2xx
  ingestOrder(order);
});

app.post('/webhooks/mercadolibre', express.json(), (req, res) => {
  const n = req.body as mercadolibre.MlNotification;
  res.sendStatus(200); // Mercado Libre expects a quick 200, then we fetch the resource ourselves
  if (n?.topic !== 'orders_v2') return;
  if (n.user_id !== mercadolibre.SELLER_ID) {
    log('error', 'security', `Mercado Libre notification for unknown seller ${n.user_id} ignored`);
    return;
  }
  void (async () => {
    try {
      const mlOrder = await mercadolibre.fetchOrder(n.resource);
      log('info', 'mercadolibre', `GET ${n.resource} → status ${mlOrder.status}, ${mlOrder.order_items.length} item(s)`);
      ingestOrder(mercadolibre.normalize(mlOrder));
    } catch (err) {
      log('error', 'mercadolibre', `Could not load ${n.resource}: ${(err as Error).message} (ML will re-send the notification)`);
    }
  })();
});

// ---------------------------------------------------------------------------
// Storefront + ops API
// ---------------------------------------------------------------------------

app.use('/api', express.json({ limit: '20kb' }));

// The demo is public: keep anyone from hammering the simulators (30 actions/min per IP).
const hits = new Map<string, { n: number; reset: number }>();
app.use(['/api/simulate', '/api/chaos', '/api/reset', '/api/jobs'], (req, res, next) => {
  if (req.method !== 'POST') return next();
  const key = req.ip ?? 'unknown';
  const t = Date.now();
  const h = hits.get(key);
  if (!h || t > h.reset) {
    hits.set(key, { n: 1, reset: t + 60_000 });
    if (hits.size > 5000) hits.clear();
    return next();
  }
  if (++h.n > 30) return res.status(429).json({ error: 'Easy there — try again in a minute' });
  next();
});

app.get('/api/products', (_req, res) => res.json(products));

const familyEnum = z.enum(['woody', 'floral', 'citrus', 'fresh', 'gourmand', 'amber', 'musky', 'spicy']);
const quizSchema = z.object({
  loves: z.array(familyEnum).max(3),
  avoid: z.array(familyEnum).max(4),
  occasion: z.enum(['everyday', 'office', 'evening', 'date', 'summer']),
  intensity: z.enum(['soft', 'balanced', 'statement']),
  format: z.enum(['eau-de-parfum', 'body-mist', 'any']),
});

app.post('/api/recommend', (req, res) => {
  res.json(recommend(quizSchema.parse(req.body), products));
});

app.get('/api/ops', (_req, res) => res.json(snapshot()));

// Server-Sent Events: dashboards get a fresh snapshot whenever anything changes.
app.get('/api/stream', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.flushHeaders();
  const send = () => res.write(`data: ${JSON.stringify(snapshot())}\n\n`);
  send();
  bus.on('change', send);
  // Heartbeat: lets the client spot a dead connection (e.g. behind a proxy) and reconnect.
  const ping = setInterval(() => res.write('event: ping\ndata: 1\n\n'), 5_000);
  req.on('close', () => {
    bus.off('change', send);
    clearInterval(ping);
  });
});

// --- Simulators: play the part of Shopify and Mercado Libre --------------------

// Express 4 doesn't catch rejected promises: forward them to the error handler.
const wrap = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => {
  fn(req, res).catch(next);
};

type Delivery = { url: string; headers: Record<string, string>; body: string; label: string };
let lastDelivery: Delivery | null = null;

async function deliver(d: Delivery) {
  lastDelivery = d;
  const r = await fetch(SELF + d.url, { method: 'POST', headers: d.headers, body: d.body });
  return r.status;
}

const buySchema = z.object({ productId: z.string(), qty: z.number().int().min(1).max(5).default(1) });

app.post('/api/simulate/shopify-order', wrap(async (req, res) => {
  const { productId, qty } = buySchema.parse(req.body);
  const product = getProduct(productId);
  const row = inventoryRow(productId);
  if (row.shopify.qty < qty) return res.status(409).json({ error: `${product.name} is sold out on the storefront` });

  row.shopify.qty -= qty; // Shopify decrements its own count at checkout
  const orderNumber = state.nextShopifyOrder++;
  const payload = shopify.buildOrderWebhook(product, qty, orderNumber);
  const body = JSON.stringify(payload);
  log('info', 'shopify', `Checkout ${payload.name} · ${qty}× ${product.name} · $${payload.total_price} → webhook orders/create`);
  const status = await deliver({
    url: '/webhooks/shopify/orders-create',
    label: `Shopify orders/create ${payload.name}`,
    body,
    headers: {
      'content-type': 'application/json',
      'x-shopify-topic': 'orders/create',
      'x-shopify-shop-domain': 'scent-studio-demo.myshopify.com',
      'x-shopify-webhook-id': crypto.randomUUID(),
      'x-shopify-hmac-sha256': shopify.sign(body),
    },
  });
  res.json({ ok: status === 200, orderName: payload.name });
}));

app.post('/api/simulate/mercadolibre-order', wrap(async (req, res) => {
  const requested = z.object({ productId: z.string().optional() }).parse(req.body ?? {}).productId;
  // A marketplace buyer sees what Mercado Libre *thinks* is in stock — which can be stale.
  const candidates = [...state.inventory.values()].filter((r) => r.mercadolibre.qty > 0 && (!requested || r.productId === requested));
  if (!candidates.length) return res.status(409).json({ error: 'Nothing listed as available on Mercado Libre' });
  const row = candidates[Math.floor(Math.random() * candidates.length)];
  const product = getProduct(row.productId);
  row.mercadolibre.qty -= 1;

  const { order, notification } = mercadolibre.createMarketplaceSale(product, 1);
  log('info', 'mercadolibre', `Sale on Mercado Libre · order ${order.id} · 1× ${product.name} → notification orders_v2`);
  const status = await deliver({
    url: '/webhooks/mercadolibre',
    label: `Mercado Libre orders_v2 ${order.id}`,
    body: JSON.stringify(notification),
    headers: { 'content-type': 'application/json' },
  });
  res.json({ ok: status === 200, orderId: order.id });
}));

app.post('/api/simulate/replay-last', wrap(async (_req, res) => {
  if (!lastDelivery) return res.status(409).json({ error: 'No webhook sent yet — place an order first' });
  log('warn', 'security', `Re-delivering ${lastDelivery.label} (platforms retry, so duplicates are normal)`);
  res.json({ status: await deliver(lastDelivery) });
}));

app.post('/api/simulate/forged-webhook', wrap(async (_req, res) => {
  const product = products[0];
  const body = JSON.stringify(shopify.buildOrderWebhook(product, 5, 999999));
  log('warn', 'security', 'Someone POSTs a fake order (5× Velvet Cedar) to the Shopify webhook URL…');
  const r = await fetch(`${SELF}/webhooks/shopify/orders-create`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-shopify-hmac-sha256': shopify.sign(body, 'attacker-guess') },
    body,
  });
  res.json({ status: r.status });
}));

app.post('/api/chaos', (req, res) => {
  state.chaos = z.object({ enabled: z.boolean() }).parse(req.body).enabled;
  log(state.chaos ? 'warn' : 'info', 'queue', state.chaos ? 'Chaos mode ON — external APIs now fail ~55% of calls' : 'Chaos mode OFF — APIs healthy');
  res.json({ chaos: state.chaos });
});

app.post('/api/jobs/:id/retry', (req, res) => {
  res.json({ ok: retryJob(req.params.id) });
});

app.post('/api/reset', (_req, res) => {
  resetQueue();
  mercadolibre.resetRemote();
  lastDelivery = null;
  resetState();
  res.json({ ok: true });
});

// Validation errors → 400 with a readable message
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof z.ZodError) return res.status(400).json({ error: 'Invalid request', issues: err.issues });
  if (err instanceof NotFoundError) return res.status(404).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: (err as Error).message ?? 'Server error' });
});

// Production: serve the built React app from the same process.
const dist = fileURLToPath(new URL('../dist', import.meta.url));
if (!DEV && existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api|webhooks).*/, (_req, res) => res.sendFile(`${dist}/index.html`));
}

// Dev: localhost only. Production: all interfaces so the host's proxy can reach it.
app.listen(PORT, DEV ? '127.0.0.1' : '0.0.0.0', () => console.log(`API ready on port ${PORT}${DEV ? ' (dev)' : ''}`));
