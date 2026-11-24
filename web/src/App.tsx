import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Product } from '../../shared/types';
import { api, useOpsStream, useProducts } from './api';
import { Finder } from './pages/Finder';
import { Home } from './pages/Home';
import { Ops } from './pages/Ops';
import { Shop } from './pages/Shop';

type Tab = 'home' | 'finder' | 'shop' | 'ops';
const TABS: { id: Tab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'finder', label: 'Finder' },
  { id: 'shop', label: 'Shop' },
  { id: 'ops', label: 'Operations' },
];

const readHash = (): Tab => {
  const h = window.location.hash.replace('#', '');
  return TABS.some((t) => t.id === h) ? (h as Tab) : 'home';
};

export function App() {
  const [tab, setTab] = useState<Tab>(readHash);
  const products = useProducts();
  const { snapshot, connected } = useOpsStream();
  const [toast, setToast] = useState<{ msg: string; action?: boolean } | null>(null);
  const timer = useRef<number>();

  useEffect(() => {
    const onHash = () => {
      setTab(readHash());
      window.scrollTo({ top: 0, behavior: 'instant' });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Cursor-following light, written straight to CSS variables (no React re-renders).
  useEffect(() => {
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        document.documentElement.style.setProperty('--mx', `${e.clientX}px`);
        document.documentElement.style.setProperty('--my', `${e.clientY}px`);
      });
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  const go = (t: Tab) => {
    window.location.hash = t;
  };

  const notify = useCallback((msg: string, action = false) => {
    setToast({ msg, action });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 4500);
  }, []);

  const stockOf = (id: string) => snapshot?.inventory.find((r) => r.productId === id)?.shopify.qty;

  const buy = async (p: Product) => {
    try {
      const r = await api.buyOnShopify(p.id);
      notify(`Order ${r.orderName} placed — ${p.name}. Watch it sync live.`, true);
    } catch (e) {
      notify((e as Error).message);
    }
  };

  const orders = snapshot?.orders.length ?? 0;

  return (
    <MotionConfig reducedMotion="user">
      <div className="bg" aria-hidden="true">
        <div className="bg-grid" />
        <div className="bg-blob b1" />
        <div className="bg-blob b2" />
        <div className="cursor-light" />
      </div>

      <header className="topbar">
        <a className="brand" href="#home">
          <span className="brand-mark" aria-hidden="true" />
          Scent<em>Studio</em>
        </a>
        <nav className="tabs" aria-label="Sections">
          {TABS.map((t) => (
            <a key={t.id} href={`#${t.id}`} className={tab === t.id ? 'is-on' : ''} aria-current={tab === t.id ? 'page' : undefined}>
              {tab === t.id && <motion.span layoutId="tab-pill" className="tab-pill" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
              <span>{t.label}</span>
            </a>
          ))}
        </nav>
        <a className={`status${connected ? ' on' : ''}`} href="#ops" title="Live connection to the operations API">
          <i /> {connected ? `${orders} ${orders === 1 ? 'order' : 'orders'} live` : 'connecting'}
        </a>
      </header>

      {/* Enter-only transition: switching pages never waits on an exit animation. */}
      <motion.main
        key={tab}
        className={`wrap wrap-${tab}`}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {tab === 'home' && <Home products={products} snapshot={snapshot} stockOf={stockOf} onBuy={buy} go={go} />}
        {tab === 'finder' && <Finder products={products} stockOf={stockOf} onBuy={buy} />}
        {tab === 'shop' && <Shop products={products} stockOf={stockOf} onBuy={buy} />}
        {tab === 'ops' && <Ops snapshot={snapshot} connected={connected} products={products} notify={notify} />}
      </motion.main>

      <footer className="foot">
        <span>Scent Studio — interview demo</span>
        <span>Fictional catalog · Shopify, Mercado Libre &amp; QuickBooks mocked with real payload shapes</span>
        <span>Node · TypeScript · React · three.js</span>
      </footer>

      <AnimatePresence>
        {toast && (
          <motion.div className="toast" role="status" initial={{ opacity: 0, y: 20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 20, x: '-50%' }}>
            <span>{toast.msg}</span>
            {toast.action && tab !== 'ops' && (
              <button className="btn btn-primary btn-small" onClick={() => go('ops')}>
                Open operations
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
