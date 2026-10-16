import { describe, expect, it } from 'vitest';
import { PIECES } from '../../src/core/pieces.ts';
import { computeLayout, trayCellFor } from '../../src/render/layout.ts';

const SIZES = [
  [320, 568],
  [375, 667],
  [390, 844],
  [412, 915],
  [430, 932],
  [820, 1180],
  [1024, 768],
];

describe('layout', () => {
  it.each(SIZES)('%ix%i: every piece fits inside its tray slot and on screen', (w, h) => {
    const l = computeLayout(w, h);
    for (const p of PIECES) {
      const c = trayCellFor(l, p);
      for (const s of l.slots) {
        const x0 = s.cx - (p.w * c) / 2;
        const y0 = s.cy - (p.h * c) / 2;
        expect(x0, `${p.id} left`).toBeGreaterThanOrEqual(s.cx - s.w / 2);
        expect(x0 + p.w * c, `${p.id} right`).toBeLessThanOrEqual(s.cx + s.w / 2);
        expect(x0).toBeGreaterThanOrEqual(0);
        expect(x0 + p.w * c).toBeLessThanOrEqual(w);
        expect(y0 + p.h * c).toBeLessThanOrEqual(h);
      }
    }
  });
  it.each(SIZES)('%ix%i: board, HUD and tray stack without overlap', (w, h) => {
    const l = computeLayout(w, h);
    expect(l.board.y).toBeGreaterThanOrEqual(l.hud.y + l.hud.h - 1);
    expect(l.tray.y).toBeGreaterThan(l.board.y + l.board.h);
    expect(l.tray.y + l.tray.h).toBeLessThanOrEqual(h + 1);
  });
});
