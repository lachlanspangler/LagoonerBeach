/**
 * Creature art in a real browser (ADR 0011), Chromium + WebKit:
 * - the lazy art chunk loads after first paint;
 * - `new Path2D(d)` renders our path data like the pure rasteriser does (the WebKit/iOS check);
 * - R12 silhouette IoU limits hold on real 24 px masks;
 * - every species draws in every expression, Day/Night/golden, static and animated, without errors.
 */
import { expect, test } from '@playwright/test';
import { boot } from './helpers.ts';

test('art chunk loads lazily, Path2D masks match the rasteriser, silhouettes stay distinct', async ({ page }) => {
  const errors = await boot(page, 'seed=7');
  await page.waitForFunction(() => (window as any).__lbArt, null, { timeout: 10_000 });
  const r = await page.evaluate(() => {
    const m = (window as any).__lbArt;
    const N: number = m.SIL_GRID;
    const ids = [...m.ART.keys()] as string[];
    const masks: Record<string, Float32Array> = {};
    const parity: Record<string, number> = {};
    for (const id of ids) {
      const art = m.ART.get(id);
      const c = document.createElement('canvas');
      c.width = c.height = N;
      const g = c.getContext('2d')!;
      const read = () => {
        const d = g.getImageData(0, 0, N, N).data;
        const f = new Float32Array(N * N);
        for (let i = 0; i < N * N; i++) f[i] = d[i * 4 + 3]! / 255;
        return f;
      };
      // body box centred, then re-centred on the mask centroid (as the rasteriser does)
      m.renderCreature(g, art, N / 2, N / 2, { size: 24, silhouette: '#000' });
      let f = read();
      let sx = 0,
        sy = 0,
        s = 0;
      for (let i = 0; i < N * N; i++) {
        sx += f[i]! * ((i % N) + 0.5);
        sy += f[i]! * (Math.floor(i / N) + 0.5);
        s += f[i]!;
      }
      g.clearRect(0, 0, N, N);
      m.renderCreature(g, art, N - sx / s, N - sy / s, { size: 24, silhouette: '#000' });
      f = read();
      masks[id] = f;
      const pure: Float32Array = m.silhouetteMask(art);
      const area = (x: Float32Array) => x.reduce((a, v) => a + v, 0);
      parity[id] = Math.abs(area(f) - area(pure)) / area(pure);
    }
    const pairs: [string, string, number, number][] = [];
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) {
        const a = masks[ids[i]!]!,
          b = masks[ids[j]!]!;
        let I = 0,
          U = 0;
        for (let k = 0; k < a.length; k++) {
          I += Math.min(a[k]!, b[k]!);
          U += Math.max(a[k]!, b[k]!);
        }
        const same = m.bodyClassOf(m.ART.get(ids[i]).klass) === m.bodyClassOf(m.ART.get(ids[j]).klass);
        pairs.push([ids[i]!, ids[j]!, I / U, same ? m.IOU_MAX_SAME_CLASS : m.IOU_MAX]);
      }
    return { parity, pairs, n: ids.length };
  });
  expect(r.n).toBeGreaterThanOrEqual(5);
  // same path data, two rasterisers: areas agree within 8 % (catches Path2D(string) parse gaps)
  for (const [id, d] of Object.entries(r.parity)) expect(d, id).toBeLessThan(0.08);
  for (const [a, b, v, lim] of r.pairs) expect(v, `${a} vs ${b}`).toBeLessThan(lim);
  expect(errors).toEqual([]);
});

test('every species draws in every expression, theme and mode', async ({ page }) => {
  const errors = await boot(page, 'seed=7');
  await page.waitForFunction(() => (window as any).__lbArt, null, { timeout: 10_000 });
  const res = await page.evaluate(() => {
    const m = (window as any).__lbArt;
    const out: Record<string, number> = {};
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const exprs = ['idle', 'blink', 'happy', 'surprised', 'proud', 'sleepy', 'shy', 'drowsy'];
    for (const [id, art] of m.ART as Map<string, unknown>) {
      let min = Infinity;
      for (const night of [false, true])
        for (const golden of [false, true])
          for (const expression of exprs)
            for (const t of [undefined, 2.3]) {
              g.clearRect(0, 0, 128, 128);
              m.renderCreature(g, art, 64, 64, { size: 80, night, golden, expression, t });
              const d = g.getImageData(0, 0, 128, 128).data;
              let n = 0;
              for (let i = 3; i < d.length; i += 4) if (d[i]! > 128) n++;
              min = Math.min(min, n);
            }
      out[id] = min;
    }
    return { out, stats: m.cacheStats() };
  });
  for (const [id, n] of Object.entries(res.out)) expect(n, id).toBeGreaterThan(80 * 80 * 0.2);
  expect(res.stats.bytes).toBeLessThanOrEqual(res.stats.cap);
  expect(errors).toEqual([]);
});
