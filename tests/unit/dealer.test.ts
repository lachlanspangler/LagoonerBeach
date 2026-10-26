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

import { applyMove, legalMoves, newGame } from '../../src/core/game.ts';
import { trayClearable } from '../../src/core/dealer.ts';
import fc from 'fast-check';

/** Independent brute force: try all orders explicitly (no dedupe, no early tricks). */
function bruteClearable(b: Uint8Array, ids: string[]): boolean {
  if (!ids.length) return true;
  return ids.some((id, i) =>
    placements(b, pieceById(id)).some(([x, y]) =>
      bruteClearable(
        resolvePlacement(b, pieceById(id), x, y, 1).board,
        ids.filter((_, j) => j !== i),
      ),
    ),
  );
}

describe('always-a-solution guarantee', () => {
  it('every tray dealt during random play can be fully placed (checked by independent brute force)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 ** 31 }), (seed) => {
        let s = newGame(seed);
        const r = new Rng(seed);
        for (let i = 0; i < 120 && !s.over; i++) {
          const ms = legalMoves(s);
          const res = applyMove(s, ms[r.int(ms.length)]!)!;
          const dealt = res.events.find((e) => e.type === 'dealt');
          if (dealt && dealt.type === 'dealt' && res.state.board.some((c) => c === 0)) {
            const ids = dealt.tray.map((t) => t.pieceId);
            // On a nearly full board no three pieces fit at all (not even three dots, the smallest
            // piece): then the promise is only that one dealt piece fits (seed 921857515).
            if (bruteClearable(res.state.board, ['dot', 'dot', 'dot']))
              expect(bruteClearable(res.state.board, ids)).toBe(true);
            else expect(ids.some((id) => placements(res.state.board, pieceById(id)).length > 0)).toBe(true);
          }
          s = res.state;
        }
      }),
      { numRuns: 25, examples: [[921857515]] }, // the nearly-full-board case, always checked
    );
  });

  it('the constructive fallback guarantees a tray on a nearly full board', () => {
    const b = board(['#.######', '########', '######.#', '########', '###..###', '########', '#######.', '########']);
    const r = new Rng(3);
    for (let i = 0; i < 100; i++) {
      const t = dealTray(r, b, 200);
      expect(
        trayClearable(
          b,
          t.map((x) => pieceById(x.pieceId)),
        ),
      ).toBe(true);
    }
  });

  it('when only part of a tray can be placed, at least one dealt piece still fits', () => {
    // one border cell free: a dot fits, and after it nothing does
    const b = board(['.#######', '########', '########', '########', '########', '########', '########', '########']);
    const r = new Rng(11);
    for (let i = 0; i < 100; i++) {
      const t = dealTray(r, b, 200);
      expect(t.some((x) => fitsAnywhere(b, pieceById(x.pieceId)))).toBe(true);
    }
  });

  it('trayClearable agrees with brute force on random positions', () => {
    const r = new Rng(77);
    let s = newGame(77);
    for (let i = 0; i < 40 && !s.over; i++) {
      const ms = legalMoves(s);
      s = applyMove(s, ms[r.int(ms.length)]!)!.state;
      const ids = ['tri-h', 'square', 'cup-up', 'block', 'pent-v', 'dot'];
      const pick = [ids[r.int(6)]!, ids[r.int(6)]!, ids[r.int(6)]!];
      expect(trayClearable(s.board, pick.map(pieceById))).toBe(bruteClearable(s.board, pick));
    }
  });
});
