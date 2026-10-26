import { describe, expect, it, vi } from 'vitest';
import { installPreloadRecovery, retryable } from '../../src/platform/lazy.ts';

describe('retryable lazy loads', () => {
  it('a rejection is not cached: the next call tries again, success is cached', async () => {
    let n = 0;
    const load = retryable(() => (++n === 1 ? Promise.reject(new Error('net')) : Promise.resolve(n)));
    await expect(load()).rejects.toThrow('net');
    await expect(load()).resolves.toBe(2);
    await expect(load()).resolves.toBe(2);
    expect(n).toBe(2);
  });
});

describe('vite:preloadError recovery', () => {
  function fakeWin() {
    const store = new Map<string, string>();
    let handler: (() => void) | null = null;
    const w = {
      addEventListener: (_: string, h: () => void) => (handler = h),
      sessionStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
      },
      location: { reload: vi.fn() },
    };
    return { w, fire: () => handler?.() };
  }
  it('reloads once, then not again within the guard window, then again later', () => {
    const { w, fire } = fakeWin();
    let t = 1_000_000;
    installPreloadRecovery(w as never, () => t);
    fire();
    expect(w.location.reload).toHaveBeenCalledTimes(1);
    t += 5_000;
    fire(); // right after the reload: the chunk is still missing → no loop
    expect(w.location.reload).toHaveBeenCalledTimes(1);
    t += 60_000;
    fire(); // a later deploy in the same session
    expect(w.location.reload).toHaveBeenCalledTimes(2);
  });
});
