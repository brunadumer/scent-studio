import { useState, type ReactNode } from 'react';
import type { InventoryRow, Job, OpsSnapshot, Product } from '../../../shared/types';
import { CHANNEL_LABEL } from '../../../shared/types';
import { api } from '../api';

interface Props {
  snapshot: OpsSnapshot | null;
  connected: boolean;
  products: Product[];
  notify: (msg: string) => void;
}

const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export function Ops({ snapshot, connected, products, notify }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const name = (id: string) => products.find((p) => p.id === id)?.name ?? id;

  const run = async (key: string, fn: () => Promise<unknown>, done?: (r: never) => string) => {
    setBusy(key);
    try {
      const r = await fn();
      if (done) notify(done(r as never));
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (!snapshot) return <p className="muted center">Connecting to the operations stream…</p>;

  const accepted = snapshot.orders.filter((o) => o.status === 'accepted');
  const pending = snapshot.jobs.filter((j) => ['queued', 'running', 'retrying'].includes(j.status)).length;
  const dead = snapshot.jobs.filter((j) => j.status === 'dead').length;
  const flagged = snapshot.orders.filter((o) => o.status === 'flagged').length;

  return (
    <section className="ops">
      <header className="section-head">
        <p className="eyebrow">
          Operations <span className={`live${connected ? ' on' : ''}`}>{connected ? 'live' : 'reconnecting'}</span>
        </p>
        <h2 className="display">
          Mission control <span className="grad-text">for every sale.</span>
        </h2>
      </header>

      <Flow active={pending > 0} />

      <div className="controls">
        <div className="control-group">
          <span className="control-label">Simulate</span>
          <button className="btn btn-dark" disabled={!!busy} onClick={() => run('ml', api.sellOnMercadoLibre, (r: { orderId: number }) => `Mercado Libre order ${r.orderId} received`)}>
            Mercado Libre sale
          </button>
          <button
            className="btn btn-dark"
            disabled={!!busy}
            onClick={() => {
              const inStock = snapshot.inventory.filter((r) => r.shopify.qty > 0);
              if (!inStock.length) return notify('Everything is sold out on Shopify');
              const pick = inStock[Math.floor(Math.random() * inStock.length)];
              void run('sh', () => api.buyOnShopify(pick.productId), (r: { orderName: string }) => `Shopify order ${r.orderName} placed`);
            }}
          >
            Shopify sale
          </button>
        </div>
        <div className="control-group">
          <span className="control-label">Break things</span>
          <button className="btn btn-ghost" disabled={!!busy} onClick={() => run('replay', api.replayLastWebhook, (r: { status: number }) => `Webhook re-delivered → ${r.status}, no duplicate`)}>
            Replay last webhook
          </button>
          <button className="btn btn-ghost" disabled={!!busy} onClick={() => run('forged', api.sendForgedWebhook, (r: { status: number }) => `Forged webhook → ${r.status} Unauthorized`)}>
            Send forged webhook
          </button>
          <label className={`toggle${snapshot.chaos ? ' is-on' : ''}`}>
            <input type="checkbox" checked={snapshot.chaos} onChange={(e) => void run('chaos', () => api.setChaos(e.target.checked))} />
            <span className="toggle-track" aria-hidden="true" />
            Chaos mode
          </label>
          <button className="btn btn-link" disabled={!!busy} onClick={() => run('reset', api.reset, () => 'Demo reset')}>
            Reset
          </button>
        </div>
      </div>

      <div className="kpis">
        <Kpi label="Orders" value={String(accepted.length)} sub={flagged ? `${flagged} flagged` : 'all clean'} tone={flagged ? 'bad' : undefined} />
        <Kpi label="Revenue" value={money(accepted.reduce((s, o) => s + o.total, 0))} sub="Shopify + Mercado Libre" />
        <Kpi label="In QuickBooks" value={String(snapshot.ledger.length)} sub="sales receipts" />
        <Kpi label="Sync queue" value={String(pending)} sub={dead ? `${dead} need attention` : 'in flight'} tone={dead ? 'bad' : pending ? 'warn' : undefined} />
      </div>

      <div className="ops-grid">
        <Panel title="Inventory" note="On hand is the source of truth; each channel should match it.">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="num">On hand</th>
                  <th className="num">Shopify</th>
                  <th className="num">Mercado Libre</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.inventory.map((row) => (
                  <tr key={row.productId}>
                    <td>{name(row.productId)}</td>
                    <td className="num strong">{row.onHand}</td>
                    <td className={`num${row.shopify.qty !== row.onHand ? ' drift' : ''}`}>{row.shopify.qty}</td>
                    <td className={`num${row.mercadolibre.qty !== row.onHand ? ' drift' : ''}`}>{row.mercadolibre.qty}</td>
                    <td>
                      <SyncStatus row={row} jobs={snapshot.jobs} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Live event log" note="Everything the integration does, as it happens.">
          <ol className="log">
            {snapshot.events.map((e) => (
              <li key={e.id} className={`lvl-${e.level}`}>
                <time>{time(e.at)}</time>
                <span className={`src src-${e.source}`}>{e.source}</span>
                <span className="msg">{e.message}</span>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel title="Sync jobs" note="Retries with exponential backoff, then dead-letter. Open a job to see the exact API request.">
          {snapshot.jobs.length === 0 ? (
            <p className="muted">No jobs yet — simulate a sale.</p>
          ) : (
            <ul className="jobs">
              {snapshot.jobs.map((j) => (
                <li key={j.id}>
                  <details>
                    <summary>
                      <span className={`pill pill-${j.status}`}>{j.status}</span>
                      <span className="job-label">{j.label}</span>
                      <span className="muted small">
                        {j.attempts}/{j.maxAttempts}
                      </span>
                    </summary>
                    {j.lastError && <p className="error small">Last error: {j.lastError}</p>}
                    {j.request !== undefined && <pre>{JSON.stringify(j.request, null, 2)}</pre>}
                    {j.response !== undefined && <pre className="resp">{JSON.stringify(j.response, null, 2)}</pre>}
                  </details>
                  {j.status === 'dead' && (
                    <button className="btn btn-small" onClick={() => run(j.id, () => api.retryJob(j.id))}>
                      Retry
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="QuickBooks · sales receipts" note="One receipt per order, keyed by requestid so it can never be booked twice.">
          {snapshot.ledger.length === 0 ? (
            <p className="muted">Nothing booked yet.</p>
          ) : (
            <ul className="ledger">
              {snapshot.ledger.map((l) => (
                <li key={l.id}>
                  <details>
                    <summary>
                      <span className="doc">{l.docNumber}</span>
                      <span className="muted small">{CHANNEL_LABEL[l.channel]}</span>
                      <span className="amt">{money(l.total)}</span>
                    </summary>
                    <pre>{JSON.stringify(l.payload, null, 2)}</pre>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Orders" note="Normalised from both channels into one shape.">
          {snapshot.orders.length === 0 ? (
            <p className="muted">No orders yet.</p>
          ) : (
            <ul className="orders">
              {snapshot.orders.map((o) => (
                <li key={o.id} className={o.status === 'flagged' ? 'flagged' : ''}>
                  <span className={`chan chan-${o.channel}`}>{o.channel === 'shopify' ? 'SH' : 'ML'}</span>
                  <span>
                    <strong>{o.externalId}</strong> · {o.lines.map((l) => `${l.qty}× ${l.name}`).join(', ')}
                    <span className="muted small"> · {o.customer}</span>
                    {o.flagReason && <span className="error small block">Oversold — {o.flagReason}</span>}
                  </span>
                  <span className="amt">{money(o.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </section>
  );
}

function SyncStatus({ row, jobs }: { row: InventoryRow; jobs: Job[] }) {
  const inSync = row.shopify.qty === row.onHand && row.mercadolibre.qty === row.onHand;
  if (inSync) return <span className="pill pill-done">in sync</span>;
  const active = jobs.some((j) => j.productId === row.productId && ['queued', 'running', 'retrying'].includes(j.status));
  return active ? <span className="pill pill-retrying">syncing</span> : <span className="pill pill-dead">drift</span>;
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: 'warn' | 'bad' }) {
  return (
    <div className={`kpi${tone ? ` kpi-${tone}` : ''}`}>
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value}</span>
      <span className="kpi-sub">{sub}</span>
    </div>
  );
}

function Panel({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <div className="panel">
      <h3>{title}</h3>
      <p className="muted small">{note}</p>
      {children}
    </div>
  );
}

function Flow({ active }: { active: boolean }) {
  const steps = [
    { t: 'Shopify · Mercado Libre', d: 'a sale happens' },
    { t: 'Webhook in', d: 'HMAC check / fetch the order' },
    { t: 'Order service', d: 'dedupe · reserve stock' },
    { t: 'Job queue', d: 'retry · backoff · dead-letter' },
    { t: 'QuickBooks + other channel', d: 'receipt booked · stock pushed' },
  ];
  return (
    <ol className={`flow${active ? ' is-active' : ''}`} aria-label="How an order flows through the system">
      {steps.map((s, i) => (
        <li key={s.t}>
          <span className="flow-n">{i + 1}</span>
          <strong>{s.t}</strong>
          <span>{s.d}</span>
        </li>
      ))}
    </ol>
  );
}
