import type { Product } from '../shared/types';

// Fictional houses and products — demo data only.
type Seed = Omit<Product, 'shopifyVariantId' | 'shopifyInventoryItemId' | 'mlItemId' | 'qbItemId'> & { stock: number };

const seeds: Seed[] = [
  {
    id: 'velvet-cedar', sku: 'NOX-VC-50', name: 'Velvet Cedar', house: 'Atelier Nox', line: 'niche',
    format: 'eau-de-parfum', sizeMl: 50, price: 185,
    description: 'Dry cedar wrapped in powdery iris and soft suede.',
    notes: { top: ['pink pepper', 'bergamot'], heart: ['iris', 'violet leaf'], base: ['cedarwood', 'vetiver', 'suede'] },
    families: { woody: 0.9, musky: 0.4, spicy: 0.3, floral: 0.2 }, intensity: 4,
    occasions: ['office', 'evening'], color: ['#9a7656', '#3b2a1e'], stock: 6,
  },
  {
    id: 'neroli-hour', sku: 'VRL-NH-100', name: 'Neroli Hour', house: 'Maison Verel', line: 'designer',
    format: 'eau-de-parfum', sizeMl: 100, price: 128,
    description: 'Sunlit orange blossom with a clean musk finish.',
    notes: { top: ['neroli', 'mandarin', 'petitgrain'], heart: ['orange blossom', 'jasmine'], base: ['white musk'] },
    families: { citrus: 0.9, fresh: 0.6, floral: 0.5, musky: 0.3 }, intensity: 2,
    occasions: ['everyday', 'office', 'summer'], color: ['#f3d9a4', '#e3a352'], stock: 14,
  },
  {
    id: 'noir-praline', sku: 'LMN-NP-90', name: 'Noir Praline', house: 'Casa Lumen', line: 'designer',
    format: 'eau-de-parfum', sizeMl: 90, price: 115,
    description: 'Toasted praline and tonka over dark patchouli.',
    notes: { top: ['bitter orange', 'cardamom'], heart: ['praline', 'tonka bean'], base: ['vanilla', 'benzoin', 'patchouli'] },
    families: { gourmand: 0.95, amber: 0.6, spicy: 0.3, woody: 0.2 }, intensity: 4,
    occasions: ['evening', 'date'], color: ['#7a4430', '#1f1210'], stock: 9,
  },
  {
    id: 'salt-fig', sku: 'ORA-SF-75', name: 'Salt & Fig', house: 'Orris & Ash', line: 'niche',
    format: 'eau-de-parfum', sizeMl: 75, price: 165,
    description: 'Green fig leaf, sea air and sun-bleached driftwood.',
    notes: { top: ['sea salt', 'fig leaf'], heart: ['fig', 'coconut water'], base: ['driftwood', 'ambrette'] },
    families: { fresh: 0.85, woody: 0.4, musky: 0.3, gourmand: 0.2 }, intensity: 2,
    occasions: ['everyday', 'summer'], color: ['#cfe0d6', '#86ab9a'], stock: 3,
  },
  {
    id: 'rose-ashes', sku: 'ORA-RA-75', name: 'Rose Ashes', house: 'Orris & Ash', line: 'niche',
    format: 'eau-de-parfum', sizeMl: 75, price: 172,
    description: 'Dark rose, saffron and smoky incense.',
    notes: { top: ['saffron', 'raspberry'], heart: ['damask rose', 'oud accord'], base: ['incense', 'labdanum'] },
    families: { floral: 0.8, amber: 0.6, spicy: 0.5, woody: 0.5 }, intensity: 5,
    occasions: ['evening', 'date'], color: ['#a3344b', '#3d0f1a'], stock: 2,
  },
  {
    id: 'cotton-halo', sku: 'VRL-CH-50', name: 'Cotton Halo', house: 'Maison Verel', line: 'designer',
    format: 'eau-de-parfum', sizeMl: 50, price: 96,
    description: 'Fresh laundry, pear skin and cashmere musk.',
    notes: { top: ['aldehydes', 'pear'], heart: ['lily of the valley', 'cotton flower'], base: ['musk', 'cashmeran'] },
    families: { musky: 0.9, fresh: 0.5, floral: 0.4 }, intensity: 1,
    occasions: ['everyday', 'office'], color: ['#f1ede6', '#cfc6b8'], stock: 11,
  },
  {
    id: 'amber-dusk', sku: 'LMN-AD-100', name: 'Amber Dusk', house: 'Casa Lumen', line: 'designer',
    format: 'eau-de-parfum', sizeMl: 100, price: 138,
    description: 'Glowing amber, cinnamon and creamy sandalwood.',
    notes: { top: ['bergamot', 'cinnamon'], heart: ['labdanum', 'myrrh'], base: ['amber', 'vanilla', 'sandalwood'] },
    families: { amber: 0.95, spicy: 0.5, gourmand: 0.4, woody: 0.4 }, intensity: 5,
    occasions: ['evening', 'date'], color: ['#cf8a34', '#5e2f0d'], stock: 7,
  },
  {
    id: 'green-atelier', sku: 'NOX-GA-50', name: 'Green Atelier', house: 'Atelier Nox', line: 'niche',
    format: 'eau-de-parfum', sizeMl: 50, price: 178,
    description: 'Crushed tomato leaf, basil and mossy vetiver.',
    notes: { top: ['galbanum', 'basil'], heart: ['tomato leaf', 'violet leaf'], base: ['vetiver', 'oakmoss'] },
    families: { fresh: 0.7, woody: 0.6, citrus: 0.3 }, intensity: 3,
    occasions: ['office', 'everyday'], color: ['#93a86c', '#3e4d2a'], stock: 5,
  },
  {
    id: 'jasmine-noon', sku: 'VRL-JN-100', name: 'Jasmine Noon', house: 'Maison Verel', line: 'designer',
    format: 'eau-de-parfum', sizeMl: 100, price: 132,
    description: 'Radiant jasmine and tuberose on warm sandalwood.',
    notes: { top: ['mandarin'], heart: ['jasmine sambac', 'tuberose'], base: ['sandalwood', 'musk'] },
    families: { floral: 0.95, musky: 0.4, woody: 0.3, citrus: 0.2 }, intensity: 3,
    occasions: ['date', 'everyday', 'evening'], color: ['#f6e7c1', '#d3ab5c'], stock: 8,
  },
  {
    id: 'pistachio-cloud', sku: 'SOL-PC-250', name: 'Pistachio Cloud', house: 'Soleil Club', line: 'designer',
    format: 'body-mist', sizeMl: 250, price: 38,
    description: 'Creamy pistachio, almond and a veil of vanilla.',
    notes: { top: ['pistachio', 'almond'], heart: ['heliotrope'], base: ['vanilla', 'musk'] },
    families: { gourmand: 0.85, musky: 0.5, floral: 0.2 }, intensity: 1,
    occasions: ['everyday', 'summer'], color: ['#dbe6bd', '#a3b977'], stock: 20,
  },
  {
    id: 'citrus-splash', sku: 'SOL-CS-250', name: 'Citrus Splash', house: 'Soleil Club', line: 'designer',
    format: 'body-mist', sizeMl: 250, price: 34,
    description: 'Grapefruit, lime and yuzu with cool mint.',
    notes: { top: ['grapefruit', 'lime', 'yuzu'], heart: ['mint'], base: ['white musk'] },
    families: { citrus: 0.95, fresh: 0.8 }, intensity: 1,
    occasions: ['summer', 'everyday'], color: ['#f7ef9b', '#e6be42'], stock: 18,
  },
  {
    id: 'peony-veil', sku: 'SOL-PV-250', name: 'Peony Veil', house: 'Soleil Club', line: 'designer',
    format: 'body-mist', sizeMl: 250, price: 36,
    description: 'Dewy peony and lychee, soft and bright.',
    notes: { top: ['lychee'], heart: ['peony', 'rose'], base: ['musk'] },
    families: { floral: 0.85, musky: 0.4, fresh: 0.3 }, intensity: 1,
    occasions: ['everyday', 'date', 'summer'], color: ['#f4c7d0', '#de8aa0'], stock: 15,
  },
];

export const products: Product[] = seeds.map(({ stock: _stock, ...p }, i) => ({
  ...p,
  shopifyVariantId: `gid://shopify/ProductVariant/${44100 + i}`,
  shopifyInventoryItemId: `gid://shopify/InventoryItem/${55100 + i}`,
  mlItemId: `MLM${2181400 + i * 7}`,
  qbItemId: String(101 + i),
}));

export const initialStock: Record<string, number> = Object.fromEntries(seeds.map((s) => [s.id, s.stock]));

export class NotFoundError extends Error {}

const byId = new Map(products.map((p) => [p.id, p]));
export function getProduct(id: string): Product {
  const p = byId.get(id);
  if (!p) throw new NotFoundError(`Unknown product ${id}`);
  return p;
}
