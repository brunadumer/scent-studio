import type { Family, Product, QuizAnswers, Recommendation } from '../shared/types';
import { FAMILY_INFO, INTENSITY_INFO, OCCASION_INFO } from '../shared/types';

const INTENSITY_TARGET = { soft: 1.5, balanced: 3, statement: 4.5 } as const;

// Weights are explicit so the score is explainable: every match comes with reasons.
const W = { love: 0.55, occasion: 0.2, intensity: 0.25, avoid: 0.6 };

export function recommend(answers: QuizAnswers, catalog: Product[], limit = 3): Recommendation[] {
  const target = INTENSITY_TARGET[answers.intensity];

  return catalog
    .filter((p) => answers.format === 'any' || p.format === answers.format)
    .map((p) => {
      const w = (f: Family) => p.families[f] ?? 0;
      const reasons: string[] = [];

      // 1. Affinity with the families the shopper loves (neutral 0.5 if none picked)
      const loveHits = answers.loves.map((f) => ({ f, w: w(f) })).sort((a, b) => b.w - a.w);
      const love = answers.loves.length ? loveHits.reduce((s, h) => s + h.w, 0) / answers.loves.length : 0.5;
      for (const h of loveHits) if (h.w >= 0.5) reasons.push(`${FAMILY_INFO[h.f].label} at its heart`);

      // 2. Penalise families they want to avoid
      const avoid = answers.avoid.length ? Math.max(...answers.avoid.map(w)) : 0;
      if (answers.avoid.length && avoid === 0) {
        reasons.push(`No ${answers.avoid.map((f) => FAMILY_INFO[f].label.toLowerCase()).join(' or ')} notes`);
      }

      // 3. Occasion + projection
      const occasion = p.occasions.includes(answers.occasion) ? 1 : 0;
      if (occasion) reasons.push(`Made for ${OCCASION_INFO[answers.occasion].label.toLowerCase()}`);
      const intensity = 1 - Math.abs(p.intensity - target) / 4;
      if (intensity >= 0.85) reasons.push(`${INTENSITY_INFO[answers.intensity].label} projection, as you asked`);

      const score = love * W.love + occasion * W.occasion + intensity * W.intensity - avoid * W.avoid;
      return { productId: p.id, match: Math.round(Math.max(0, Math.min(1, score)) * 100), reasons, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score: _score, ...r }) => r);
}
