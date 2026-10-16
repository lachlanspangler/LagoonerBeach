/**
 * Endless reefs are generated in a Web Worker: generating must never block input. While the worker
 * builds 8 far-out reefs (the slowest part of the curve, near the ceiling), we play classic with real
 * drags and record frame intervals and main-thread long tasks.
 */
import { expect, test } from '@playwright/test';
import { boot, dragMove } from '../e2e/helpers.ts';

const K = process.env.CI ? 3 : 1;

test('worker generation keeps frames under budget and the main thread free', async ({ page }) => {
  await boot(page, 'seed=11');
  // the reef source comes up with the pack; then go back to classic and play during generation
  await page.evaluate(() => (window as any).__atoll.switchMode('puzzle'));
  await expect.poll(() => page.evaluate(() => (window as any).__atoll.mode())).toBe('puzzle');
  await page.evaluate(() => (window as any).__atoll.switchMode('classic'));
  const before = (await page.evaluate(() => (window as any).__atoll.reefStats())).generated;
  await page.evaluate(() => {
    const w = window as any;
    w.__gaps = [];
    w.__long = [];
    let last = performance.now();
    const tick = (t: number) => {
      w.__gaps.push(t - last);
      last = t;
      if (!w.__stop) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    try {
      new PerformanceObserver((l) => l.getEntries().forEach((e) => w.__long.push(e.duration))).observe({
        type: 'longtask',
        buffered: false,
      });
    } catch {
      /* no longtask API: the frame gaps still tell */
    }
    w.__atoll.prefetchReefs(60_001, 8);
  });
  for (let i = 0; i < 8; i++) if (!(await dragMove(page, 'greedy', 80))) break;
  await expect
    .poll(async () => (await page.evaluate(() => (window as any).__atoll.reefStats())).generated - before, {
      timeout: 20_000,
    })
    .toBeGreaterThanOrEqual(8);
  const r = await page.evaluate(() => {
    const w = window as any;
    w.__stop = true;
    const gaps = (w.__gaps as number[]).slice(2).sort((a, b) => a - b);
    return {
      frames: gaps.length,
      p95: gaps[Math.floor(gaps.length * 0.95)]!,
      max: gaps[gaps.length - 1]!,
      longTasks: w.__long as number[],
      stats: w.__atoll.reefStats(),
    };
  });
  console.log('reefgen perf', { ...r, stats: undefined, worker: r.stats.worker, lastMs: r.stats.lastMs });
  expect(r.stats.worker).toBe(true);
  expect(r.stats.fallback).toBe(0);
  expect(r.frames).toBeGreaterThan(30);
  expect(r.p95).toBeLessThan(20 * K);
  // no main-thread task anywhere near a generation's cost (a far reef takes ~10–180 ms in the worker)
  expect(Math.max(0, ...r.longTasks)).toBeLessThan(100 * K);
  expect(r.max).toBeLessThan(120 * K);
});
