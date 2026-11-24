import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import type { Family, OpsSnapshot, Product } from '../../../shared/types';
import { FAMILY_INFO } from '../../../shared/types';
import { ProductCard } from '../components/ProductCard';
import { Stage } from '../components/Stage';
import { useCountUp, useCycle } from '../hooks';
import { FAMILY_COLOR } from '../scent';

interface Props {
  products: Product[];
  snapshot: OpsSnapshot | null;
  stockOf: (id: string) => number | undefined;
  onBuy: (p: Product) => void;
  go: (tab: 'finder' | 'shop' | 'ops') => void;
}

const families = Object.keys(FAMILY_INFO) as Family[];
const ease = [0.22, 1, 0.36, 1] as const;

const reveal = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.8, ease },
};

export function Home({ products, snapshot, stockOf, onBuy, go }: Props) {
  const heroFamily = useCycle(families, 2600);
  const [picked, setPicked] = useState<Family>('woody');

  const notes = useMemo(() => {
    const all = products.flatMap((p) => [...p.notes.top, ...p.notes.heart, ...p.notes.base]);
    return [...new Set(all)];
  }, [products]);

  const matches = useMemo(
    () =>
      products
        .filter((p) => (p.families[picked] ?? 0) >= 0.3)
        .sort((a, b) => (b.families[picked] ?? 0) - (a.families[picked] ?? 0))
        .slice(0, 5),
    [products, picked],
  );

  const featured = useMemo(() => ['velvet-cedar', 'rose-ashes', 'neroli-hour', 'pistachio-cloud'].map((id) => products.find((p) => p.id === id)).filter(Boolean) as Product[], [products]);

  return (
    <div className="home">
      {/* ---------- Hero ---------- */}
      <section className="hero">
        <div className="hero-copy">
          <motion.p className="eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            <span className="pulse-dot" /> Fragrance, engineered
          </motion.p>
          <h1 className="display hero-title">
            {['Scent,', 'decoded.'].map((w, i) => (
              <span className="word-mask" key={w}>
                <motion.span className={i === 1 ? 'grad-text' : ''} initial={{ y: '110%' }} animate={{ y: 0 }} transition={{ duration: 1, delay: 0.15 + i * 0.12, ease }}>
                  {w}
                </motion.span>
              </span>
            ))}
          </h1>
          <motion.p className="lede" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.8, ease }}>
            Designer and niche perfumes, matched to you in five questions. No sampling, no guesswork.
          </motion.p>
          <motion.div className="hero-cta" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65, duration: 0.8, ease }}>
            <button className="btn btn-primary" onClick={() => go('finder')}>
              Find your scent <span aria-hidden="true">→</span>
            </button>
            <button className="btn btn-glass" onClick={() => go('shop')}>
              Explore the collection
            </button>
          </motion.div>
        </div>

        <Stage color={FAMILY_COLOR[heroFamily]} className="hero-stage">
          <AnimatePresence mode="wait">
            <motion.div
              key={heroFamily}
              className="hud hud-family"
              initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(6px)' }}
              transition={{ duration: 0.4 }}
            >
              <span className="hud-label">Now rendering</span>
              <strong>
                <i style={{ background: FAMILY_COLOR[heroFamily] }} /> {FAMILY_INFO[heroFamily].label}
              </strong>
              <span className="hud-sub">{FAMILY_INFO[heroFamily].hint}</span>
            </motion.div>
          </AnimatePresence>
          <div className="hud hud-hint">Move your cursor — the bottle follows</div>
        </Stage>

        <div className="scroll-hint" aria-hidden="true">
          <span />
        </div>
      </section>

      {/* ---------- Notes marquee ---------- */}
      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {[...notes, ...notes].map((n, i) => (
            <span key={i}>{n}</span>
          ))}
        </div>
      </div>

      {/* ---------- Family explorer ---------- */}
      <motion.section className="explorer" style={{ ['--fam' as string]: FAMILY_COLOR[picked] }} {...reveal}>
        <div className="explorer-head">
          <p className="eyebrow">Interactive</p>
          <h2 className="display">Explore by scent family</h2>
          <p className="muted">Pick a family. The collection re-ranks itself by how strongly each perfume carries it.</p>
        </div>

        <div className="explorer-grid">
          <div className="family-pad" role="radiogroup" aria-label="Scent family">
            {families.map((f) => (
              <button
                key={f}
                role="radio"
                aria-checked={picked === f}
                className={`family-key${picked === f ? ' is-on' : ''}`}
                style={{ ['--c' as string]: FAMILY_COLOR[f] }}
                onClick={() => setPicked(f)}
                onMouseEnter={() => setPicked(f)}
              >
                {picked === f && <motion.span layoutId="family-glow" className="family-glow" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                <i />
                <strong>{FAMILY_INFO[f].label}</strong>
                <span>{FAMILY_INFO[f].hint}</span>
              </button>
            ))}
          </div>

          <div className="family-readout">
            <AnimatePresence mode="wait">
              <motion.h3 key={picked} className="display readout-title" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                {FAMILY_INFO[picked].label}
              </motion.h3>
            </AnimatePresence>
            <ul className="readout-list">
              <AnimatePresence initial={false}>
                {matches.map((p) => {
                  const w = p.families[picked] ?? 0;
                  return (
                    <motion.li key={p.id} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.35, ease }}>
                      <span className="swatch" style={{ background: `linear-gradient(135deg, ${p.color[0]}, ${p.color[1]})` }} />
                      <span className="readout-name">
                        {p.name}
                        <small>{p.house}</small>
                      </span>
                      <span className="bar">
                        <motion.span initial={false} animate={{ width: `${w * 100}%` }} transition={{ duration: 0.6, ease }} />
                      </span>
                      <span className="pct">{Math.round(w * 100)}</span>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          </div>
        </div>
      </motion.section>

      {/* ---------- Featured ---------- */}
      <motion.section className="featured" {...reveal}>
        <div className="row-head">
          <div>
            <p className="eyebrow">Most wanted</p>
            <h2 className="display">This week’s icons</h2>
          </div>
          <button className="btn btn-glass" onClick={() => go('shop')}>
            View all <span aria-hidden="true">→</span>
          </button>
        </div>
        <div className="rail">
          {featured.map((p, i) => (
            <ProductCard key={p.id} product={p} stock={stockOf(p.id)} onBuy={onBuy} index={i} />
          ))}
        </div>
      </motion.section>

      {/* ---------- Live ops teaser ---------- */}
      <motion.section className="infra" {...reveal}>
        <div className="infra-copy">
          <p className="eyebrow">
            <span className="pulse-dot" /> Live behind the glass
          </p>
          <h2 className="display">One inventory. Every channel. Books that keep themselves.</h2>
          <p className="muted">
            Every sale on Shopify and Mercado Libre lands in one stock count, books itself in QuickBooks and updates the other channel. Failures retry on their own.
          </p>
          <button className="btn btn-primary" onClick={() => go('ops')}>
            Open operations <span aria-hidden="true">→</span>
          </button>
        </div>
        <LiveStats snapshot={snapshot} />
      </motion.section>

      {/* ---------- Closing CTA ---------- */}
      <motion.section className="closer" {...reveal}>
        <h2 className="display">
          Your signature scent is <span className="grad-text">five questions</span> away.
        </h2>
        <button className="btn btn-primary btn-big" onClick={() => go('finder')}>
          Start the finder <span aria-hidden="true">→</span>
        </button>
      </motion.section>
    </div>
  );
}

function LiveStats({ snapshot }: { snapshot: OpsSnapshot | null }) {
  const accepted = snapshot?.orders.filter((o) => o.status === 'accepted') ?? [];
  const revenue = useCountUp(accepted.reduce((s, o) => s + o.total, 0));
  const orders = useCountUp(accepted.length);
  const receipts = useCountUp(snapshot?.ledger.length ?? 0);
  const inv = snapshot?.inventory ?? [];
  const synced = inv.filter((r) => r.shopify.qty === r.onHand && r.mercadolibre.qty === r.onHand).length;

  return (
    <div className="infra-stats">
      <Stat label="Orders synced" value={Math.round(orders).toString()} />
      <Stat label="Revenue" value={`$${Math.round(revenue).toLocaleString('en-US')}`} />
      <Stat label="QuickBooks receipts" value={Math.round(receipts).toString()} />
      <Stat label="Channels in sync" value={`${synced}/${inv.length || 12}`} accent={synced === inv.length} />
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`stat${accent ? ' is-ok' : ''}`}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}
