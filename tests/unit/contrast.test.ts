/**
 * Design tokens (UI_DESIGN §3, §10): every text/background pair the UI uses meets WCAG AA (4.5:1
 * normal text, 3:1 large/bold text and meaningful graphics), in Day and Night; and the CSS
 * variables in src/ui/style.css match the TS mirror in src/render/theme.ts (one source of truth
 * for DOM and canvas).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrast } from '../../src/render/color.ts';
import { CSS_VARS, DAY, NIGHT, type Palette } from '../../src/render/theme.ts';
import { TITLE_COLORS } from '../../src/ui/titleScene.ts';

/** Flatten an rgba() over a hex background to a hex (what the eye sees). */
function over(fg: string, bg: string): string {
  const m = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/.exec(fg.replace(/\s/g, ''));
  if (!m) return fg;
  const a = Number(m[4]);
  const b = parseInt(bg.slice(1), 16);
  const ch = (i: number, sh: number) => Math.round(Number(m[i]) * a + ((b >> sh) & 255) * (1 - a));
  return '#' + [ch(1, 16), ch(2, 8), ch(3, 0)].map((v) => v.toString(16).padStart(2, '0')).join('');
}

/** [label, foreground, background, minimum] for one theme. */
function pairs(p: Palette): [string, string, string, number][] {
  const tint = over(p.accentTint, p.surface);
  const goldTint = over(p.goldTint, p.surface);
  return [
    // body and titles
    ['ink / bg', p.text, p.bg, 4.5],
    ['ink / surface', p.text, p.surface, 4.5],
    ['ink / surface.sunk (rows, mode cards)', p.text, p.surfaceSunk, 4.5],
    // secondary text: the old #8A7B69 was 3.53:1
    ['ink.2 / bg (HUD best line, tier line)', p.textDim, p.bg, 4.5],
    ['ink.2 / surface (labels, captions)', p.textDim, p.surface, 4.5],
    ['ink.2 / surface.sunk (row subtitles, reef chip)', p.textDim, p.surfaceSunk, 4.5],
    // the one accent: links, chip text, strip chips, "+N" peek on its halo
    ['accent / surface (links, strip chips)', p.accent, p.surface, 4.5],
    ['accent / bg', p.accent, p.bg, 4.5],
    ['accent / accent.tint (chips, current mode)', p.accent, tint, 4.5],
    ['ink / accent.tint (your row)', p.text, tint, 4.5],
    ['on-accent / accent (primary buttons)', p.onAccent, p.accent, 4.5],
    // gold is for records and rank 1 only
    ['gold.ink / gold.tint (NEW HIGH SCORE ribbon, best chip)', p.goldInk, goldTint, 4.5],
    ['gold.ink / bg (HUD NEW BEST)', p.goldInk, p.bg, 4.5],
    ['danger / surface (erase, errors)', p.danger, p.surface, 4.5],
    // non-text: focus rings, switch tracks, segment fills are the accent; 3:1 against what they sit on
    ['accent / surface.sunk (switch on, focus ring)', p.accent, p.surfaceSunk, 3],
    ['hint outline (accent) / board cell', p.name === 'night' ? p.waterHi : p.accent, p.cell, 3],
  ];
}

describe('text contrast (tokens)', () => {
  for (const p of [DAY, NIGHT])
    for (const [label, fg, bg, min] of pairs(p))
      it(`${p.name}: ${label} ≥ ${min}`, () => {
        expect(contrast(over(fg, bg), bg)).toBeGreaterThanOrEqual(min);
      });

  // the title screen (ADR 0015): wordmark and tagline on the sky, the pills over the sea
  it('title: wordmark, tagline and pills stay AA on every stop of the scene', () => {
    const css = readFileSync('src/ui/style.css', 'utf8');
    const pill = (sel: string) => new RegExp(`${sel} \\{[^}]*?background: (rgba\\([^)]+\\))`).exec(css)![1]!;
    const pills = { day: pill('\\.t-pill'), night: pill("html\\[data-theme='night'\\] \\.t-pill") };
    for (const p of [DAY, NIGHT]) {
      const k = TITLE_COLORS[p.name === 'night' ? 'night' : 'day'];
      for (const sky of k.sky) {
        expect(contrast(p.text, sky), `${p.name} wordmark on ${sky}`).toBeGreaterThanOrEqual(4.5);
        expect(contrast(p.textDim, sky), `${p.name} tagline on ${sky}`).toBeGreaterThanOrEqual(4.5);
      }
      for (const sea of [...k.sea, ...k.sky]) {
        const bg = over(pills[p.name === 'night' ? 'night' : 'day'], sea);
        expect(contrast(p.text, bg), `${p.name} pill over ${sea}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('water cyan is never small text on light (it is material): 1.9:1 by day', () => {
    expect(contrast(DAY.water, DAY.surface)).toBeLessThan(3);
  });

  it('prints the table', () => {
    const rows: string[] = [];
    for (const p of [DAY, NIGHT])
      for (const [label, fg, bg] of pairs(p))
        rows.push(`${p.name.padEnd(5)} ${contrast(over(fg, bg), bg).toFixed(2).padStart(6)}  ${label}`);
    console.log('\n' + rows.join('\n'));
  });
});

describe('CSS tokens mirror theme.ts', () => {
  const css = readFileSync('src/ui/style.css', 'utf8');
  const block = (sel: string) => {
    const i = css.indexOf(sel);
    expect(i, sel).toBeGreaterThanOrEqual(0);
    return css.slice(i, css.indexOf('\n}', i));
  };
  const norm = (v: string) => v.replace(/\s/g, '').toLowerCase();
  const read = (src: string, name: string) => new RegExp(`${name}:\\s*([^;]+);`).exec(src)?.[1];
  for (const [theme, p, src] of [
    ['day', DAY, block(':root {')],
    ['night', NIGHT, block("html[data-theme='night'] {")],
  ] as const)
    it(`${theme}: every mapped variable equals the palette`, () => {
      for (const [field, name] of Object.entries(CSS_VARS)) {
        const v = read(src, name!);
        expect(v, `${name} in ${theme}`).toBeDefined();
        expect(norm(v!), `${name} (${field})`).toBe(norm(String(p[field as keyof Palette])));
      }
    });
});
