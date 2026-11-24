import { motion } from 'framer-motion';
import { useState, type ReactNode } from 'react';
import type { Family, Format, Intensity, Occasion, Product, QuizAnswers, Recommendation } from '../../../shared/types';
import { FAMILY_INFO, FORMAT_LABEL, INTENSITY_INFO, OCCASION_INFO } from '../../../shared/types';
import { api } from '../api';
import { ProductCard } from '../components/ProductCard';
import { Stage } from '../components/Stage';
import { DEFAULT_SCENT, FAMILY_COLOR, mixColors } from '../scent';

type Option<T extends string> = { value: T; label: string; hint: string; color?: string };
const families: Option<Family>[] = Object.entries(FAMILY_INFO).map(([value, i]) => ({ value: value as Family, ...i, color: FAMILY_COLOR[value as Family] }));
const occasions = Object.entries(OCCASION_INFO).map(([value, i]) => ({ value: value as Occasion, ...i }));
const intensities = Object.entries(INTENSITY_INFO).map(([value, i]) => ({ value: value as Intensity, ...i }));
const formats: Option<Format | 'any'>[] = [
  { value: 'eau-de-parfum', label: FORMAT_LABEL['eau-de-parfum'], hint: 'long-lasting, a few sprays' },
  { value: 'body-mist', label: FORMAT_LABEL['body-mist'], hint: 'light, layer it all day' },
  { value: 'any', label: 'Show me both', hint: 'I’m open' },
];

const empty: QuizAnswers = { loves: [], avoid: [], occasion: 'everyday', intensity: 'balanced', format: 'any' };
const STEPS = 5;
const ease = [0.22, 1, 0.36, 1] as const;

interface Props {
  products: Product[];
  stockOf: (id: string) => number | undefined;
  onBuy: (p: Product) => void;
}

export function Finder({ products, stockOf, onBuy }: Props) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [answers, setAnswers] = useState<QuizAnswers>(empty);
  const [results, setResults] = useState<Recommendation[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goTo = (n: number) => {
    setDir(n > step ? 1 : -1);
    setStep(n);
  };
  const set = <K extends keyof QuizAnswers>(key: K, value: QuizAnswers[K]) => setAnswers((a) => ({ ...a, [key]: value }));

  const toggle = (key: 'loves' | 'avoid', f: Family, max: number) => {
    const list = answers[key];
    if (list.includes(f)) set(key, list.filter((x) => x !== f));
    else if (list.length < max) set(key, [...list, f]);
  };

  const finish = async (final: QuizAnswers) => {
    setLoading(true);
    setError(null);
    try {
      setResults(await api.recommend(final));
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const pick = <K extends 'occasion' | 'intensity' | 'format'>(key: K, value: QuizAnswers[K]) => {
    const next = { ...answers, [key]: value };
    setAnswers(next);
    if (step === STEPS - 1) void finish(next);
    else goTo(step + 1);
  };

  const restart = () => {
    setAnswers(empty);
    setResults(null);
    setDir(-1);
    setStep(0);
  };

  // The liquid shows the shopper's blend as they answer
  const blend = mixColors(answers.loves.map((f) => FAMILY_COLOR[f]), DEFAULT_SCENT);

  if (results) {
    const byId = new Map(products.map((p) => [p.id, p]));
    const top = results[0] && byId.get(results[0].productId);
    return (
      <section className="finder finder-results">
        <div className="results-hero">
          {top && (
            <Stage color={top.color[0]} mist={top.format === 'body-mist'} className="results-stage">
              <div className="hud hud-family">
                <span className="hud-label">Top match</span>
                <strong>{top.name}</strong>
                <span className="hud-sub">{results[0].match}% match</span>
              </div>
            </Stage>
          )}
          <motion.div className="results-copy" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease }}>
            <p className="eyebrow">Your scent profile</p>
            <h2 className="display">
              {answers.loves.length ? answers.loves.map((f) => FAMILY_INFO[f].label).join(' & ') : 'Open to anything'}
            </h2>
            <p className="muted">
              {INTENSITY_INFO[answers.intensity].label} projection · for {OCCASION_INFO[answers.occasion].label.toLowerCase()}
              {answers.avoid.length ? ` · no ${answers.avoid.map((f) => FAMILY_INFO[f].label.toLowerCase()).join(', ')}` : ''}
            </p>
            <div className="blend-chips">
              {answers.loves.map((f) => (
                <span key={f} className="blend-chip" style={{ ['--c' as string]: FAMILY_COLOR[f] }}>
                  {FAMILY_INFO[f].label}
                </span>
              ))}
            </div>
            <button className="btn btn-glass" onClick={restart}>
              ↺ Retake the quiz
            </button>
          </motion.div>
        </div>

        <div className="results">
          {results.map((r, i) => {
            const p = byId.get(r.productId);
            return p ? <ProductCard key={p.id} product={p} stock={stockOf(p.id)} onBuy={onBuy} match={r.match} reasons={r.reasons} index={i + 2} /> : null;
          })}
        </div>
      </section>
    );
  }

  return (
    <section className="finder">
      <div className="finder-grid">
        <Stage color={blend} mist={answers.format === 'body-mist'} className="finder-stage">
          <div className="hud hud-family">
            <span className="hud-label">Your blend</span>
            {answers.loves.length ? (
              <div className="blend-chips">
                {answers.loves.map((f) => (
                  <span key={f} className="blend-chip" style={{ ['--c' as string]: FAMILY_COLOR[f] }}>
                    {FAMILY_INFO[f].label}
                  </span>
                ))}
              </div>
            ) : (
              <span className="hud-sub">Pick families — the liquid mixes live</span>
            )}
          </div>
        </Stage>

        <div className="quiz">
          <div className="progress" aria-label={`Step ${step + 1} of ${STEPS}`}>
            <span className="progress-count">
              0{step + 1} <small>/ 0{STEPS}</small>
            </span>
            <div className="progress-bar">
              <motion.span animate={{ width: `${((step + 1) / STEPS) * 100}%` }} transition={{ duration: 0.5, ease }} />
            </div>
          </div>

          {/* Enter-only: the next question slides in from the direction you're moving */}
          <motion.div
              key={step}
              initial={{ opacity: 0, x: dir * 40, filter: 'blur(8px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.4, ease }}
            >
              {step === 0 && (
                <Question title="Which scents pull you in?" hint="Pick up to two.">
                  <Choices options={families} selected={answers.loves} onPick={(f) => toggle('loves', f, 2)} />
                  <Nav onNext={() => goTo(1)} nextLabel={answers.loves.length ? 'Continue' : 'Skip'} />
                </Question>
              )}
              {step === 1 && (
                <Question title="Anything you’d rather avoid?" hint="Optional — skip if you’re open to everything.">
                  <Choices options={families.filter((f) => !answers.loves.includes(f.value))} selected={answers.avoid} onPick={(f) => toggle('avoid', f, 3)} />
                  <Nav onBack={() => goTo(0)} onNext={() => goTo(2)} nextLabel={answers.avoid.length ? 'Continue' : 'Skip'} />
                </Question>
              )}
              {step === 2 && (
                <Question title="When will you wear it most?">
                  <Choices options={occasions} selected={[answers.occasion]} onPick={(o) => pick('occasion', o)} />
                  <Nav onBack={() => goTo(1)} />
                </Question>
              )}
              {step === 3 && (
                <Question title="How noticeable should it be?">
                  <Choices options={intensities} selected={[answers.intensity]} onPick={(v) => pick('intensity', v)} />
                  <Nav onBack={() => goTo(2)} />
                </Question>
              )}
              {step === 4 && (
                <Question title="Which format do you prefer?">
                  <Choices options={formats} selected={[answers.format]} onPick={(v) => pick('format', v)} />
                  <Nav onBack={() => goTo(3)} />
                  {loading && <p className="muted scanning">Analysing your profile…</p>}
                  {error && <p className="error">{error}</p>}
                </Question>
              )}
            </motion.div>
        </div>
      </div>
    </section>
  );
}

function Question({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="question">
      <h2 className="display">{title}</h2>
      {hint && <p className="muted">{hint}</p>}
      {children}
    </div>
  );
}

function Choices<T extends string>({ options, selected, onPick }: { options: Option<T>[]; selected: T[]; onPick: (v: T) => void }) {
  return (
    <div className="choices">
      {options.map((o) => {
        const on = selected.includes(o.value);
        return (
          <motion.button
            key={o.value}
            whileTap={{ scale: 0.97 }}
            className={`choice${on ? ' is-on' : ''}`}
            aria-pressed={on}
            style={o.color ? { ['--c' as string]: o.color } : undefined}
            onClick={() => onPick(o.value)}
          >
            {o.color && <i className="choice-dot" />}
            <strong>{o.label}</strong>
            <span>{o.hint}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

function Nav({ onBack, onNext, nextLabel }: { onBack?: () => void; onNext?: () => void; nextLabel?: string }) {
  return (
    <div className="quiz-nav">
      {onBack ? (
        <button className="btn btn-glass" onClick={onBack}>
          ← Back
        </button>
      ) : (
        <span />
      )}
      {onNext && (
        <button className="btn btn-primary" onClick={onNext}>
          {nextLabel} <span aria-hidden="true">→</span>
        </button>
      )}
    </div>
  );
}
