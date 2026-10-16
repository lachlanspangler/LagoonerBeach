import { describe, expect, it } from 'vitest';
import { COLORS, DEFAULT_RAMP, TEACHING_TRAY, dealTray, pieceWeights, teachingTray } from '../../src/core/dealer.ts';
import { PIECES, pieceById } from '../../src/core/pieces.ts';
import { Rng } from '../../src/core/rng.ts';
import { emptyBoard, fitsAnywhere, placements, resolvePlacement } from '../../src/core/rules.ts';
import { board } from './helpers.ts';

describe('pieceWeights', () => {
  it('all weights positive and finite at every stage', () => {
    for (const m of [0, 10, 40, 60, 500])
      for (const w of pieceWeights(m)) expect(w > 0 && Number.isFinite(w)).toBe(true);
  });
  it('ramp shifts probability toward large/huge pieces', () => {
    const share = (m: number) => {
      const w = pieceWeights(m);
      const tot = w.reduce((a, b) => a + b, 0);
      return PIECES.reduce((a, p, i) => a + (p.family === 'large' || p.family === 'huge' ? w[i]! : 0), 0) / tot;
    };
    expect(share(0)).toBeLessThan(share(DEFAULT_RAMP.end));
    expect(share(DEFAULT_RAMP.end)).toBeCloseTo(share(DEFAULT_RAMP.end + 1000));
  });
});

describe('dealTray', () => {
  it('is deterministic', () => {
    expect(dealTray(new Rng(5), emptyBoard(), 0)).toEqual(dealTray(new Rng(5), emptyBoard(), 0));
  });
  it('colors are distinct and in range', () => {
    const r = new Rng(1);
    for (let i = 0; i < 200; i++) {
      const t = dealTray(r, emptyBoard(), i);
      expect(new Set(t.map((x) => x.color)).size).toBe(3);
      for (const x of t) expect(x.color >= 1 && x.color <= COLORS).toBe(true);
    }
  });
  it('never deals a dead tray when some piece could fit', () => {
    // only single cells fit here
    const b = board(['#.######', '########', '######.#', '########', '########', '########', '#######.', '########']);
    const r = new Rng(11);
    for (let i = 0; i < 200; i++)
      expect(dealTray(r, b, 100).some((t) => fitsAnywhere(b, pieceById(t.pieceId)))).toBe(true);
  });
});

describe('teaching tray', () => {
  it('lets a player close a loop on the empty board in two moves', () => {
    const t = teachingTray(new Rng(0));
    expect(t.map((x) => x.pieceId)).toEqual([...TEACHING_TRAY]);
    const cup = pieceById(t[0]!.pieceId);
    const lid = pieceById(t[1]!.pieceId);
    const b0 = emptyBoard();
    let found = false;
    for (const [x, y] of placements(b0, cup)) {
      const r1 = resolvePlacement(b0, cup, x, y, 1);
      for (const [lx, ly] of placements(r1.board, lid))
        if (resolvePlacement(r1.board, lid, lx, ly, 2).pockets.length) found = true;
      if (found) break;
    }
    expect(found).toBe(true);
  });
});
