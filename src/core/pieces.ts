/**
 * Piece catalog. Fixed orientation (no rotation): each orientation is its own piece.
 * Shapes are drawn as ASCII so the catalog is reviewable at a glance.
 */
export interface Piece {
  readonly id: string;
  /** Cell offsets [dx, dy] from the piece's top-left bounding-box corner. */
  readonly cells: readonly (readonly [number, number])[];
  readonly w: number;
  readonly h: number;
  readonly size: number;
  /** Difficulty family used by the dealer. */
  readonly family: Family;
}

export type Family = 'tiny' | 'small' | 'medium' | 'large' | 'huge';

function def(id: string, family: Family, rows: string[]): Piece {
  const cells: [number, number][] = [];
  rows.forEach((r, y) => [...r].forEach((ch, x) => ch === '#' && cells.push([x, y])));
  return { id, cells, w: Math.max(...rows.map((r) => r.length)), h: rows.length, size: cells.length, family };
}

export const PIECES: readonly Piece[] = [
  def('dot', 'tiny', ['#']),
  def('duo-h', 'tiny', ['##']),
  def('duo-v', 'tiny', ['#', '#']),
  def('tri-h', 'small', ['###']),
  def('tri-v', 'small', ['#', '#', '#']),
  def('bend-a', 'small', ['##', '#.']),
  def('bend-b', 'small', ['##', '.#']),
  def('bend-c', 'small', ['#.', '##']),
  def('bend-d', 'small', ['.#', '##']),
  def('quad-h', 'medium', ['####']),
  def('quad-v', 'medium', ['#', '#', '#', '#']),
  def('square', 'medium', ['##', '##']),
  def('ell-a', 'medium', ['#.', '#.', '##']),
  def('ell-b', 'medium', ['###', '#..']),
  def('ell-c', 'medium', ['##', '.#', '.#']),
  def('ell-d', 'medium', ['..#', '###']),
  def('jay-a', 'medium', ['.#', '.#', '##']),
  def('jay-b', 'medium', ['#..', '###']),
  def('jay-c', 'medium', ['##', '#.', '#.']),
  def('jay-d', 'medium', ['###', '..#']),
  def('tee-a', 'medium', ['###', '.#.']),
  def('tee-b', 'medium', ['.#', '##', '.#']),
  def('tee-c', 'medium', ['.#.', '###']),
  def('tee-d', 'medium', ['#.', '##', '#.']),
  def('zig-h', 'medium', ['##.', '.##']),
  def('zag-h', 'medium', ['.##', '##.']),
  def('zig-v', 'medium', ['.#', '##', '#.']),
  def('zag-v', 'medium', ['#.', '##', '.#']),
  def('cup-up', 'large', ['#.#', '###']),
  def('cup-down', 'large', ['###', '#.#']),
  def('cup-left', 'large', ['##', '#.', '##']),
  def('cup-right', 'large', ['##', '.#', '##']),
  def('pent-h', 'large', ['#####']),
  def('pent-v', 'large', ['#', '#', '#', '#', '#']),
  def('slab-h', 'large', ['###', '###']),
  def('slab-v', 'large', ['##', '##', '##']),
  def('corner-a', 'large', ['#..', '#..', '###']),
  def('corner-b', 'large', ['###', '#..', '#..']),
  def('corner-c', 'large', ['###', '..#', '..#']),
  def('corner-d', 'large', ['..#', '..#', '###']),
  def('block', 'huge', ['###', '###', '###']),
];

const BY_ID = new Map(PIECES.map((p) => [p.id, p]));

export function pieceById(id: string): Piece {
  const p = BY_ID.get(id);
  if (!p) throw new Error(`unknown piece ${id}`);
  return p;
}

export function hasPiece(id: string): boolean {
  return BY_ID.has(id);
}
