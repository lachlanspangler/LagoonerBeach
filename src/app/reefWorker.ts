/**
 * Web Worker: builds endless reefs off the main thread. Message in: `{ n }` (reef number);
 * message out: `{ n, reef, ms }` or `{ n, error }`. Requests are handled in arrival order.
 */
import { generateReef } from '../core/endless.ts';

const ctx = self as unknown as {
  postMessage(m: unknown): void;
  onmessage: ((e: MessageEvent<{ n: number }>) => void) | null;
};

ctx.onmessage = (e) => {
  const n = e.data.n;
  const t0 = performance.now();
  try {
    const reef = generateReef(n);
    ctx.postMessage({ n, reef, ms: performance.now() - t0 });
  } catch (err) {
    ctx.postMessage({ n, error: String(err) });
  }
};
