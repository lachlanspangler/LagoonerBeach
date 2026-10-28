/**
 * Rendered block colours (ADR 0014). The a11y unit test checks the skin's hex list; but the reef
 * materials paint ridges, pores and highlights over each hex, and what the eye averages is the
 * rendered face. Here the real game draws a staged board (each colour in a full row, so all three
 * per-cell variants are included), and we measure each colour's mean face colour and its
 * lightness texture straight off the canvas, in Day and Night, at dpr 1 and 2:
 * - under protan / deutan / tritan the six means stay apart (ΔE > 10, the default skin's floor);
 * - each mean stays near its hex (a pattern can't quietly drift a colour toward a neighbour);
 * - in greyscale (mean L*, texture contrast, grain direction) every pair stays at least 4 apart and
 *   no closer than with the old flat look.
 */
import { expect, test, type Page } from '@playwright/test';
import { boot } from './helpers.ts';
import { deltaE, hexToRgb, simulate, type RGB } from '../../src/render/color.ts';
import { LOOKS } from '../../src/render/skins.ts';

test.skip(({ browserName }) => browserName !== 'chromium', 'canvas readback, Chromium only');

const BOARD = '111111112222222233333333444444445555555566666666' + '0'.repeat(16);
const KINDS = ['protan', 'deutan', 'tritan'] as const;

interface Face {
  rgb: RGB;
  L: number;
  sd: number;
  /** Lightness edges across minus along (−1 … 1): grain direction, e.g. lobes vs bedding. */
  an: number;
}

async function faces(page: Page, skin: string): Promise<Face[]> {
  await page.evaluate(
    ([b, s]) => {
      const a = (window as any).__atoll;
      a.debugSkin(s);
      a.setup(b, ['dot', 'dot', 'dot']);
    },
    [BOARD, skin] as const,
  );
  await page.waitForTimeout(900);
  return page.evaluate(() => {
    const a = (window as any).__atoll;
    const l = a.layout();
    const cv = document.getElementById('game') as HTMLCanvasElement;
    const k = cv.width / cv.getBoundingClientRect().width;
    const g = cv.getContext('2d')!;
    const lin = (c: number) => {
      c /= 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    const Lstar = (r: number, gg: number, b: number) => {
      const y = 0.2126 * lin(r) + 0.7152 * lin(gg) + 0.0722 * lin(b);
      return y > 216 / 24389 ? 116 * Math.cbrt(y) - 16 : (24389 / 27) * y;
    };
    const out: { rgb: [number, number, number]; L: number; sd: number; an: number }[] = [];
    for (let row = 0; row < 6; row++) {
      let r = 0;
      let gg = 0;
      let b = 0;
      const Ls: number[] = [];
      let ex = 0;
      let ey = 0;
      for (let col = 0; col < 8; col++) {
        // the face (inside the silhouette, above the lip): 16–84% across, 14–76% down the cell
        const x = Math.round((l.board.x + (col + 0.16) * l.cell) * k);
        const y = Math.round((l.board.y + (row + 0.14) * l.cell) * k);
        const w = Math.round(l.cell * 0.68 * k);
        const h = Math.round(l.cell * 0.62 * k);
        const d = g.getImageData(x, y, w, h).data;
        const at = (i: number, j: number) =>
          Lstar(d[(j * w + i) * 4]!, d[(j * w + i) * 4 + 1]!, d[(j * w + i) * 4 + 2]!);
        for (let j = 0; j < h - 1; j++)
          for (let i = 0; i < w - 1; i++) {
            const c = at(i, j);
            ex += Math.abs(at(i + 1, j) - c);
            ey += Math.abs(at(i, j + 1) - c);
          }
        for (let i = 0; i < d.length; i += 4) {
          r += d[i]!;
          gg += d[i + 1]!;
          b += d[i + 2]!;
          Ls.push(Lstar(d[i]!, d[i + 1]!, d[i + 2]!));
        }
      }
      const n = Ls.length;
      const L = Ls.reduce((s, v) => s + v, 0) / n;
      const sd = Math.sqrt(Ls.reduce((s, v) => s + (v - L) ** 2, 0) / n);
      out.push({ rgb: [r / n, gg / n, b / n], L, sd, an: (ex - ey) / (ex + ey) });
    }
    return out;
  });
}

const minPair = (fs: Face[], k?: (typeof KINDS)[number]) => {
  const cs = fs.map((f) => (k ? simulate(f.rgb, k) : f.rgb));
  let m = Infinity;
  for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) m = Math.min(m, deltaE(cs[i]!, cs[j]!));
  return m;
};
const NAMES = ['coral', 'sun', 'kelp', 'lagoon', 'orchid', 'shell'];
const PAIRS = NAMES.flatMap((a, i) => NAMES.slice(i + 1).map((b) => `${a}/${b}`));
/**
 * Greyscale separation of a pair: mean lightness, lightness texture (L* units) and grain direction
 * (anisotropy × 20, so a fully vertical vs isotropic grain counts like 20 L*).
 */
const greyPairs = (fs: Face[]) => {
  const out: number[] = [];
  for (let i = 0; i < 6; i++)
    for (let j = i + 1; j < 6; j++)
      out.push(Math.hypot(fs[i]!.L - fs[j]!.L, fs[i]!.sd - fs[j]!.sd, (fs[i]!.an - fs[j]!.an) * 20));
  return out;
};

for (const scheme of ['light', 'dark'] as const)
  for (const dpr of [1, 2])
    test(`rendered block colours stay apart (${scheme}, dpr ${dpr})`, async ({ browser }) => {
      const ctx = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: dpr,
        colorScheme: scheme,
        reducedMotion: 'reduce',
      });
      const page = await ctx.newPage();
      await boot(page, 'seed=42');
      const reef = await faces(page, 'pebble');
      const flat = await faces(page, 'smooth');
      const hex = LOOKS.pebble!.colors.slice(1).map(hexToRgb);
      const drift = reef.map((f, i) => deltaE(f.rgb, hex[i]!));
      const rg = greyPairs(reef);
      const fg = greyPairs(flat);
      console.log(
        `${scheme} dpr ${dpr}: normal ${minPair(reef).toFixed(1)} ` +
          KINDS.map((k) => `${k} ${minPair(reef, k).toFixed(1)}`).join(' ') +
          ` | drift ${drift.map((d) => d.toFixed(1)).join(' ')}` +
          ` | grey min ${Math.min(...rg).toFixed(1)} ${PAIRS[rg.indexOf(Math.min(...rg))]} (flat look ${Math.min(...fg).toFixed(1)} ${PAIRS[fg.indexOf(Math.min(...fg))]})` +
          ` | L ${reef.map((f) => f.L.toFixed(0)).join(' ')}` +
          ` | sd ${reef.map((f) => f.sd.toFixed(1)).join(' ')} | grain ${reef.map((f) => f.an.toFixed(2)).join(' ')}`,
      );
      for (const k of KINDS) expect(minPair(reef, k), k).toBeGreaterThan(10);
      expect(minPair(reef)).toBeGreaterThan(20);
      for (const d of drift) expect(d).toBeLessThan(15);
      // texture is a second cue: in greyscale every pair is at least as far apart as flat stones
      expect(Math.min(...rg)).toBeGreaterThanOrEqual(Math.min(...fg));
      expect(Math.min(...rg)).toBeGreaterThan(4);
      await ctx.close();
    });
