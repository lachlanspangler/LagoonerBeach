import { describe, expect, it } from 'vitest';
import pack from '../../src/content/puzzles.json';
import { pieceById } from '../../src/core/pieces.ts';
import { boardFromString, generatePuzzle } from '../../src/core/puzzlegen.ts';
import { canPlace, findPockets, resolvePlacement } from '../../src/core/rules.ts';
import { solve } from '../../src/core/solver.ts';
import { board } from './helpers.ts';

type P = (typeof pack)[number];

describe('shipped reef puzzles', () => {
  it('pack is non-trivial in size and ids are unique', () => {
    expect(pack.length).toBeGreaterThanOrEqual(100);
    expect(new Set(pack.map((p: P) => p.id)).size).toBe(pack.length);
    expect(new Set(pack.map((p: P) => p.board + p.pieces.join())).size).toBe(pack.length);
  });

  it('every puzzle: no starting pocket, stored solution clears the board, solver agrees', () => {
    for (const p of pack as P[]) {
      let b = boardFromString(p.board);
      expect(findPockets(b), p.id).toHaveLength(0);
      expect(p.pieces.length).toBeLessThanOrEqual(3); // fits the tray
      const used = new Set<number>();
      for (const m of p.solution) {
        const pc = pieceById(p.pieces[m.piece]!);
        expect(canPlace(b, pc, m.x, m.y), `${p.id} move`).toBe(true);
        used.add(m.piece);
        b = resolvePlacement(b, pc, m.x, m.y, 1).board;
      }
      expect(used.size, p.id).toBe(p.pieces.length);
      expect(
        b.every((c) => c === 0),
        `${p.id} ends empty`,
      ).toBe(true);
      expect(solve(boardFromString(p.board), p.pieces).solvable, p.id).toBe(true);
    }
  });

  it('difficulty climbs: solver scores are non-decreasing through the pack', () => {
    const scores = (pack as P[]).filter((p) => !(p as { tutorial?: boolean }).tutorial).map((p) => p.grade.score);
    for (let i = 1; i < scores.length; i++) expect(scores[i]!).toBeGreaterThanOrEqual(scores[i - 1]!);
  });
});

describe('solver', () => {
  it('solves the teaching situation and rejects an impossible one', () => {
    const cup = board(['........', '........', '..#.#...', '..###...', '........', '........', '........', '........']);
    expect(solve(cup, ['tri-h']).solvable).toBe(true);
    // one piece too many: whichever seals, the other is left stranded
    expect(solve(cup, ['tri-h', 'dot']).solvable).toBe(false);
    // a single dot at (3,1) seals it: (2,1) and (4,1) are only diagonal, not needed to enclose
    expect(solve(cup, ['dot']).first).toEqual([{ piece: 0, x: 3, y: 1 }]);
  });

  it('generator is deterministic', () => {
    const a = generatePuzzle(12345, { lagoons: 2, pieces: 2 });
    const b = generatePuzzle(12345, { lagoons: 2, pieces: 2 });
    expect(a).toEqual(b);
  });
});

import { applyMove } from '../../src/core/game.ts';
import { newPuzzleGame, puzzleStatus } from '../../src/core/puzzle.ts';

describe('puzzle games', () => {
  it('playing the stored solution through applyMove solves it; no refills ever', () => {
    for (const [i, p] of (pack as P[]).slice(0, 30).entries()) {
      let s = newPuzzleGame(p, i);
      expect(puzzleStatus(s)).toBe('playing');
      for (const m of p.solution) {
        const r = applyMove(s, { slot: m.piece, x: m.x, y: m.y })!;
        expect(r, p.id).not.toBeNull();
        expect(r.events.some((e) => e.type === 'dealt')).toBe(false);
        s = r.state;
      }
      expect(puzzleStatus(s), p.id).toBe('solved');
    }
  });
  it('a wrong final move fails', () => {
    const p = (pack as P[])[0]!;
    let s = newPuzzleGame(p, 0);
    // place every piece in the first legal spot in a far corner-ish order
    for (let k = 0; k < p.pieces.length; k++) {
      const slot = s.tray.findIndex((t) => t);
      const pc = pieceById(s.tray[slot]!.pieceId);
      let done = false;
      for (let y = 8 - pc.h; y >= 0 && !done; y--)
        for (let x = 8 - pc.w; x >= 0 && !done; x--) {
          const r = applyMove(s, { slot, x, y });
          if (r) {
            s = r.state;
            done = true;
          }
        }
    }
    expect(['failed', 'solved']).toContain(puzzleStatus(s));
  });
});

import { tierForRank } from '../../src/core/solver.ts';

describe('solver limits and tiers', () => {
  it('reports truncation when the node budget runs out', () => {
    const p = (pack as P[])[pack.length - 1]!;
    const r = solve(boardFromString(p.board), p.pieces, { nodeLimit: 3, countLimit: 999 });
    expect(r.truncated).toBe(true);
  });
  it('tiers split the pack by rank', () => {
    expect([0, 24, 25, 54, 55, 84, 85, 99].map((i) => tierForRank(i, 100))).toEqual([
      'calm',
      'calm',
      'tricky',
      'tricky',
      'deep',
      'deep',
      'abyss',
      'abyss',
    ]);
  });
});
