/**
 * Bitboard reef solver + grader: the same search as `solver.ts` (`solve` + `grade`), but on two
 * uint32 words with a memo of *counts* shared across the whole tree, and a hard node budget.
 * Used by the endless generator, where grading must be cheap (thousands of candidates, on a phone).
 *
 * Semantics match the exhaustive grader exactly (tested on every shipped reef):
 * - moves expand pieces in index order, only the first of identical remaining ids, placements y-major;
 * - `solutions` = ordered winning sequences, capped at `cap`;
 * - `firstMoves` = first placements touching the reef (8-neighborhood), per distinct piece id.
 * Integer-only (no floats), so every device grades every candidate identically.
 */
import { N } from './grid.ts';
import { pieceById, type Piece } from './pieces.ts';
import type { Board } from './rules.ts';
import type { PuzzleMove } from './solver.ts';

/** A 64-cell set: bit i of lo = cell i (i < 32), bit i-32 of hi = cell i (i ≥ 32). */
interface Placement {
  readonly x: number;
  readonly y: number;
  readonly lo: number;
  readonly hi: number;
  /** 8-neighborhood of the piece (excluding the piece itself). */
  readonly nlo: number;
  readonly nhi: number;
}

const COL0 = 0x01010101;
const COL7 = 0x80808080;
const BORDER_LO = 0x000000ff | COL0 | COL7; // row 0 + side columns of rows 0..3
const BORDER_HI = (0xff000000 | COL0 | COL7) >>> 0; // row 7 + side columns of rows 4..7

// Dilations write into these (no allocation in the hot loop).
let dLo = 0;
let dHi = 0;
/** 4-neighborhood dilation (including the set itself). */
function dil4(lo: number, hi: number): void {
  const l = lo | ((lo << 1) & ~COL0) | ((lo >>> 1) & ~COL7) | (lo << 8) | (lo >>> 8) | (hi << 24);
  const h = hi | ((hi << 1) & ~COL0) | ((hi >>> 1) & ~COL7) | (hi << 8) | (lo >>> 24) | (hi >>> 8);
  dLo = l >>> 0;
  dHi = h >>> 0;
}
/** 8-neighborhood dilation (including the set itself). */
function dil8(lo: number, hi: number): void {
  const hl = lo | ((lo << 1) & ~COL0) | ((lo >>> 1) & ~COL7);
  const hh = hi | ((hi << 1) & ~COL0) | ((hi >>> 1) & ~COL7);
  dLo = (hl | (hl << 8) | (hl >>> 8) | (hh << 24)) >>> 0;
  dHi = (hh | (hh << 8) | (hl >>> 24) | (hh >>> 8)) >>> 0;
}

// resolve() output
let rLo = 0;
let rHi = 0;
let rWaves = 0;
/** Captures until stable (same rule as `resolvePlacement`): sets rLo/rHi (filled) and rWaves. */
function resolve(lo: number, hi: number): void {
  let waves = 0;
  for (;;) {
    const eLo = ~lo >>> 0;
    const eHi = ~hi >>> 0;
    // empty cells reachable from the border through empty cells
    let aLo = eLo & BORDER_LO;
    let aHi = eHi & BORDER_HI;
    for (;;) {
      dil4(aLo, aHi);
      const nLo = dLo & eLo;
      const nHi = dHi & eHi;
      if (nLo === aLo && nHi === aHi) break;
      aLo = nLo;
      aHi = nHi;
    }
    const pLo = eLo & ~aLo;
    const pHi = eHi & ~aHi;
    if (pLo === 0 && pHi === 0) break;
    dil8(pLo, pHi);
    lo = (lo & ~dLo) >>> 0;
    hi = (hi & ~dHi) >>> 0;
    waves++;
  }
  rLo = lo;
  rHi = hi;
  rWaves = waves;
}

const PLACEMENTS = new Map<string, Placement[]>();
function placementsOf(p: Piece): Placement[] {
  let out = PLACEMENTS.get(p.id);
  if (out) return out;
  out = [];
  for (let y = 0; y <= N - p.h; y++)
    for (let x = 0; x <= N - p.w; x++) {
      let lo = 0;
      let hi = 0;
      for (const [dx, dy] of p.cells) {
        const c = (y + dy) * N + x + dx;
        if (c < 32) lo |= 1 << c;
        else hi |= 1 << (c - 32);
      }
      lo >>>= 0;
      hi >>>= 0;
      dil8(lo, hi);
      out.push({ x, y, lo, hi, nlo: (dLo & ~lo) >>> 0, nhi: (dHi & ~hi) >>> 0 });
    }
  PLACEMENTS.set(p.id, out);
  return out;
}

export function toBits(b: Board): [number, number] {
  let lo = 0;
  let hi = 0;
  for (let c = 0; c < 64; c++)
    if (b[c] !== 0) {
      if (c < 32) lo |= 1 << c;
      else hi |= 1 << (c - 32);
    }
  return [lo >>> 0, hi >>> 0];
}

export interface FastGrade {
  readonly solvable: boolean;
  /** Ordered winning sequences, capped at `cap`. */
  readonly solutions: number;
  readonly firstMoves: number;
  readonly winningFirst: number;
  /** Every solution needs a cascade (no plain path). */
  readonly cascadeRequired: boolean;
  /** The first solution (DFS order) needs a cascade — same flag as `grade().cascade`. */
  readonly cascade: boolean;
  /** First solution in DFS order (identical to `solve().first`). */
  readonly first: readonly PuzzleMove[] | null;
  /** Placements expanded. */
  readonly nodes: number;
  /** Node budget hit: nothing above is reliable. */
  readonly truncated: boolean;
}

/** Solve and grade in one memoized pass. Integer-only; deterministic for a given input. */
export function fastGrade(
  board: Board,
  pieces: readonly string[],
  opts: { cap?: number; nodeLimit?: number } = {},
): FastGrade {
  const cap = opts.cap ?? 200;
  const nodeLimit = opts.nodeLimit ?? 400_000;
  const ps = pieces.map((id) => placementsOf(pieceById(id)));
  const n = ps.length;
  if (n > 4) throw new Error('fastGrade: at most 4 pieces');
  const full = (1 << n) - 1;
  // memo: count * 2 + plain (count capped so it stays a small integer)
  const memo = new Map<number, Map<number, number>>();
  const BIG = 1 << 24;
  let nodes = 0;
  let truncated = false;

  /** Distinct-id representative indices still in `mask`, ascending. */
  const firstOfId = (mask: number): number[] => {
    const out: number[] = [];
    for (let i = 0; i < n; i++) {
      if (!(mask & (1 << i))) continue;
      let dup = false;
      for (let j = 0; j < i; j++) if (mask & (1 << j) && pieces[j] === pieces[i]) dup = true;
      if (!dup) out.push(i);
    }
    return out;
  };

  const rec = (lo: number, hi: number, mask: number): number => {
    if (mask === 0) return lo === 0 && hi === 0 ? 3 : 0; // count 1, plain
    const k1 = hi * 16 + mask;
    let inner = memo.get(k1);
    const hit = inner?.get(lo);
    if (hit !== undefined) return hit;
    let count = 0;
    let plain = 0;
    const last = (mask & (mask - 1)) === 0;
    for (const i of firstOfId(mask)) {
      const rest = mask & ~(1 << i);
      for (const pl of ps[i]!) {
        if ((pl.lo & lo) !== 0 || (pl.hi & hi) !== 0) continue;
        // the last piece must capture everything, and only a piece touching the reef can capture
        if (last && (pl.nlo & lo) === 0 && (pl.nhi & hi) === 0) continue;
        if (++nodes > nodeLimit) {
          truncated = true;
          return 0;
        }
        resolve((lo | pl.lo) >>> 0, (hi | pl.hi) >>> 0);
        const waves = rWaves;
        if (last) {
          if (rLo === 0 && rHi === 0) {
            count++;
            if (waves <= 1) plain = 1;
          }
          continue;
        }
        const r = rec(rLo, rHi, rest);
        if (truncated) return 0;
        if (r >= 2) {
          count = Math.min(BIG, count + (r >> 1));
          if (waves <= 1 && (r & 1) === 1) plain = 1;
        }
      }
    }
    const v = count * 2 + plain;
    if (!inner) memo.set(k1, (inner = new Map()));
    inner.set(lo, v);
    return v;
  };

  const [lo0, hi0] = toBits(board);
  let firstMoves = 0;
  let winningFirst = 0;
  let total = 0;
  let plainAny = false;
  let first: PuzzleMove[] | null = null;
  let firstCascade = false;
  if (n > 0) {
    for (const i of firstOfId(full)) {
      const rest = full & ~(1 << i);
      for (const pl of ps[i]!) {
        if ((pl.lo & lo0) !== 0 || (pl.hi & hi0) !== 0) continue;
        const touches = (pl.nlo & lo0) !== 0 || (pl.nhi & hi0) !== 0;
        if (++nodes > nodeLimit) truncated = true;
        if (truncated) break;
        resolve((lo0 | pl.lo) >>> 0, (hi0 | pl.hi) >>> 0);
        const waves = rWaves;
        const cLo = rLo;
        const cHi = rHi;
        const r = rest === 0 ? (cLo === 0 && cHi === 0 ? 3 : 0) : rec(cLo, cHi, rest);
        if (truncated) break;
        if (touches) firstMoves++;
        if (r >= 2) {
          if (touches) winningFirst++;
          total = Math.min(BIG, total + (r >> 1));
          if (waves <= 1 && (r & 1) === 1) plainAny = true;
          if (!first) {
            first = [{ piece: i, x: pl.x, y: pl.y }];
            firstCascade = waves > 1;
            // follow the memo down the first winning branch (same DFS order as the root)
            let lo = cLo;
            let hi = cHi;
            let mask = rest;
            while (mask) {
              let found = false;
              for (const j of firstOfId(mask)) {
                const rj = mask & ~(1 << j);
                for (const q of ps[j]!) {
                  if ((q.lo & lo) !== 0 || (q.hi & hi) !== 0) continue;
                  resolve((lo | q.lo) >>> 0, (hi | q.hi) >>> 0);
                  const w = rWaves;
                  const nlo = rLo;
                  const nhi = rHi;
                  const ok = rj === 0 ? nlo === 0 && nhi === 0 : rec(nlo, nhi, rj) >= 2;
                  if (ok) {
                    first.push({ piece: j, x: q.x, y: q.y });
                    if (w > 1) firstCascade = true;
                    lo = nlo;
                    hi = nhi;
                    mask = rj;
                    found = true;
                    break;
                  }
                }
                if (found) break;
              }
              if (!found) break; // unreachable: the memo said this branch wins
            }
          }
        }
      }
      if (truncated) break;
    }
  }
  return {
    solvable: !truncated && total > 0,
    solutions: Math.min(cap, total),
    firstMoves,
    winningFirst,
    cascadeRequired: total > 0 && !plainAny,
    cascade: firstCascade,
    first: truncated ? null : first,
    nodes,
    truncated,
  };
}
