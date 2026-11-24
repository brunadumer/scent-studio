import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Order, Product } from '../../shared/types';
import { getProduct, products } from '../catalog';
import { now, uid } from '../store';
import { mockCall } from './mock';

// In a real app this comes from the environment (the app's client secret in the Shopify Partner dashboard).
const WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET ?? 'demo_shopify_webhook_secret';
const LOCATION_ID = 'gid://shopify/Location/1';

/** Shopify signs the raw request body: base64(HMAC-SHA256(secret, body)). */
export function sign(rawBody: string | Buffer, secret = WEBHOOK_SECRET): string {
  return createHmac('sha256', secret).update(rawBody).digest('base64');
}

/** Verify against the RAW body (before JSON parsing) with a constant-time compare. */
export function verifyHmac(rawBody: Buffer, header: string | undefined): boolean {
  if (!header) return false;
  const expected = Buffer.from(sign(rawBody));
  const received = Buffer.from(header);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export interface ShopifyOrderWebhook {
  id: number;
  name: string;
  email: string;
  created_at: string;
  currency: string;
  total_price: string;
  customer: { first_name: string; last_name: string };
  line_items: Array<{ id: number; variant_id: string; sku: string; title: string; quantity: number; price: string }>;
}

const customers = [['Ana', 'Ribeiro'], ['Lucas', 'Moreno'], ['Sofia', 'Diaz'], ['Grace', 'Kim'], ['Mateo', 'Silva'], ['Olivia', 'Brooks']];

/** Build an orders/create payload shaped like the one Shopify sends. */
export function buildOrderWebhook(product: Product, qty: number, orderNumber: number): ShopifyOrderWebhook {
  const [first, last] = customers[orderNumber % customers.length];
  return {
    id: 5_800_000_000_000 + orderNumber,
    name: `#${orderNumber}`,
    email: `${first.toLowerCase()}@example.com`,
    created_at: now(),
    currency: 'USD',
    total_price: (product.price * qty).toFixed(2),
    customer: { first_name: first, last_name: last },
    line_items: [
      { id: 13_000_000 + orderNumber, variant_id: product.shopifyVariantId, sku: product.sku, title: product.name, quantity: qty, price: product.price.toFixed(2) },
    ],
  };
}

/** Map Shopify's payload to our channel-agnostic Order. */
export function normalize(payload: ShopifyOrderWebhook): Order {
  const lines = payload.line_items.map((li) => {
    const product = products.find((p) => p.shopifyVariantId === li.variant_id);
    if (!product) throw new Error(`Unknown Shopify variant ${li.variant_id}`);
    return { productId: product.id, sku: li.sku, name: li.title, qty: li.quantity, unitPrice: Number(li.price) };
  });
  return {
    id: uid('ord'),
    channel: 'shopify',
    externalId: payload.name.replace('#', ''),
    customer: `${payload.customer.first_name} ${payload.customer.last_name}`,
    lines,
    total: Number(payload.total_price),
    createdAt: payload.created_at,
    status: 'accepted',
  };
}

/** Admin GraphQL request we would send to set the sellable quantity (absolute value, so retries are safe). */
export function inventoryRequest(productId: string, quantity: number) {
  const product = getProduct(productId);
  return {
    endpoint: 'POST /admin/api/graphql.json',
    query: 'mutation inventorySetQuantities($input: InventorySetQuantitiesInput!) { inventorySetQuantities(input: $input) { userErrors { field message } } }',
    variables: {
      input: {
        name: 'available',
        reason: 'correction',
        quantities: [{ inventoryItemId: product.shopifyInventoryItemId, locationId: LOCATION_ID, quantity }],
      },
    },
  };
}

export async function setInventory(_request: ReturnType<typeof inventoryRequest>) {
  await mockCall('Shopify', [[429, 'Throttled'], [502, 'Bad Gateway']]);
  return { data: { inventorySetQuantities: { userErrors: [] } } };
}
