import { motion } from 'framer-motion';
import { useMemo, useState, type ReactNode } from 'react';
import type { Family, Format, Product } from '../../../shared/types';
import { FAMILY_INFO, FORMAT_LABEL } from '../../../shared/types';
import { ProductCard } from '../components/ProductCard';
import { FAMILY_COLOR } from '../scent';

interface Props {
  products: Product[];
  stockOf: (id: string) => number | undefined;
  onBuy: (p: Product) => void;
}

export function Shop({ products, stockOf, onBuy }: Props) {
  const [family, setFamily] = useState<Family | null>(null);
  const [format, setFormat] = useState<Format | null>(null);

  // Families are data on each product (in Shopify: a metafield), so filtering is just a lookup.
  const visible = useMemo(
    () =>
      products
        .filter((p) => !format || p.format === format)
        .filter((p) => !family || (p.families[family] ?? 0) >= 0.5)
        .sort((a, b) => (family ? (b.families[family] ?? 0) - (a.families[family] ?? 0) : 0)),
    [products, family, format],
  );

  return (
    <section className="shop" style={{ ['--fam' as string]: family ? FAMILY_COLOR[family] : 'var(--violet)' }}>
      <header className="section-head">
        <p className="eyebrow">The collection · {visible.length} scents</p>
        <h2 className="display">
          Shop by scent, <span className="grad-text">not by guesswork.</span>
        </h2>
      </header>

      <div className="filters">
        <div className="segmented" role="group" aria-label="Scent family">
          <Seg on={!family} onClick={() => setFamily(null)} group="fam">
            All
          </Seg>
          {(Object.keys(FAMILY_INFO) as Family[]).map((f) => (
            <Seg key={f} on={family === f} onClick={() => setFamily(family === f ? null : f)} group="fam" color={FAMILY_COLOR[f]}>
              {FAMILY_INFO[f].label}
            </Seg>
          ))}
        </div>
        <div className="segmented" role="group" aria-label="Format">
          {(Object.keys(FORMAT_LABEL) as Format[]).map((f) => (
            <Seg key={f} on={format === f} onClick={() => setFormat(format === f ? null : f)} group="fmt">
              {FORMAT_LABEL[f]}
            </Seg>
          ))}
        </div>
      </div>

      {/* Cards that stay glide to their new spot (layout animation); filtered-out ones leave instantly */}
      <div className="grid">
        {visible.map((p, i) => (
          <ProductCard key={p.id} product={p} stock={stockOf(p.id)} onBuy={onBuy} index={i % 6} />
        ))}
      </div>
      {!visible.length && <p className="muted center">Nothing in that combination yet.</p>}
    </section>
  );
}

/** Filter button with a sliding highlight shared across the group (framer-motion layoutId). */
function Seg({ on, onClick, group, color, children }: { on: boolean; onClick: () => void; group: string; color?: string; children: ReactNode }) {
  return (
    <button className={`seg${on ? ' is-on' : ''}`} aria-pressed={on} onClick={onClick}>
      {on && <motion.span layoutId={`seg-${group}`} className="seg-bg" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
      {color && <i style={{ background: color }} />}
      <span>{children}</span>
    </button>
  );
}
