import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { applyMove, legalMoves, newGame } from '../../src/core/game.ts';
import { Rng } from '../../src/core/rng.ts';
import { decodeGame, encodeGame } from '../../src/core/serialize.ts';

describe('save/load', () => {
  it('round-trips any reachable state (through JSON)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 ** 31 }), fc.integer({ min: 0, max: 60 }), (seed, steps) => {
        let s = newGame(seed);
        const r = new Rng(seed);
        for (let i = 0; i < steps && !s.over; i++) {
          const ms = legalMoves(s);
          s = applyMove(s, ms[r.int(ms.length)]!)!.state;
        }
        const back = decodeGame(JSON.parse(JSON.stringify(encodeGame(s))))!;
        expect(back).not.toBeNull();
        expect(encodeGame(back)).toEqual(encodeGame(s));
        // and the restored game continues identically
        if (!s.over) {
          const m = legalMoves(s)[0]!;
          expect(encodeGame(applyMove(back, m)!.state)).toEqual(encodeGame(applyMove(s, m)!.state));
        }
      }),
      { numRuns: 50 },
    );
  });

  it('rejects corrupted saves', () => {
    const good = encodeGame(newGame(1));
    const bad: unknown[] = [
      null,
      42,
      'x',
      { ...good, v: 2 },
      { ...good, board: good.board.slice(1) },
      { ...good, board: 'z'.repeat(64) },
      { ...good, board: '9'.repeat(64) },
      { ...good, tray: [null, null] },
      { ...good, tray: [{ pieceId: 'nope', color: 1 }, null, null] },
      { ...good, tray: [{ pieceId: 'dot', color: 0 }, null, null] },
      { ...good, score: -1 },
      { ...good, score: 1.5 },
      { ...good, mode: 'arcade' },
      { ...good, tray: [null, null, null] },
      // a board with an unresolved pocket is impossible
      { ...good, board: '00000000' + '00100000' + '01010000' + '00100000' + '0'.repeat(32) },
    ];
    for (const b of bad) expect(decodeGame(b)).toBeNull();
  });

  it('rejects a save from another mode and an inconsistent over flag', () => {
    const good = encodeGame(newGame(1));
    expect(decodeGame(good, 'classic')).not.toBeNull();
    expect(decodeGame(good, 'daily')).toBeNull();
    expect(decodeGame({ ...good, over: true })).toBeNull(); // moves remain on an empty board
  });
});
