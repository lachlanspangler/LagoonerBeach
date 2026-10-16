/** Text contrast for every text/background pairing the UI uses (WCAG AA: 4.5 normal, 3 large/bold UI). */
import { describe, expect, it } from 'vitest';
import { contrast } from '../../src/render/color.ts';
import { DAY, NIGHT } from '../../src/render/theme.ts';

// CSS panel colours from src/ui/style.css
const PANEL = { day: '#FFFAF2', night: '#142636' };
const ACCENT = { day: '#2673BD', night: '#2A78C2' }; // keep in sync with --accent in style.css
const INK = { day: '#1A86AC', night: NIGHT.waterHi }; // points, chips, callouts

describe('text contrast', () => {
  for (const [name, p] of [
    ['day', DAY],
    ['night', NIGHT],
  ] as const) {
    it(`${name}: score and body text on the background and panels ≥ 4.5`, () => {
      expect(contrast(p.text, p.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.text, PANEL[name])).toBeGreaterThanOrEqual(4.5);
    });
    it(`${name}: secondary (dim) labels ≥ 3 (large/bold UI text)`, () => {
      expect(contrast(p.textDim, p.bg)).toBeGreaterThanOrEqual(3);
      expect(contrast(p.textDim, PANEL[name])).toBeGreaterThanOrEqual(3);
    });
    it(`${name}: points/chips ink on background and panels ≥ 3`, () => {
      expect(contrast(INK[name], p.bg)).toBeGreaterThanOrEqual(3);
      expect(contrast(INK[name], PANEL[name])).toBeGreaterThanOrEqual(3);
    });
    it(`${name}: white on the primary button ≥ 4.5`, () => {
      expect(contrast('#FFFFFF', ACCENT[name])).toBeGreaterThanOrEqual(4.5);
    });
  }
  it('prints the table', () => {
    const rows: string[] = [];
    for (const [name, p] of [
      ['day', DAY],
      ['night', NIGHT],
    ] as const)
      rows.push(
        `${name}: text/bg ${contrast(p.text, p.bg).toFixed(2)} dim/bg ${contrast(p.textDim, p.bg).toFixed(2)} dim/panel ${contrast(p.textDim, PANEL[name]).toFixed(2)} ink/bg ${contrast(INK[name], p.bg).toFixed(2)} white/accent ${contrast('#FFFFFF', ACCENT[name]).toFixed(2)}`,
      );
    console.log('\n' + rows.join('\n'));
  });
});
