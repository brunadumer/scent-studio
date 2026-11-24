import { EventEmitter } from 'node:events';
import type { InventoryRow, Job, LedgerEntry, LogEvent, OpsSnapshot, Order } from '../shared/types';
import { initialStock, products } from './catalog';

// In-memory store keeps the demo dependency-free.
// In production: Postgres, with a UNIQUE (channel, external_id) constraint on orders for idempotency.
export const state = {
  inventory: new Map<string, InventoryRow>(),
  orders: [] as Order[],
  jobs: [] as Job[],
  ledger: [] as LedgerEntry[],
  events: [] as LogEvent[],
  chaos: false,
  nextShopifyOrder: 1001,
  nextMlOrder: 2000009812400,
};

export const bus = new EventEmitter();
bus.setMaxListeners(100);

let seq = 0;
export const uid = (prefix: string) => `${prefix}_${Date.now().toString(36)}${(seq++).toString(36)}`;
export const now = () => new Date().toISOString();

let pending: NodeJS.Timeout | null = null;
/** Coalesce bursts of changes into one push to the dashboards. */
export function changed() {
  if (pending) return;
  pending = setTimeout(() => {
    pending = null;
    bus.emit('change');
  }, 40);
}

export function log(level: LogEvent['level'], source: LogEvent['source'], message: string) {
  state.events.unshift({ id: uid('evt'), at: now(), level, source, message });
  if (state.events.length > 200) state.events.length = 200;
  changed();
}

export function inventoryRow(productId: string): InventoryRow {
  const row = state.inventory.get(productId);
  if (!row) throw new Error(`No inventory for ${productId}`);
  return row;
}

export function resetState() {
  state.inventory.clear();
  for (const p of products) {
    const qty = initialStock[p.id] ?? 0;
    const syncedAt = now();
    state.inventory.set(p.id, {
      productId: p.id,
      onHand: qty,
      shopify: { qty, syncedAt },
      mercadolibre: { qty, syncedAt },
    });
  }
  state.orders = [];
  state.jobs = [];
  state.ledger = [];
  state.events = [];
  state.chaos = false;
  state.nextShopifyOrder = 1001;
  log('info', 'inventory', `Catalog loaded: ${products.length} products, stock in sync on Shopify and Mercado Libre`);
}

export function snapshot(): OpsSnapshot {
  return {
    inventory: [...state.inventory.values()],
    orders: state.orders.slice(0, 40),
    jobs: state.jobs.slice(0, 60),
    ledger: state.ledger.slice(0, 40),
    events: state.events.slice(0, 120),
    chaos: state.chaos,
  };
}
