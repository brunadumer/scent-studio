import { state } from '../store';

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class ApiError extends Error {
  constructor(service: string, public status: number, statusText: string) {
    super(`${service} ${status} ${statusText}`);
  }
}

/**
 * Stand-in for a real HTTP call: adds network latency and, in chaos mode,
 * fails about half the time with the kinds of errors these APIs really return.
 */
export async function mockCall(service: string, failures: Array<[number, string]>) {
  await sleep(250 + Math.random() * 450);
  if (state.chaos && Math.random() < 0.55) {
    const [status, text] = failures[Math.floor(Math.random() * failures.length)];
    throw new ApiError(service, status, text);
  }
}
