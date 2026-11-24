import { motion } from 'framer-motion';
import type { Product } from '../../../shared/types';
import { FORMAT_LABEL } from '../../../shared/types';
import { useTilt } from '../hooks';
import { Bottle } from './Bottle';
import { MatchRing } from './MatchRing';

interface Props {
  product: Product;
  stock: number | undefined;
  onBuy: (p: Product) => void;
  match?: number;
  reasons?: string[];
  index?: number;
}

export function ProductCard({ product: p, stock, onBuy, match, reasons, index = 0 }: Props) {
  const tilt = useTilt<HTMLDivElement>(9);
  const soldOut = stock !== undefined && stock <= 0;

  return (
    <motion.article
      className="card-shell"
      layout
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="card" ref={tilt.ref} onPointerMove={tilt.onPointerMove} onPointerLeave={tilt.onPointerLeave} style={{ ['--tone' as string]: p.color[0] }}>
        <div className="card-glare" aria-hidden="true" />
        <div className="card-visual">
          {match !== undefined && <MatchRing value={match} color={p.color[0]} size={58} />}
          <span className="tag">{p.line}</span>
          <Bottle product={p} height={160} />
        </div>
        <div className="card-body">
          <p className="eyebrow">{p.house}</p>
          <h3 className="card-title">{p.name}</h3>
          <p className="meta">
            {FORMAT_LABEL[p.format]} · {p.sizeMl} ml · intensity <Dots n={p.intensity} />
          </p>
          <p className="desc">{p.description}</p>

          {reasons && reasons.length > 0 && (
            <ul className="reasons">
              {reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}

          <dl className="pyramid">
            <dt>Top</dt>
            <dd>{p.notes.top.join(', ')}</dd>
            <dt>Heart</dt>
            <dd>{p.notes.heart.join(', ')}</dd>
            <dt>Base</dt>
            <dd>{p.notes.base.join(', ')}</dd>
          </dl>

          <div className="card-foot">
            <span className="price">${p.price}</span>
            {stock !== undefined && stock > 0 && stock <= 3 && <span className="low">{stock} left</span>}
            <button className="btn btn-primary btn-small" disabled={soldOut} onClick={() => onBuy(p)}>
              {soldOut ? 'Sold out' : 'Buy now'}
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function Dots({ n }: { n: number }) {
  return (
    <span className="dots" aria-label={`${n} of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <i key={i} className={i < n ? 'on' : ''} />
      ))}
    </span>
  );
}
