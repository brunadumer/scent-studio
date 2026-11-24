import { motion } from 'framer-motion';

const R = 26;
const C = 2 * Math.PI * R;

/** Circular match score that draws itself in. */
export function MatchRing({ value, size = 64, color }: { value: number; size?: number; color: string }) {
  return (
    <div className="match-ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
        <circle cx="32" cy="32" r={R} className="ring-track" />
        <motion.circle
          cx="32"
          cy="32"
          r={R}
          stroke={color}
          className="ring-value"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C * (1 - value / 100) }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          transform="rotate(-90 32 32)"
        />
      </svg>
      <span>
        {value}
        <small>%</small>
      </span>
    </div>
  );
}
