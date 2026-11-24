import type { Job, JobKind } from '../shared/types';
import { changed, log, now, state, uid } from './store';

// A tiny in-process job queue: retries with exponential backoff + jitter, then a dead-letter state.
// In production this would be BullMQ (Redis) or a Postgres-backed queue so jobs survive restarts.

type Handler = (job: Job) => Promise<{ response?: unknown }>;
const handlers = new Map<JobKind, Handler>();
let epoch = 0; // bumped on reset so timers from an old run never fire into new state

export function registerHandler(kind: JobKind, handler: Handler) {
  handlers.set(kind, handler);
}

export function resetQueue() {
  epoch++;
}

export function enqueue(job: Pick<Job, 'kind' | 'orderId' | 'productId' | 'label'>): Job {
  const full: Job = { ...job, id: uid('job'), status: 'queued', attempts: 0, maxAttempts: 4, updatedAt: now() };
  state.jobs.unshift(full);
  if (state.jobs.length > 200) state.jobs.length = 200;
  changed();
  schedule(full, 200);
  return full;
}

export function retryJob(id: string): boolean {
  const job = state.jobs.find((j) => j.id === id);
  if (!job || job.status !== 'dead') return false;
  job.attempts = 0;
  job.status = 'queued';
  touch(job);
  log('info', 'queue', `Manual retry: ${job.label}`);
  schedule(job, 100);
  return true;
}

function schedule(job: Job, delayMs: number) {
  const runEpoch = epoch;
  setTimeout(() => {
    if (runEpoch === epoch) void run(job);
  }, delayMs);
}

function touch(job: Job) {
  job.updatedAt = now();
  changed();
}

async function run(job: Job) {
  const handler = handlers.get(job.kind);
  if (!handler) throw new Error(`No handler for ${job.kind}`);

  job.status = 'running';
  job.attempts++;
  job.nextRunAt = undefined;
  touch(job);

  try {
    const { response } = await handler(job);
    job.status = 'done';
    job.response = response;
    job.lastError = undefined;
    touch(job);
  } catch (err) {
    job.lastError = err instanceof Error ? err.message : String(err);
    if (job.attempts >= job.maxAttempts) {
      job.status = 'dead';
      touch(job);
      log('error', 'queue', `${job.label} failed ${job.attempts}× — moved to dead-letter, needs a manual retry`);
      return;
    }
    const delay = 800 * 2 ** (job.attempts - 1) + Math.round(Math.random() * 300);
    job.status = 'retrying';
    job.nextRunAt = new Date(Date.now() + delay).toISOString();
    touch(job);
    log('warn', 'queue', `${job.label}: ${job.lastError} — retry ${job.attempts}/${job.maxAttempts - 1} in ${(delay / 1000).toFixed(1)}s`);
    schedule(job, delay);
  }
}
