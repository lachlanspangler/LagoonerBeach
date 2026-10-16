/**
 * Throwaway prototype harness shared by all candidate mechanics.
 * Board: 8x8 Uint8Array (0 empty, 1 filled). RNG: mulberry32, state carried in game state
 * so search bots can clone it without disturbing the real game.
 */
export const N = 8;
export const SIZE = N * N;

export interface Piece {
  id: string;
  cells: ReadonlyArray<readonly [number, number]>;
  w: number;
  h: number;
}

export function piece(id: string, rows: string[]): Piece {
  const cells: [number, number][] = [];
  rows.forEach((r, y) => [...r].forEach((ch, x) => ch === '#' && cells.push([x, y])));
  return { id, cells, w: Math.max(...rows.map((r) => r.length)), h: rows.length };
}

/** Shared catalog (fixed orientation, Block-Blast-like spread of 1..9 cells). */
export const CATALOG: Piece[] = [
  piece('1', ['#']),
  piece('2h', ['##']),
  piece('2v', ['#', '#']),
  piece('3h', ['###']),
  piece('3v', ['#', '#', '#']),
  piece('4h', ['####']),
  piece('4v', ['#', '#', '#', '#']),
  piece('5h', ['#####']),
  piece('5v', ['#', '#', '#', '#', '#']),
  piece('o2', ['##', '##']),
  piece('o3', ['###', '###', '###']),
  piece('r23', ['###', '###']),
  piece('r32', ['##', '##', '##']),
  piece('c3a', ['##', '#.']),
  piece('c3b', ['##', '.#']),
  piece('c3c', ['#.', '##']),
  piece('c3d', ['.#', '##']),
  piece('L4a', ['#.', '#.', '##']),
  piece('L4b', ['###', '#..']),
  piece('L4c', ['##', '.#', '.#']),
  piece('L4d', ['..#', '###']),
  piece('J4a', ['.#', '.#', '##']),
  piece('J4b', ['#..', '###']),
  piece('J4c', ['##', '#.', '#.']),
  piece('J4d', ['###', '..#']),
  piece('T4a', ['###', '.#.']),
  piece('T4b', ['.#', '##', '.#']),
  piece('T4c', ['.#.', '###']),
  piece('T4d', ['#.', '##', '#.']),
  piece('S4h', ['.##', '##.']),
  piece('Z4h', ['##.', '.##']),
  piece('S4v', ['#.', '##', '.#']),
  piece('Z4v', ['.#', '##', '#.']),
  piece('L5a', ['#..', '#..', '###']),
  piece('L5b', ['###', '#..', '#..']),
  piece('L5c', ['###', '..#', '..#']),
  piece('L5d', ['..#', '..#', '###']),
];

export function mulberry32(s: number): [number, number] {
  s = (s + 0x6d2b79f5) | 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s];
}

export class Rng {
  constructor(public s: number) {}
  next(): number {
    const [v, s] = mulberry32(this.s);
    this.s = s;
    return v;
  }
  int(n: number): number {
    return Math.floor(this.next() * n);
  }
  pick<T>(a: readonly T[]): T {
    return a[this.int(a.length)]!;
  }
  clone(): Rng {
    return new Rng(this.s);
  }
}

export function canPlace(b: Uint8Array, p: Piece, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x + p.w > N || y + p.h > N) return false;
  for (const [dx, dy] of p.cells) if (b[(y + dy) * N + x + dx]) return false;
  return true;
}

export function stamp(b: Uint8Array, p: Piece, x: number, y: number, v = 1): void {
  for (const [dx, dy] of p.cells) b[(y + dy) * N + x + dx] = v;
}

export function fullLines(b: Uint8Array): number[] {
  const cells = new Set<number>();
  let lines = 0;
  for (let y = 0; y < N; y++) {
    let f = true;
    for (let x = 0; x < N; x++) if (!b[y * N + x]) { f = false; break; }
    if (f) { lines++; for (let x = 0; x < N; x++) cells.add(y * N + x); }
  }
  for (let x = 0; x < N; x++) {
    let f = true;
    for (let y = 0; y < N; y++) if (!b[y * N + x]) { f = false; break; }
    if (f) { lines++; for (let y = 0; y < N; y++) cells.add(y * N + x); }
  }
  return lines ? [lines, ...cells] : [0];
}

export function filled(b: Uint8Array): number {
  let c = 0;
  for (let i = 0; i < SIZE; i++) c += b[i]!;
  return c;
}

/** Count of (piece, x, y) placements available for a probe set — a cheap "mobility" measure. */
const PROBE = ['1', '3h', '3v', 'o2', 'c3a', 'L4a', 'o3', '5h', '5v'].map((id) => CATALOG.find((p) => p.id === id)!);
export function mobility(b: Uint8Array): number {
  let m = 0;
  for (const p of PROBE) {
    let k = 0;
    for (let y = 0; y <= N - p.h; y++) for (let x = 0; x <= N - p.w; x++) if (canPlace(b, p, x, y)) k++;
    m += k > 0 ? 3 + Math.min(k, 10) : -12; // heavy penalty if a probe shape can't fit at all
  }
  return m;
}

/** Number of empty cells whose 4 neighbors are all filled/wall (holes) — bad for line games. */
export function holes(b: Uint8Array): number {
  let h = 0;
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      if (b[y * N + x]) continue;
      const n = (xx: number, yy: number) => xx < 0 || yy < 0 || xx >= N || yy >= N || b[yy * N + xx] === 1;
      if (n(x - 1, y) && n(x + 1, y) && n(x, y - 1) && n(x, y + 1)) h++;
    }
  return h;
}

export function render(b: Uint8Array): string {
  let s = '';
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) s += b[y * N + x] ? '#' : '.';
    s += '\n';
  }
  return s;
}
