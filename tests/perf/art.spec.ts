/**
 * R36 creature draw budget at 4× CPU throttle: ≤ 0.12 ms per animated creature from cache and
 * ≤ 1.0 ms for all creatures in a frame (6 animated leapers, R37), no per-frame Path2D/blur/gradient.
 */
import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { boot } from '../e2e/helpers.ts';

const K = process.env.CI ? 3 : 1;

test('animated creatures from cache stay within 0.12 ms each at 4× throttle', async ({ page }) => {
  await boot(page, 'seed=7');
  await page.waitForFunction(() => (window as any).__lbArt, null, { timeout: 10_000 });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const r = await page.evaluate(() => {
    const m = (window as any).__lbArt;
    const arts = [...m.ART.values()];
    const dpr = window.devicePixelRatio || 1;
    const c = document.createElement('canvas');
    c.width = 400 * dpr;
    c.height = 400 * dpr;
    document.body.append(c); // a real, attached canvas like the game's
    const g = c.getContext('2d')!;
    g.scale(dpr, dpr);
    const N = 6;
    const frame = (t: number) => {
      for (let i = 0; i < N; i++) {
        const a = arts[i % arts.length];
        m.renderCreature(g, a, 60 + (i % 3) * 120, 100 + Math.floor(i / 3) * 160, {
          size: 44 + (i % 3) * 6,
          expression: 'happy',
          t: t + i * 0.37,
          angle: Math.sin(t + i) * 0.4,
          facing: i % 2 ? -1 : 1,
        });
      }
    };
    for (let f = 0; f < 30; f++) frame(f / 60); // warm the layer caches
    const missesBefore = m.cacheStats().misses;
    const times: number[] = [];
    for (let f = 0; f < 240; f++) {
      g.clearRect(0, 0, 400, 400);
      const t0 = performance.now();
      frame(1 + f / 60);
      times.push(performance.now() - t0);
    }
    c.remove();
    times.sort((a, b) => a - b);
    const p = (q: number) => times[Math.min(times.length - 1, Math.floor(times.length * q))]!;
    const total = times.reduce((a, b) => a + b, 0);
    return {
      perCreatureMean: total / times.length / N,
      perCreatureP50: p(0.5) / N,
      perCreatureP95: p(0.95) / N,
      frameP95: p(0.95),
      newRasters: m.cacheStats().misses - missesBefore,
      cacheMB: m.cacheStats().bytes / 1e6,
    };
  });
  mkdirSync('artifacts', { recursive: true });
  writeFileSync('artifacts/perf-art.json', JSON.stringify(r, null, 2));
  console.log('creature draw (4× throttle)', r);
  expect(r.newRasters).toBe(0); // steady state never rasterises
  // performance.now() is ~0.1 ms coarse under throttling: judge per-creature cost by the mean
  expect(r.perCreatureMean).toBeLessThan(0.12 * K);
  expect(r.frameP95).toBeLessThan(1.0 * K);
});
