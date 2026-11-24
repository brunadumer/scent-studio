import type { Family } from '../../shared/types';

/** Each olfactive family gets a light colour; picks in the quiz blend into the bottle's liquid. */
export const FAMILY_COLOR: Record<Family, string> = {
  woody: '#c08a5b',
  floral: '#ff8fbf',
  citrus: '#ffd45e',
  fresh: '#5ff0dc',
  gourmand: '#e6a86a',
  amber: '#ff9a3d',
  musky: '#c9c2ff',
  spicy: '#ff5a5f',
};

export const DEFAULT_SCENT = '#9d8cff';

/** Average a set of hex colours (simple RGB mix is enough for a liquid tint). */
export function mixColors(colors: string[], fallback = DEFAULT_SCENT): string {
  if (!colors.length) return fallback;
  const rgb = colors.map((c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)));
  const avg = [0, 1, 2].map((k) => Math.round(rgb.reduce((s, c) => s + c[k], 0) / rgb.length));
  return `#${avg.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export function supportsWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
