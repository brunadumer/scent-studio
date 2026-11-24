import type { Order, Product } from '../../shared/types';
import { getProduct, products } from '../catalog';
import { now, state, uid } from '../store';
import { mockCall, sleep } from './mock';

export const SELLER_ID = 1234567890;
export const APPLICATION_ID = 5550001;

export interface MlOrder {
  id: number;
  status: 'paid';
  date_created: string;
  currency_id: string;
  total_amount: number;
  buyer: { id: number; nickname: string };
  order_items: Array<{ item: { id: string; title: string; seller_sku: string }; quantity: number; unit_price: number }>;
}

export interface MlNotification {
  _id: string;
  resource: string;
  user_id: number;
  topic: string;
  application_id: number;
  attempts: number;
  sent: string;
  received: string;
}

// Stands in for Mercado Libre's side: orders live there, we only get a notification pointing at them.
const remoteOrders = new Map<number, MlOrder>();
const buyers = ['COMPRADORA_LUZ', 'JUANP_88', 'MARIANA.GZ', 'TECHBUYER_MX', 'ROSAS_2026'];

export function createMarketplaceSale(product: Product, qty: number): { order: MlOrder; notification: MlNotification } {
  const id = state.nextMlOrder++;
  const order: MlOrder = {
    id,
    status: 'paid',
    date_created: now(),
    currency_id: 'USD',
    total_amount: product.price * qty,
    buyer: { id: 700000 + (id % 1000), nickname: buyers[id % buyers.length] },
    order_items: [{ item: { id: product.mlItemId, title: product.name, seller_sku: product.sku }, quantity: qty, unit_price: product.price }],
  };
  remoteOrders.set(id, order);
  if (remoteOrders.size > 500) remoteOrders.delete(remoteOrders.keys().next().value!);
  const notification: MlNotification = {
    _id: uid('ntf'),
    resource: `/orders/${id}`,
    user_id: SELLER_ID,
    topic: 'orders_v2',
    application_id: APPLICATION_ID,
    attempts: 1,
    sent: now(),
    received: now(),
  };
  return { order, notification };
}

/** Notifications carry no order data: we GET the resource with our own OAuth token, so a forged ping can't inject an order. */
export async function fetchOrder(resource: string): Promise<MlOrder> {
  await sleep(200 + Math.random() * 200);
  const id = Number(resource.split('/').pop());
  const order = remoteOrders.get(id);
  if (!order) throw new Error(`GET ${resource} → 404`);
  return order;
}

export function normalize(ml: MlOrder): Order {
  const lines = ml.order_items.map((oi) => {
    const product = products.find((p) => p.mlItemId === oi.item.id);
    if (!product) throw new Error(`Unknown Mercado Libre item ${oi.item.id}`);
    return { productId: product.id, sku: oi.item.seller_sku, name: oi.item.title, qty: oi.quantity, unitPrice: oi.unit_price };
  });
  return {
    id: uid('ord'),
    channel: 'mercadolibre',
    externalId: String(ml.id),
    customer: ml.buyer.nickname,
    lines,
    total: ml.total_amount,
    createdAt: ml.date_created,
    status: 'accepted',
  };
}

export function stockRequest(productId: string, quantity: number) {
  const product = getProduct(productId);
  return { endpoint: `PUT /items/${product.mlItemId}`, body: { available_quantity: quantity } };
}

export async function updateStock(_request: ReturnType<typeof stockRequest>) {
  await mockCall('Mercado Libre', [[503, 'Service Unavailable'], [429, 'Too Many Requests']]);
  return { status: 200 };
}

export function resetRemote() {
  remoteOrders.clear();
}
