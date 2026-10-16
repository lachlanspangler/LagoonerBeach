/**
 * Frame budget under a 4× CPU throttle (≈ a mid-range phone). We measure the cost of our own draw
 * call per frame during heavy play (drags + captures + particles); 60 fps needs the whole frame
 * under 16.7 ms, so our draw must leave plenty of headroom.
 */
import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { boot, dragMove } from '../e2e/helpers.ts';

test('draw cost p95 under budget at 4× CPU throttle', async ({ page }) => {
  await boot(page, 'seed=11');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.evaluate(() => (window as any).__atoll.clearFrames());
  for (let i = 0; i < 24; i++) if (!(await dragMove(page, 'greedy', 120))) break;
  const draws: number[] = await page.evaluate(() => (window as any).__atoll.drawTimes());
  const sorted = [...draws].sort((a, b) => a - b);
  const p = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))]!;
  const report = {
    frames: draws.length,
    p50: +p(0.5).toFixed(2),
    p95: +p(0.95).toFixed(2),
    p99: +p(0.99).toFixed(2),
    max: +p(1).toFixed(2),
  };
  mkdirSync('artifacts', { recursive: true });
  writeFileSync('artifacts/perf.json', JSON.stringify(report, null, 2));
  console.log('perf', report);
  expect(draws.length).toBeGreaterThan(100);
  expect(report.p95).toBeLessThan(8);
});
