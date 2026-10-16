/**
 * Exhaustive solver for reef puzzles: place every piece (any order, anywhere legal) so that the
 * board ends empty. Memoizes (board, remaining-pieces) states that are known dead ends.
 */
import { CELLS, NB8 } from './grid.ts';
import { pieceById } from './pieces.ts';

import { pieceCells, placements, resolvePlacement, type Board } from './rules.ts';

export interface PuzzleMove {
  readonly piece: number; // index into the puzzle's piece list
  readonly x: number;
  readonly y: number;
}

export interface SolveResult {
  readonly solvable: boolean;
  /** Number of distinct winning (ordered) move sequences found, capped at countLimit. */
  readonly solutions: number;
  readonly nodes: number;
  readonly first: readonly PuzzleMove[] | null;
  /** True if the node limit was hit (result is a lower bound). */
  readonly truncated: boolean;
}

function key(b: Board, mask: number): string {
  let s = '';
  for (let i = 0; i < CELLS; i += 8) {
    let v = 0;
    for (let j = 0; j < 8; j++) v = (v << 1) | (b[i + j] !== 0 ? 1 : 0);
    s += String.fromCharCode(v + 32);
  }
  return s + mask;
}

const isEmpty = (b: Board) => {
  for (let i = 0; i < CELLS; i++) if (b[i] !== 0) return false;
  return true;
};

export function solve(
  board: Board,
  pieces: readonly string[],
  opts: { countLimit?: number; nodeLimit?: number } = {},
): SolveResult {
  const countLimit = opts.countLimit ?? 1;
  const nodeLimit = opts.nodeLimit ?? 5_000_000;
  const ps = pieces.map(pieceById);
  const dead = new Set<string>();
  let nodes = 0;
  let solutions = 0;
  let first: PuzzleMove[] | null = null;
  let truncated = false;
  const path: PuzzleMove[] = [];

  // returns number of solutions found below (for dead-end memo)
  const rec = (b: Board, mask: number): number => {
    if (mask === 0) {
      if (isEmpty(b)) {
        solutions++;
        if (!first) first = [...path];
        return 1;
      }
      return 0;
    }
    const k = key(b, mask);
    if (dead.has(k)) return 0;
    let found = 0;
    const tried = new Set<number>();
    for (let i = 0; i < ps.length; i++) {
      if (!(mask & (1 << i))) continue;
      // identical remaining pieces are interchangeable: only expand the first of each id
      if (tried.has(i)) continue;
      for (let j = i + 1; j < ps.length; j++) if (mask & (1 << j) && pieces[j] === pieces[i]) tried.add(j);
      for (const [x, y] of placements(b, ps[i]!)) {
        if (++nodes > nodeLimit) {
          truncated = true;
          return found;
        }
        const r = resolvePlacement(b, ps[i]!, x, y, 1);
        path.push({ piece: i, x, y });
        found += rec(r.board, mask & ~(1 << i));
        path.pop();
        if (solutions >= countLimit || truncated) return found;
      }
    }
    if (found === 0) dead.add(k);
    return found;
  };
  rec(board, (1 << ps.length) - 1);
  return { solvable: solutions > 0, solutions, nodes, first, truncated };
}

export type Tier = 'calm' | 'tricky' | 'deep' | 'abyss';

export interface Grade {
  /**
   * Winning ÷ plausible first moves, where plausible = the piece touches the existing reef
   * (8-neighborhood). Humans start next to the pebbles, so this tracks felt difficulty far better
   * than counting placements in open water.
   */
  readonly safeFirst: number;
  readonly firstMoves: number;
  readonly winningFirst: number;
  /** Solutions found (capped). */
  readonly solutions: number;
  /** Whether the first found solution needs a cascade. */
  readonly cascade: boolean;
  readonly score: number;
}

function touchesReef(b: Board, cells: readonly number[]): boolean {
  for (const c of cells) for (const nb of NB8[c]!) if (b[nb] !== 0) return true;
  return false;
}

/** Difficulty from the solver (never guessed). Higher score = harder. */
export function grade(board: Board, pieces: readonly string[], cap = 200): Grade {
  const ps = pieces.map(pieceById);
  let firstMoves = 0;
  let winningFirst = 0;
  const seenId = new Set<string>();
  for (let i = 0; i < ps.length; i++) {
    if (seenId.has(pieces[i]!)) continue;
    seenId.add(pieces[i]!);
    const rest = pieces.filter((_, j) => j !== i);
    for (const [x, y] of placements(board, ps[i]!)) {
      if (!touchesReef(board, pieceCells(ps[i]!, x, y))) continue;
      firstMoves++;
      const r = resolvePlacement(board, ps[i]!, x, y, 1);
      if (rest.length === 0 ? isEmpty(r.board) : solve(r.board, rest).solvable) winningFirst++;
    }
  }
  const all = solve(board, pieces, { countLimit: cap });
  let cascade = false;
  if (all.first) {
    let b = board;
    for (const m of all.first) {
      const r = resolvePlacement(b, ps[m.piece]!, m.x, m.y, 1);
      if (r.waves.length > 1) cascade = true;
      b = r.board;
    }
  }
  const safeFirst = firstMoves ? winningFirst / firstMoves : 0;
  const score = Math.round(
    100 * (1 - safeFirst) +
      10 * Math.log2(1 + cap / Math.max(1, all.solutions)) +
      8 * pieces.length +
      (cascade ? 12 : 0),
  );
  return { safeFirst, firstMoves, winningFirst, solutions: all.solutions, cascade, score };
}

/** Tier by rank within a pack (solver score order), so every pack spans the full ladder. */
export function tierForRank(rank: number, total: number): Tier {
  const q = rank / Math.max(1, total);
  return q < 0.25 ? 'calm' : q < 0.55 ? 'tricky' : q < 0.85 ? 'deep' : 'abyss';
}
