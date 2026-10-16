/**
 * Constructive reef-puzzle generator: pick lagoons, take their rings, carve catalog pieces out of
 * the ring, leave the rest as the starting reef. Every candidate must pass the solver before use.
 */
import { CELLS, N, NB4, NB8 } from './grid.ts';
import { PIECES, type Piece } from './pieces.ts';
import { Rng } from './rng.ts';
import { findPockets, type Board } from './rules.ts';
import { grade, solve, type Grade, type PuzzleMove, type Tier } from './solver.ts';

export interface Puzzle {
  readonly id: string;
  /** 64 chars, '0' empty or color digit. */
  readonly board: string;
  readonly pieces: readonly string[];
  readonly solution: readonly PuzzleMove[];
  readonly grade: Grade;
  readonly lagoons: number;
  readonly tier?: Tier;
}

export interface GenParams {
  readonly lagoons: number;
  readonly pieces: number;
  /** Double-thick wall around a single lagoon, so the solution cascades. */
  readonly thick?: boolean;
  /** Minimum pebbles on the starting reef (tiny reefs are dull). */
  readonly minPebbles?: number;
}

const CARVABLE = PIECES.filter((p) => p.size >= 2 && p.size <= 6);

/** Color each connected chunk of reef (8-connected) with one pebble color, neighbors differing. */
function colorChunks(b: Board, rng: Rng): void {
  let next = 1 + rng.int(6);
  for (let c = 0; c < CELLS; c++) {
    if (b[c] !== 9) continue;
    const stack = [c];
    b[c] = next;
    while (stack.length) {
      const k = stack.pop()!;
      for (const nb of NB4[k]!)
        if (b[nb] === 9) {
          b[nb] = next;
          stack.push(nb);
        }
    }
    next = (next % 6) + 1;
  }
}

export function boardToString(b: Board): string {
  return Array.from(b, (c) => String(c)).join('');
}

export function boardFromString(s: string): Board {
  return Uint8Array.from(s, (ch) => Number(ch));
}

/** One generation attempt; null if the construction failed or the solver rejects it. */
export function generatePuzzle(seed: number, p: GenParams): Puzzle | null {
  const rng = new Rng(seed);
  const lagoon = new Uint8Array(CELLS);
  const ring = new Uint8Array(CELLS);
  let made = 0;
  for (let tries = 0; tries < 30 && made < p.lagoons; tries++) {
    const w = 1 + rng.int(3);
    const h = 1 + rng.int(2);
    const x0 = 1 + rng.int(N - 2 - w + 1);
    const y0 = 1 + rng.int(N - 2 - h + 1);
    const cells: number[] = [];
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) cells.push(y * N + x);
    // optional bump for irregular lagoons
    if (rng.next() < 0.35) {
      const c = cells[rng.int(cells.length)]!;
      const opts = [c - 1, c + 1, c - N, c + N].filter((k) => {
        const x = k % N;
        const y = (k / N) | 0;
        return k >= 0 && k < CELLS && x > 0 && y > 0 && x < N - 1 && y < N - 1 && !cells.includes(k);
      });
      if (opts.length) cells.push(opts[rng.int(opts.length)]!);
    }
    if (cells.some((c) => ring[c] || lagoon[c])) continue;
    // ring must not swallow another lagoon's water
    const rc = new Set<number>();
    for (const c of cells) for (const nb of NB8[c]!) if (!cells.includes(nb)) rc.add(nb);
    if ([...rc].some((c) => lagoon[c])) continue;
    for (const c of cells) lagoon[c] = 1;
    for (const c of rc) ring[c] = 1;
    made++;
  }
  if (made < p.lagoons) return null;
  if (p.thick) {
    // second wall: ring of (lagoon ∪ first ring); everything inside it must stay off the border
    const inner = new Set<number>();
    for (let c = 0; c < CELLS; c++) if (lagoon[c] || ring[c]) inner.add(c);
    for (const c of inner) {
      const x = c % N;
      const y = (c / N) | 0;
      if (x === 0 || y === 0 || x === N - 1 || y === N - 1) return null;
    }
    for (const c of inner) for (const nb of NB8[c]!) if (!inner.has(nb)) ring[nb] = 1;
  }

  // carve pieces out of the ring
  const carved = new Uint8Array(CELLS);
  const chosen: { piece: Piece; x: number; y: number }[] = [];
  for (let k = 0; k < p.pieces; k++) {
    let ok = false;
    for (let t = 0; t < 400 && !ok; t++) {
      const pc = CARVABLE[rng.int(CARVABLE.length)]!;
      const x = rng.int(N - pc.w + 1);
      const y = rng.int(N - pc.h + 1);
      const cells = pc.cells.map(([dx, dy]) => (y + dy) * N + x + dx);
      if (cells.every((c) => ring[c] && !carved[c])) {
        for (const c of cells) carved[c] = 1;
        chosen.push({ piece: pc, x, y });
        ok = true;
      }
    }
    if (!ok) return null;
  }
  const board = new Uint8Array(CELLS);
  for (let c = 0; c < CELLS; c++) if (ring[c] && !carved[c]) board[c] = 9; // placeholder, colored below
  colorChunks(board, rng);
  let filled = 0;
  for (let c = 0; c < CELLS; c++) if (board[c]) filled++;
  if (filled < (p.minPebbles ?? 4)) return null;
  if (findPockets(board).length) return null;
  const pieces = chosen.map((c) => c.piece.id);
  const s = solve(board, pieces);
  if (!s.solvable || !s.first) return null;
  return { id: '', board: boardToString(board), pieces, solution: s.first, grade: grade(board, pieces), lagoons: made };
}
