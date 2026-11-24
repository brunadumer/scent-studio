// Types shared by the Node API and the React app — one source of truth end to end.

export type Family = 'woody' | 'floral' | 'citrus' | 'fresh' | 'gourmand' | 'amber' | 'musky' | 'spicy';
export type Occasion = 'everyday' | 'office' | 'evening' | 'date' | 'summer';
export type Format = 'eau-de-parfum' | 'body-mist';
export type Intensity = 'soft' | 'balanced' | 'statement';
export type Channel = 'shopify' | 'mercadolibre';

export interface Product {
  id: string;
  sku: string;
  name: string;
  house: string;
  line: 'designer' | 'niche';
  format: Format;
  sizeMl: number;
  price: number;
  description: string;
  notes: { top: string[]; heart: string[]; base: string[] };
  /** How strongly each olfactive family shows up, 0..1 */
  families: Partial<Record<Family, number>>;
  /** Projection / sillage, 1 (skin scent) .. 5 (fills the room) */
  intensity: 1 | 2 | 3 | 4 | 5;
  occasions: Occasion[];
  /** Liquid gradient for the bottle illustration */
  color: [string, string];
  /** External ids on each platform */
  shopifyVariantId: string;
  shopifyInventoryItemId: string;
  mlItemId: string;
  qbItemId: string;
}

export interface QuizAnswers {
  loves: Family[];
  avoid: Family[];
  occasion: Occasion;
  intensity: Intensity;
  format: Format | 'any';
}

export interface Recommendation {
  productId: string;
  match: number; // 0..100
  reasons: string[];
}

export interface ChannelStock {
  qty: number;
  syncedAt: string | null;
}

export interface InventoryRow {
  productId: string;
  /** Source of truth: our own warehouse count */
  onHand: number;
  /** What each sales channel currently believes it can sell */
  shopify: ChannelStock;
  mercadolibre: ChannelStock;
}

export interface OrderLine {
  productId: string;
  sku: string;
  name: string;
  qty: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  channel: Channel;
  externalId: string;
  customer: string;
  lines: OrderLine[];
  total: number;
  createdAt: string;
  status: 'accepted' | 'flagged';
  flagReason?: string;
}

export type JobKind = 'quickbooks.salesReceipt' | 'shopify.inventory' | 'mercadolibre.stock';

export interface Job {
  id: string;
  kind: JobKind;
  orderId: string;
  productId?: string;
  label: string;
  status: 'queued' | 'running' | 'retrying' | 'done' | 'dead';
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  nextRunAt?: string;
  request?: unknown;
  response?: unknown;
  updatedAt: string;
}

export interface LedgerEntry {
  id: string;
  docNumber: string;
  orderKey: string;
  channel: Channel;
  total: number;
  createdAt: string;
  payload: unknown;
}

export type EventSource = 'shopify' | 'mercadolibre' | 'quickbooks' | 'inventory' | 'queue' | 'security';

export interface LogEvent {
  id: string;
  at: string;
  level: 'info' | 'ok' | 'warn' | 'error';
  source: EventSource;
  message: string;
}

export interface OpsSnapshot {
  inventory: InventoryRow[];
  orders: Order[];
  jobs: Job[];
  ledger: LedgerEntry[];
  events: LogEvent[];
  chaos: boolean;
}

export const FAMILY_INFO: Record<Family, { label: string; hint: string }> = {
  woody: { label: 'Woody', hint: 'cedar, sandalwood, vetiver' },
  floral: { label: 'Floral', hint: 'rose, jasmine, peony' },
  citrus: { label: 'Citrus', hint: 'bergamot, neroli, grapefruit' },
  fresh: { label: 'Fresh', hint: 'sea salt, green leaves, clean air' },
  gourmand: { label: 'Gourmand', hint: 'vanilla, praline, pistachio' },
  amber: { label: 'Amber', hint: 'warm resins, labdanum, myrrh' },
  musky: { label: 'Musky', hint: 'clean skin, cotton, cashmere' },
  spicy: { label: 'Spicy', hint: 'pink pepper, saffron, cardamom' },
};

export const OCCASION_INFO: Record<Occasion, { label: string; hint: string }> = {
  everyday: { label: 'Everyday', hint: 'easy, any time' },
  office: { label: 'Office', hint: 'polished, not loud' },
  evening: { label: 'Evening out', hint: 'dinners, events' },
  date: { label: 'Date night', hint: 'close and memorable' },
  summer: { label: 'Hot days', hint: 'beach, travel, heat' },
};

export const INTENSITY_INFO: Record<Intensity, { label: string; hint: string }> = {
  soft: { label: 'Soft', hint: 'a skin scent, only up close' },
  balanced: { label: 'Balanced', hint: 'noticed, never overpowering' },
  statement: { label: 'Statement', hint: 'lingers when you leave the room' },
};

export const FORMAT_LABEL: Record<Format, string> = {
  'eau-de-parfum': 'Eau de Parfum',
  'body-mist': 'Body Mist',
};

export const CHANNEL_LABEL: Record<Channel, string> = {
  shopify: 'Shopify',
  mercadolibre: 'Mercado Libre',
};
