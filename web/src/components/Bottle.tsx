import { useId } from 'react';
import type { Product } from '../../../shared/types';

/** Lightweight SVG bottle for cards (the 3D one is reserved for the big stages). */
export function Bottle({ product, height = 150 }: { product: Product; height?: number }) {
  const id = useId().replace(/:/g, '');
  const [c1, c2] = product.color;
  const initials = product.name.split(/\s|&/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2);
  const mist = product.format === 'body-mist';

  return (
    <svg viewBox="0 0 100 160" height={height} role="img" aria-label={`${product.name} bottle`} className="bottle">
      <defs>
        <linearGradient id={`liq${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c1} />
          <stop offset="1" stopColor={c2} />
        </linearGradient>
        <linearGradient id={`glass${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity=".45" />
          <stop offset=".35" stopColor="#fff" stopOpacity=".06" />
          <stop offset="1" stopColor="#fff" stopOpacity=".3" />
        </linearGradient>
        <linearGradient id={`cap${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3a3a44" />
          <stop offset=".3" stopColor="#0c0c10" />
          <stop offset="1" stopColor="#24242c" />
        </linearGradient>
        <radialGradient id={`glow${id}`}>
          <stop offset="0" stopColor={c1} stopOpacity=".55" />
          <stop offset="1" stopColor={c1} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="150" rx="46" ry="9" fill={`url(#glow${id})`} />
      {mist ? (
        <>
          <rect x="39" y="6" width="22" height="24" rx="4" fill={`url(#cap${id})`} />
          <rect x="30" y="30" width="40" height="122" rx="12" fill={`url(#liq${id})`} />
          <rect x="30" y="30" width="40" height="122" rx="12" fill={`url(#glass${id})`} stroke="rgba(255,255,255,.35)" strokeWidth=".6" />
          <rect x="37" y="80" width="26" height="30" rx="2" fill="#f4f1ea" opacity=".92" />
          <text x="50" y="99" textAnchor="middle" className="bottle-mark">{initials}</text>
        </>
      ) : (
        <>
          <rect x="35" y="5" width="30" height="31" rx="2.5" fill={`url(#cap${id})`} />
          <rect x="43" y="36" width="14" height="9" fill="#d9c7a4" />
          <rect x="16" y="45" width="68" height="107" rx="9" fill="#fff" opacity=".08" stroke="rgba(255,255,255,.4)" strokeWidth=".6" />
          <rect x="21" y="62" width="58" height="85" rx="5" fill={`url(#liq${id})`} />
          <rect x="16" y="45" width="68" height="107" rx="9" fill={`url(#glass${id})`} />
          <rect x="32" y="88" width="36" height="26" rx="1" fill="#f4f1ea" opacity=".92" />
          <text x="50" y="106" textAnchor="middle" className="bottle-mark">{initials}</text>
        </>
      )}
    </svg>
  );
}
