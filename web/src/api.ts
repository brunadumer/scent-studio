import { useEffect, useState } from 'react';
import type { OpsSnapshot, Product, QuizAnswers, Recommendation } from '../../shared/types';

async function request<T>(method: 'GET' | 'POST', url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}

export const api = {
  products: () => request<Product[]>('GET', '/api/products'),
  recommend: (answers: QuizAnswers) => request<Recommendation[]>('POST', '/api/recommend', answers),
  buyOnShopify: (productId: string, qty = 1) => request<{ orderName: string }>('POST', '/api/simulate/shopify-order', { productId, qty }),
  sellOnMercadoLibre: () => request<{ orderId: number }>('POST', '/api/simulate/mercadolibre-order', {}),
  replayLastWebhook: () => request<{ status: number }>('POST', '/api/simulate/replay-last', {}),
  sendForgedWebhook: () => request<{ status: number }>('POST', '/api/simulate/forged-webhook', {}),
  setChaos: (enabled: boolean) => request<{ chaos: boolean }>('POST', '/api/chaos', { enabled }),
  retryJob: (id: string) => request<{ ok: boolean }>('POST', `/api/jobs/${id}/retry`, {}),
  reset: () => request<{ ok: boolean }>('POST', '/api/reset', {}),
};

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  useEffect(() => {
    api.products().then(setProducts).catch(console.error);
  }, []);
  return products;
}

/** Live operations state pushed from the server over Server-Sent Events. */
export function useOpsStream() {
  const [snapshot, setSnapshot] = useState<OpsSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const es = new EventSource('/api/stream');
    let lastSeen = Date.now();
    const alive = () => {
      lastSeen = Date.now();
      setConnected(true);
    };
    es.onmessage = (e) => {
      alive();
      setSnapshot(JSON.parse(e.data) as OpsSnapshot);
    };
    es.addEventListener('ping', alive);
    es.onerror = () => setConnected(false); // EventSource retries on its own

    // The server pings every 5s; if nothing arrives for 12s the stream is dead, so open a new one.
    const watchdog = window.setInterval(() => {
      if (Date.now() - lastSeen > 12_000) {
        setConnected(false);
        setAttempt((n) => n + 1);
      }
    }, 3_000);

    return () => {
      window.clearInterval(watchdog);
      es.close();
    };
  }, [attempt]);

  return { snapshot, connected };
}
