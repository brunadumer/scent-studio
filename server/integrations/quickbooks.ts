import type { LedgerEntry, Order } from '../../shared/types';
import { CHANNEL_LABEL } from '../../shared/types';
import { getProduct } from '../catalog';
import { state } from '../store';
import { mockCall } from './mock';

const REALM_ID = '9130350000000000';

// One QuickBooks "customer" and clearing account per sales channel keeps reconciliation simple.
const CHANNEL_REFS = {
  shopify: { customer: { value: '58', name: 'Shopify Sales' }, deposit: { value: '35', name: 'Shopify Clearing' }, prefix: 'SH' },
  mercadolibre: { customer: { value: '59', name: 'Mercado Libre Sales' }, deposit: { value: '36', name: 'Mercado Pago Clearing' }, prefix: 'ML' },
} as const;

export const orderKey = (order: Order) => `${order.channel}:${order.externalId}`;

/** The SalesReceipt we would POST to the QuickBooks Online Accounting API. */
export function salesReceiptRequest(order: Order) {
  const refs = CHANNEL_REFS[order.channel];
  return {
    endpoint: `POST /v3/company/${REALM_ID}/salesreceipt?requestid=${encodeURIComponent(orderKey(order))}`,
    body: {
      DocNumber: `${refs.prefix}-${order.externalId}`.slice(0, 21), // QBO caps DocNumber at 21 chars
      TxnDate: order.createdAt.slice(0, 10),
      CustomerRef: refs.customer,
      DepositToAccountRef: refs.deposit,
      PrivateNote: `Imported from ${CHANNEL_LABEL[order.channel]} order ${order.externalId} (${order.customer})`,
      Line: order.lines.map((l) => ({
        DetailType: 'SalesItemLineDetail',
        Amount: +(l.qty * l.unitPrice).toFixed(2),
        Description: l.name,
        SalesItemLineDetail: { ItemRef: { value: getProduct(l.productId).qbItemId, name: l.sku }, Qty: l.qty, UnitPrice: l.unitPrice },
      })),
    },
  };
}

/**
 * QuickBooks honours ?requestid= for idempotency: replaying the same request returns the
 * original result instead of creating a second receipt. The mock does the same.
 */
export async function createSalesReceipt(order: Order, request: ReturnType<typeof salesReceiptRequest>) {
  await mockCall('QuickBooks', [[429, 'Too Many Requests'], [503, 'Service Unavailable'], [401, 'Token expired (will refresh)']]);
  const key = orderKey(order);
  const existing = state.ledger.find((e) => e.orderKey === key);
  if (existing) return { entry: existing, duplicate: true };

  const entry: LedgerEntry = {
    id: String(1400 + state.ledger.length),
    docNumber: request.body.DocNumber,
    orderKey: key,
    channel: order.channel,
    total: order.total,
    createdAt: new Date().toISOString(),
    payload: request.body,
  };
  state.ledger.unshift(entry);
  return { entry, duplicate: false };
}
