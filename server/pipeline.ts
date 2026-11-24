import type { Channel, Order } from '../shared/types';
import { CHANNEL_LABEL } from '../shared/types';
import { getProduct } from './catalog';
import * as mercadolibre from './integrations/mercadolibre';
import * as quickbooks from './integrations/quickbooks';
import * as shopify from './integrations/shopify';
import { enqueue, registerHandler } from './queue';
import { inventoryRow, log, now, state } from './store';

/** Keep memory bounded on the public demo. */
const trim = () => {
  if (state.orders.length > 500) state.orders.length = 500;
  if (state.ledger.length > 500) state.ledger.length = 500;
};

const other = (c: Channel): Channel => (c === 'shopify' ? 'mercadolibre' : 'shopify');

/**
 * Every order, whatever channel it came from, goes through the same steps:
 * 1. dedupe (webhooks are at-least-once)  2. reserve stock from the single source of truth
 * 3. queue the side effects (accounting + pushing stock to the other channel) so a slow
 *    or failing API never blocks or loses the order.
 */
export function ingestOrder(order: Order): Order {
  const dup = state.orders.find((o) => o.channel === order.channel && o.externalId === order.externalId);
  if (dup) {
    log('info', order.channel, `Duplicate delivery for order ${order.externalId} ignored — already processed (idempotent)`);
    return dup;
  }

  const short = order.lines.filter((l) => inventoryRow(l.productId).onHand < l.qty);
  if (short.length) {
    order.status = 'flagged';
    order.flagReason = short.map((l) => `${l.name}: wanted ${l.qty}, ${inventoryRow(l.productId).onHand} on hand`).join('; ');
    state.orders.unshift(order);
    trim();
    log('error', 'inventory', `Oversell on ${CHANNEL_LABEL[order.channel]} order ${order.externalId} (${order.flagReason}) — flagged for cancel/refund, not posted to QuickBooks`);
    // The channel's count was stale: correct it now.
    for (const l of short) queueStockSync(order.channel, l.productId, order.id);
    return order;
  }

  for (const l of order.lines) inventoryRow(l.productId).onHand -= l.qty;
  state.orders.unshift(order);
  trim();
  log('ok', 'inventory', `${CHANNEL_LABEL[order.channel]} order ${order.externalId} accepted · ${order.lines.map((l) => `${l.qty}× ${l.name}`).join(', ')} · stock reserved`);

  enqueue({ kind: 'quickbooks.salesReceipt', orderId: order.id, label: `QuickBooks · SalesReceipt for ${order.channel === 'shopify' ? 'SH' : 'ML'}-${order.externalId}` });
  for (const l of order.lines) queueStockSync(other(order.channel), l.productId, order.id);
  return order;
}

function queueStockSync(channel: Channel, productId: string, orderId: string) {
  const name = getProduct(productId).name;
  enqueue({
    kind: channel === 'shopify' ? 'shopify.inventory' : 'mercadolibre.stock',
    orderId,
    productId,
    label: `${CHANNEL_LABEL[channel]} · stock for ${name}`,
  });
}

// --- Job handlers -----------------------------------------------------------

registerHandler('quickbooks.salesReceipt', async (job) => {
  const order = state.orders.find((o) => o.id === job.orderId);
  if (!order) throw new Error('Order not found');
  const request = quickbooks.salesReceiptRequest(order);
  job.request = request;
  const { entry, duplicate } = await quickbooks.createSalesReceipt(order, request);
  log(
    duplicate ? 'info' : 'ok',
    'quickbooks',
    duplicate
      ? `requestid ${entry.orderKey} already used — QuickBooks returned receipt ${entry.docNumber}, no duplicate created`
      : `SalesReceipt ${entry.docNumber} created · $${entry.total.toFixed(2)} → ${request.body.DepositToAccountRef.name}`,
  );
  return { response: { SalesReceipt: { Id: entry.id, DocNumber: entry.docNumber, TotalAmt: entry.total } } };
});

// Stock jobs read the CURRENT on-hand count when they run and send an absolute number,
// so retries and out-of-order runs always converge on the right value.
registerHandler('shopify.inventory', async (job) => {
  const row = inventoryRow(job.productId!);
  const qty = row.onHand;
  const request = shopify.inventoryRequest(row.productId, qty);
  job.request = request;
  const response = await shopify.setInventory(request);
  row.shopify = { qty, syncedAt: now() };
  log('ok', 'shopify', `${getProduct(row.productId).name}: available set to ${qty}`);
  return { response };
});

registerHandler('mercadolibre.stock', async (job) => {
  const row = inventoryRow(job.productId!);
  const qty = row.onHand;
  const request = mercadolibre.stockRequest(row.productId, qty);
  job.request = request;
  const response = await mercadolibre.updateStock(request);
  row.mercadolibre = { qty, syncedAt: now() };
  log('ok', 'mercadolibre', `${getProduct(row.productId).name} (${getProduct(row.productId).mlItemId}): available_quantity → ${qty}`);
  return { response };
});
