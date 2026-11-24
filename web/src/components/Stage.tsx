import { lazy, Suspense, useMemo, type ReactNode } from 'react';
import { supportsWebGL } from '../scent';

// Code-split: three.js only downloads when a 3D stage is actually on screen.
const Bottle3D = lazy(() => import('./Bottle3D'));

interface Props {
  color: string;
  mist?: boolean;
  className?: string;
  children?: ReactNode;
}

/** A coloured aura plus the 3D bottle, with a CSS-only fallback when WebGL is unavailable. */
export function Stage({ color, mist, className = '', children }: Props) {
  const webgl = useMemo(supportsWebGL, []);
  return (
    <div className={`stage ${className}`} style={{ ['--scent' as string]: color }}>
      <div className="aura" aria-hidden="true" />
      <div className="orbit" aria-hidden="true" />
      {webgl ? (
        <Suspense fallback={<FallbackBottle />}>
          <Bottle3D color={color} mist={mist} />
        </Suspense>
      ) : (
        <FallbackBottle />
      )}
      {children}
    </div>
  );
}

function FallbackBottle() {
  return (
    <div className="fallback-bottle" aria-hidden="true">
      <span className="fb-cap" />
      <span className="fb-body" />
    </div>
  );
}
