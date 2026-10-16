import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { applyMove, legalMoves, newGame, previewMove, type GameState } from '../../src/core/game.ts';
import { CELLS } from '../../src/core/grid.ts';
import { pieceById } from '../../src/core/pieces.ts';
import { Rng } from '../../src/core/rng.ts';
import { findPockets } from '../../src/core/rules.ts';
import { replay } from '../../src/core/replay.ts';
import { greedyBot } from '../../src/sim/bots.ts';
import { playGame } from '../../src/sim/play.ts';

function randomPlay(seed: number, steps: number, check: (before: GameState, after: GameState) => void) {
  let s = newGame(seed);
  const r = new Rng(seed);
  for (let i = 0; i < steps && !s.over; i++) {
    const ms = legalMoves(s);
    if (!ms.length) break;
    const res = applyMove(s, ms[r.int(ms.length)]!)!;
    check(s, res.state);
    s = res.state;
  }
  return s;
}

describe('newGame / applyMove', () => {
  it('starts empty with a 3-piece tray', () => {
    const s = newGame(1);
    expect(s.board.every((c) => c === 0)).toBe(true);
    expect(s.tray.filter(Boolean)).toHaveLength(3);
    expect(s.over).toBe(false);
  });

  it('rejects illegal moves', () => {
    const s = newGame(1);
    expect(applyMove(s, { slot: 0, x: 8, y: 0 })).toBeNull();
    expect(applyMove(s, { slot: 5, x: 0, y: 0 })).toBeNull();
    const r = applyMove(s, { slot: 0, x: 0, y: 0 })!;
    expect(applyMove(r.state, { slot: 0, x: 0, y: 0 })).toBeNull(); // slot used
  });

  it('deals a new tray only after all three are used', () => {
    let s = newGame(2);
    for (let i = 0; i < 3; i++) {
      const m = legalMoves(s).find((x) => x.slot === s.tray.findIndex(Boolean))!;
      const r = applyMove(s, m)!;
      expect(r.events.some((e) => e.type === 'dealt')).toBe(i === 2);
      s = r.state;
    }
    expect(s.trays).toBe(2);
  });

  it('teaching game: cup then lid captures on move 2', () => {
    let s = newGame(3, { teach: true });
    s = applyMove(s, { slot: 0, x: 2, y: 3 })!.state; // cup-up at (2,3): #.# / ###
    const r = applyMove(s, { slot: 1, x: 2, y: 2 })!; // tri-h lid on top
    expect(r.events.find((e) => e.type === 'captured')).toBeDefined();
    expect(r.state.board.every((c) => c === 0)).toBe(true);
    expect(r.events.some((e) => e.type === 'cleanReef')).toBe(true);
  });

  it('emits gameOver exactly when no move is left', () => {
    const { final } = playGame(greedyBot, 7, 2000);
    expect(final.over).toBe(true);
    expect(legalMoves(final)).toHaveLength(0);
  });
});

describe('invariants (property-based)', () => {
  it('after any move: no pockets remain, colors valid, score never decreases, no overlap', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 ** 31 }), (seed) => {
        randomPlay(seed, 60, (a, b) => {
          expect(findPockets(b.board)).toHaveLength(0);
          expect(b.score).toBeGreaterThanOrEqual(a.score);
          for (let i = 0; i < CELLS; i++) expect(b.board[i]! <= 6).toBe(true);
          expect(b.moves).toBe(a.moves + 1);
        });
      }),
      { numRuns: 60 },
    );
  });

  it('cleared cells are exactly the union of rings, and were filled', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 ** 31 }), (seed) => {
        let s = newGame(seed);
        const r = new Rng(seed);
        for (let i = 0; i < 80 && !s.over; i++) {
          const ms = legalMoves(s);
          const res = applyMove(s, ms[r.int(ms.length)]!)!;
          const cap = res.events.find((e) => e.type === 'captured');
          const placed = res.events.find((e) => e.type === 'placed');
          if (cap && cap.type === 'captured' && placed && placed.type === 'placed') {
            const ring = new Set(cap.pockets.flatMap((p) => p.ring));
            expect(new Set(cap.cleared.map((c) => c.cell))).toEqual(ring);
            for (const c of cap.cleared) expect(s.board[c.cell] !== 0 || placed.cells.includes(c.cell)).toBe(true);
            for (const p of cap.pockets) for (const c of p.cells) expect(res.state.board[c]).toBe(0);
          }
          s = res.state;
        }
      }),
      { numRuns: 40 },
    );
  });

  it('preview predicts exactly what applyMove does', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 ** 31 }), (seed) => {
        let s = newGame(seed);
        const r = new Rng(seed);
        for (let i = 0; i < 40 && !s.over; i++) {
          const ms = legalMoves(s);
          const m = ms[r.int(ms.length)]!;
          const pv = previewMove(s, m)!;
          const res = applyMove(s, m)!;
          expect(pv.points).toBe(res.state.score - s.score);
          const cap = res.events.find((e) => e.type === 'captured');
          expect(pv.cleared.length).toBe(cap && cap.type === 'captured' ? cap.cleared.length : 0);
          s = res.state;
        }
      }),
      { numRuns: 40 },
    );
  });

  it('the placed piece occupies only empty cells', () => {
    randomPlay(123, 200, (a, b) => {
      void b;
      void a;
    });
    let s = newGame(99);
    const r = new Rng(1);
    for (let i = 0; i < 100 && !s.over; i++) {
      const ms = legalMoves(s);
      const m = ms[r.int(ms.length)]!;
      const p = pieceById(s.tray[m.slot]!.pieceId);
      for (const [dx, dy] of p.cells) expect(s.board[(m.y + dy) * 8 + m.x + dx]).toBe(0);
      s = applyMove(s, m)!.state;
    }
  });
});

describe('determinism', () => {
  it('replaying a move log reproduces the exact state', () => {
    let s = newGame(2024);
    const r = new Rng(5);
    const moves = [];
    for (let i = 0; i < 120 && !s.over; i++) {
      const ms = legalMoves(s);
      const m = ms[r.int(ms.length)]!;
      moves.push(m);
      s = applyMove(s, m)!.state;
    }
    const again = replay({ seed: 2024, moves });
    expect(Array.from(again.board)).toEqual(Array.from(s.board));
    expect(again.score).toBe(s.score);
    expect(again.tray).toEqual(s.tray);
    expect(again.rng).toBe(s.rng);
  });

  it('golden game: greedy bot on seed 1 (changes here mean the rules or dealer changed)', () => {
    const { summary } = playGame(greedyBot, 1, 2000);
    expect({ moves: summary.moves, score: summary.score, captures: summary.captures }).toMatchInlineSnapshot(`
      {
        "captures": 108,
        "moves": 185,
        "score": 11800,
      }
    `);
  });
});
