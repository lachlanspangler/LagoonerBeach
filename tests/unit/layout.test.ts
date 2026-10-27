import { describe, expect, it } from 'vitest';
import { PIECES } from '../../src/core/pieces.ts';
import { CAP, computeLayout, hudStack, trayCellFor } from '../../src/render/layout.ts';

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
  it.each(SIZES)('%ix%i: the strip sits between board and tray, room for a chip', (w, h) => {
    const l = computeLayout(w, h);
    expect(l.strip.y).toBe(l.board.y + l.board.h);
    expect(l.strip.h).toBeGreaterThanOrEqual(l.cell * 0.85);
    // it may reach into the tray's empty top band, never past the middle of the tray
    expect(l.strip.y + l.strip.h).toBeLessThanOrEqual(l.tray.y + l.tray.h / 2);
  });
  it.each(SIZES)('%ix%i: no dead band under the hand (UI_DESIGN §9.1)', (w, h) => {
    const l = computeLayout(w, h);
    // empty sand below the tray block is at most ~1.25 cells (+ the margin)
    expect(h - (l.tray.y + l.tray.h)).toBeLessThanOrEqual(l.cell * 1.25 + 16);
    // the hand sits in the lower part of the screen (thumb zone)
    expect(l.slots[0]!.cy / h).toBeGreaterThan(w > h ? 0.7 : 0.72);
  });
  it('notched phones: everything stays inside the safe area', () => {
    const inset = { top: 59, right: 0, bottom: 34, left: 0 };
    for (const [w, h] of [
      [393, 852],
      [430, 932],
      [375, 812],
    ] as const) {
      const l = computeLayout(w, h, inset);
      expect(l.hud.y).toBe(inset.top);
      expect(l.tray.y + l.tray.h).toBeLessThanOrEqual(h - inset.bottom + 1);
      expect(l.cell).toBeGreaterThanOrEqual(40);
    }
    // landscape phone with side notches
    const l = computeLayout(852, 393, { top: 0, right: 59, bottom: 21, left: 59 });
    expect(l.board.x).toBeGreaterThanOrEqual(59);
    expect(l.board.x + l.board.w).toBeLessThanOrEqual(852 - 59);
    expect(l.tray.y + l.tray.h).toBeLessThanOrEqual(393 - 21 + 1);
  });
  it.each(SIZES.flatMap(([w, h]) => [1, 1.25].map((ts) => [w!, h!, ts] as const)))(
    '%ix%i text ×%s: score, best line and a ×20 COMBO badge stack without overlap, clear of the board',
    (w, h, ts) => {
      const l = computeLayout(w, h, { top: 6, right: 0, bottom: 0, left: 0 });
      const s = hudStack(l, ts);
      const score = [s.scoreY - s.big * CAP, s.scoreY + s.big * 0.12]; // the comma hangs below
      const best = [s.bestY - s.lab * CAP, s.bestY];
      const badge = [s.badgeY - s.badgeHalf, s.badgeY + s.badgeHalf];
      expect(score[0]!).toBeGreaterThanOrEqual(l.hud.y);
      expect(best[0]! - score[1]!, 'score → best').toBeGreaterThanOrEqual(1.5);
      expect(badge[0]! - best[1]!, 'best → badge').toBeGreaterThanOrEqual(2);
      expect(l.board.y - badge[1]!, 'badge → board').toBeGreaterThanOrEqual(4);
      // the score stays the hero: never smaller than ~2.5× the best line
      expect(s.big).toBeGreaterThanOrEqual(s.lab * 2.4);
    },
  );
});
