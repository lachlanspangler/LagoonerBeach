/**
 * The one rule: after a placement, every pocket — a group of empty cells that cannot reach the
 * board's border through empty cells — is captured, and it clears together with every block in
 * its 8-neighborhood (the ring).
 *
 * Board representation: Uint8Array(64), 0 = empty, 1..k = block color.
 */
import { BORDER, CELLS, N, NB4, NB8 } from './grid.ts';
import type { Piece } from './pieces.ts';

export type Board = Uint8Array;

export interface Pocket {
  /** Empty cells of the pocket, ascending. */
  readonly cells: readonly number[];
  /** Filled cells in the 8-neighborhood of the pocket, ascending. */
  readonly ring: readonly number[];
}

export const emptyBoard = (): Board => new Uint8Array(CELLS);

export function canPlace(b: Board, p: Piece, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x + p.w > N || y + p.h > N) return false;
  for (const [dx, dy] of p.cells) if (b[(y + dy) * N + x + dx] !== 0) return false;
  return true;
}

export function fitsAnywhere(b: Board, p: Piece): boolean {
  for (let y = 0; y <= N - p.h; y++) for (let x = 0; x <= N - p.w; x++) if (canPlace(b, p, x, y)) return true;
  return false;
}

export function placements(b: Board, p: Piece): [number, number][] {
  const out: [number, number][] = [];
  for (let y = 0; y <= N - p.h; y++) for (let x = 0; x <= N - p.w; x++) if (canPlace(b, p, x, y)) out.push([x, y]);
  return out;
}

export function pieceCells(p: Piece, x: number, y: number): number[] {
  return p.cells.map(([dx, dy]) => (y + dy) * N + x + dx);
}

// Scratch buffers: findPockets is called in hot loops by bots and previews.
const reach = new Uint8Array(CELLS);
const seen = new Uint8Array(CELLS);
const stack = new Int32Array(CELLS);
const ringMark = new Uint8Array(CELLS);

/** All pockets on the board (empty components not connected to the border). */
export function findPockets(b: Board): Pocket[] {
  reach.fill(0);
  let sp = 0;
  for (const c of BORDER)
    if (b[c] === 0 && reach[c] === 0) {
      reach[c] = 1;
      stack[sp++] = c;
    }
  while (sp > 0) {
    const k = stack[--sp]!;
    for (const nb of NB4[k]!)
      if (b[nb] === 0 && reach[nb] === 0) {
        reach[nb] = 1;
        stack[sp++] = nb;
      }
  }
  seen.fill(0);
  const pockets: Pocket[] = [];
  for (let c = 0; c < CELLS; c++) {
    if (b[c] !== 0 || reach[c] !== 0 || seen[c] !== 0) continue;
    const cells: number[] = [];
    seen[c] = 1;
    stack[0] = c;
    sp = 1;
    while (sp > 0) {
      const k = stack[--sp]!;
      cells.push(k);
      for (const nb of NB4[k]!)
        if (b[nb] === 0 && seen[nb] === 0) {
          seen[nb] = 1;
          stack[sp++] = nb;
        }
    }
    cells.sort((a, z) => a - z);
    ringMark.fill(0);
    const ring: number[] = [];
    for (const k of cells)
      for (const nb of NB8[k]!)
        if (b[nb] !== 0 && ringMark[nb] === 0) {
          ringMark[nb] = 1;
          ring.push(nb);
        }
    ring.sort((a, z) => a - z);
    pockets.push({ cells, ring });
  }
  return pockets;
}

export interface Wave {
  readonly pockets: readonly Pocket[];
  /** Ring cells removed in this wave (union across its pockets), ascending. */
  readonly cleared: readonly number[];
}

export interface Resolution {
  /** Board after placement and all clears. */
  readonly board: Board;
  /** Cells the piece occupied. */
  readonly placed: readonly number[];
  /**
   * Capture waves. Clearing a ring can leave a larger empty region that is *still* enclosed (thick
   * walls); it is captured again in the next wave, until no pocket remains.
   */
  readonly waves: readonly Wave[];
  /** All pockets across waves. */
  readonly pockets: readonly Pocket[];
  /** Union of all cleared cells, ascending. */
  readonly cleared: readonly number[];
}

/** Upper bound on cascade waves; each wave removes ≥1 block so 64 is a hard ceiling. */
const MAX_WAVES = 64;

/** Place a piece (caller guarantees legality) and resolve captures. Pure: returns a new board. */
export function resolvePlacement(b: Board, p: Piece, x: number, y: number, color: number): Resolution {
  const board = b.slice();
  const placed = pieceCells(p, x, y);
  for (const c of placed) board[c] = color;
  const waves: Wave[] = [];
  for (let w = 0; w < MAX_WAVES; w++) {
    const pockets = findPockets(board);
    if (pockets.length === 0) break;
    const set = new Set<number>();
    for (const pk of pockets) for (const c of pk.ring) set.add(c);
    const cleared = [...set].sort((a, z) => a - z);
    for (const c of cleared) board[c] = 0;
    waves.push({ pockets, cleared });
    if (cleared.length === 0) break; // impossible in practice: a pocket always has a non-empty ring
  }
  const pockets = waves.flatMap((wv) => wv.pockets);
  const cleared = [...new Set(waves.flatMap((wv) => wv.cleared))].sort((a, z) => a - z);
  return { board, placed, waves, pockets, cleared };
}

export function countFilled(b: Board): number {
  let n = 0;
  for (let i = 0; i < CELLS; i++) if (b[i] !== 0) n++;
  return n;
}
