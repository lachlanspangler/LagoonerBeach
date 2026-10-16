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

test('input → first acknowledging frame latency (4× throttle)', async ({ page }) => {
  await boot(page, 'seed=11');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.evaluate(() => {
    (window as any).__downs = [];
    document
      .getElementById('game')!
      .addEventListener('pointerdown', () => (window as any).__downs.push(performance.now()), { capture: true });
  });
  const lat: number[] = [];
  for (let i = 0; i < 12; i++) {
    const plan = await page.evaluate(() => (window as any).__atoll.plan('greedy'));
    if (!plan) break;
    await page.mouse.move(plan.down.x, plan.down.y);
    await page.mouse.down();
    await page.waitForTimeout(60);
    await page.mouse.move(plan.up.x, plan.up.y, { steps: 3 });
    await page.mouse.up();
    await page.waitForTimeout(400);
    const [downs, drawn] = await page.evaluate(() => [(window as any).__downs, (window as any).__atoll.pickDrawnAt()]);
    const d = downs[downs.length - 1];
    const f = drawn.find((t: number) => t >= d);
    if (d && f) lat.push(f - d);
  }
  console.log('pick latency ms (in order)', lat.map((x) => x.toFixed(1)).join(' '));
  lat.sort((a, b) => a - b);
  expect(lat.length).toBeGreaterThan(8);
  // every pick (including the very first, which used to build the AudioContext: 133 ms) is
  // acknowledged within ≤ 2 frames at 60 Hz, even under 4× throttle
  expect(lat[lat.length - 1]!).toBeLessThan(34);
});

test('release → first frame with the placed piece (4× throttle, first-run teaching on)', async ({ page }) => {
  await boot(page, '');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.evaluate(() => {
    (window as any).__ups = [];
    document
      .getElementById('game')!
      .addEventListener('pointerup', () => (window as any).__ups.push(performance.now()), { capture: true });
  });
  const lat: number[] = [];
  for (let i = 0; i < 12; i++) {
    const plan = await page.evaluate(() => (window as any).__atoll.plan('greedy'));
    if (!plan) break;
    await page.mouse.move(plan.down.x, plan.down.y);
    await page.mouse.down();
    await page.mouse.move(plan.up.x, plan.up.y, { steps: 3 });
    await page.mouse.up();
    await page.waitForTimeout(450);
    const [ups, drawn] = await page.evaluate(() => [(window as any).__ups, (window as any).__atoll.dropDrawnAt()]);
    const u = ups[ups.length - 1];
    const f = drawn.find((t: number) => t >= u);
    if (u && f) lat.push(f - u);
  }
  console.log('drop latency ms (in order)', lat.map((x) => x.toFixed(1)).join(' '));
  console.log(
    'commit ms (in order)',
    (await page.evaluate(() => (window as any).__atoll.commitTimes())).map((x: number) => x.toFixed(1)).join(' '),
  );
  expect(lat.length).toBeGreaterThan(8);
  expect(Math.max(...lat)).toBeLessThan(34);
});
