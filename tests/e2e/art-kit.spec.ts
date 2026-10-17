/**
 * Kit options added for CRITIQUE-1 and the fleet's reported gaps, exercised on synthetic variants in
 * a real browser (Chromium + WebKit): props that follow the root, scale steps, seamless chains,
 * colour cycles, glow-only parts, the W pupil, two-eye profiles and hidden groups.
 */
import { expect, test } from '@playwright/test';
import { boot } from './helpers.ts';

test('kit options render on every theme, static and animated, without errors', async ({ page }) => {
  const errors = await boot(page, 'seed=7');
  await page.waitForFunction(() => (window as any).__lbArt, null, { timeout: 10_000 });
  const res = await page.evaluate(() => {
    const m = (window as any).__lbArt;
    const base = m.ART.get('clownfish');
    const disc = (cx: number, r: number) => `M${cx - r} 0A${r} ${r} 0 1 0 ${cx + r} 0A${r} ${r} 0 1 0 ${cx - r} 0Z`;
    const seg = (id: string, cx: number) => ({
      id,
      seamless: true,
      pivot: [cx, 0],
      parts: [{ d: disc(cx, 12), role: 'body' }],
    });
    const variants: Record<string, unknown> = {
      chain: { ...base, id: 'chain', groups: [seg('s1', -30), seg('s2', -12), seg('body', 8), seg('s4', 26)] },
      cycle: {
        ...base,
        id: 'cycle',
        cycle: { rate: 6 },
        groups: [
          {
            id: 'body',
            parts: [
              { d: disc(0, 30), role: 'body' },
              { d: disc(0, 12), role: 'accent', kind: 'pattern', cycle: ['#53C08C', '#3D9BE9', '#8E5BD8'] },
            ],
          },
        ],
      },
      glow: {
        ...base,
        id: 'glow',
        groups: [
          {
            id: 'body',
            parts: [
              { d: disc(0, 34), role: 'light', outline: false, alpha: 0.35 },
              { d: disc(0, 26), role: 'body' },
            ],
          },
        ],
      },
      puff: {
        ...base,
        id: 'puff',
        groups: [{ id: 'body', scaleSteps: [1.2, 1.4], pivot: [0, 0], parts: [{ d: disc(0, 28), role: 'body' }] }],
        idle: {
          ...base.idle,
          signature: {
            dur: 1,
            tracks: [
              {
                g: 'body',
                p: 's',
                k: [
                  [0, 1],
                  [0.5, 1.35],
                  [1, 1],
                ],
              },
            ],
          },
        },
      },
      prop: {
        ...base,
        id: 'prop',
        groups: [
          ...base.groups.filter((g: any) => !g.prop),
          { id: 'bubble', prop: true, followRoot: true, parts: [{ d: disc(30, 6), role: 'white' }] },
        ],
        idle: {
          ...base.idle,
          signature: {
            dur: 1,
            tracks: [
              {
                g: 'bubble',
                p: 's',
                k: [
                  [0, 0],
                  [0.5, 1],
                  [1, 0],
                ],
              },
              {
                p: 'ty',
                k: [
                  [0, 0],
                  [0.5, -8],
                  [1, 0],
                ],
              },
            ],
          },
        },
      },
      pupil: { ...base, id: 'pupil', face: { ...base.face, pupil: 'w' } },
      twoeye: {
        ...base,
        id: 'twoeye',
        face: {
          ...base.face,
          profile: true,
          eyes: [
            [12, 2],
            [26, 2],
          ],
        },
      },
    };
    const c = document.createElement('canvas');
    c.width = c.height = 160;
    const g = c.getContext('2d')!;
    const ink = () => {
      const d = g.getImageData(0, 0, 160, 160).data;
      let n = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i]! > 128) n++;
      return n;
    };
    const out: Record<string, number> = {};
    for (const [id, art] of Object.entries(variants))
      for (const night of [false, true])
        for (const opts of [{}, { t: 1.3 }, { t: 0.01, signatureAt: 0.5 }, { expression: 'sleepy', zzz: true }]) {
          g.clearRect(0, 0, 160, 160);
          m.renderCreature(g, art, 80, 80, { size: 90, night, ...opts });
          out[id] = Math.min(out[id] ?? Infinity, ink());
        }
    // hidden groups draw less than the full creature
    g.clearRect(0, 0, 160, 160);
    m.renderCreature(g, base, 80, 80, { size: 90 });
    const full = ink();
    g.clearRect(0, 0, 160, 160);
    m.renderCreature(g, base, 80, 80, { size: 90, hide: ['tail'] });
    return { out, hidden: ink() < full };
  });
  for (const [id, n] of Object.entries(res.out)) expect(n, id).toBeGreaterThan(400);
  expect(res.hidden).toBe(true);
  expect(errors).toEqual([]);
});
