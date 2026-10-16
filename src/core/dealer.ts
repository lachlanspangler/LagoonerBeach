/**
 * Tray dealer: deterministic given the RNG. Shapes difficulty with a ramp from friendly to chunky
 * pieces, guarantees at least one dealt piece fits (no dealt-dead trays), and can deal a scripted
 * teaching tray that lets a first-time player close a loop in two moves.
 */
import type { Rng } from './rng.ts';
import { PIECES, pieceById, type Family, type Piece } from './pieces.ts';
import { fitsAnywhere, placements, resolvePlacement, type Board } from './rules.ts';

export const COLORS = 6;
export const TRAY_SIZE = 3;

export interface TrayPiece {
  readonly pieceId: string;
  readonly color: number;
}

export interface RampConfig {
  /** Move count where the ramp starts. */
  readonly start: number;
  /** Move count where the ramp reaches full difficulty. */
  readonly end: number;
  /** Family weight totals at t=0 and t=1. */
  readonly early: Readonly<Record<Family, number>>;
  readonly late: Readonly<Record<Family, number>>;
  /** Extra multiplier on the single-cell piece (it's a powerful pocket sealer). */
  readonly dotFactor: number;
  /** Re-deal attempts before building a guaranteed-placeable tray constructively. */
  readonly fairnessRetries: number;
}

/**
 * Tuned with scripts/tune.ts (DIARY 2026-10-16 session 2), with every tray guaranteed placeable:
 * random ≈ 20 moves, human-like ≈ 50 (~3 min), greedy ≈ 83, full-tray search effectively never dies
 * (like Block Blast: a perfect player can go on; difficulty is how hard solutions are to *find*).
 * Changing these numbers changes the daily for everyone; bot bands in balance.test.ts flag drift.
 */
export const DEFAULT_RAMP: RampConfig = {
  start: 8,
  end: 45,

  early: { tiny: 0.9, small: 1.6, medium: 3.2, large: 1.6, huge: 0.25 },
  late: { tiny: 0.05, small: 0.2, medium: 1.2, large: 3.6, huge: 2.6 },
  dotFactor: 0.45,
  fairnessRetries: 12,
};

export const TEACHING_TRAY: readonly string[] = ['cup-up', 'tri-h', 'square'];

const FAMILY_COUNT: Record<Family, number> = { tiny: 0, small: 0, medium: 0, large: 0, huge: 0 };
for (const p of PIECES) FAMILY_COUNT[p.family]++;

/** Per-piece weights at a given move count. Exported for tests and tuning tools. */
export function pieceWeights(moves: number, cfg: RampConfig = DEFAULT_RAMP): number[] {
  const t = Math.max(0, Math.min(1, (moves - cfg.start) / Math.max(1, cfg.end - cfg.start)));
  return PIECES.map((p) => {
    const fam = cfg.early[p.family] * (1 - t) + cfg.late[p.family] * t;
    const w = fam / FAMILY_COUNT[p.family];
    return p.id === 'dot' ? w * cfg.dotFactor : w;
  });
}

function dealColors(rng: Rng, n: number): number[] {
  const out: number[] = [];
  while (out.length < n) {
    const c = 1 + rng.int(COLORS);
    if (!out.includes(c)) out.push(c);
  }
  return out;
}

/**
 * True if every piece can be placed, in some order, starting from `board` (captures between
 * placements count, since they free space). This is the "there's always a solution" guarantee.
 */
export function trayClearable(board: Board, pieces: readonly Piece[]): boolean {
  if (pieces.length === 0) return true;
  if (pieces.length === 1) return fitsAnywhere(board, pieces[0]!);
  const tried = new Set<string>();
  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i]!;
    if (tried.has(p.id)) continue; // identical pieces are interchangeable
    tried.add(p.id);
    const rest = pieces.filter((_, j) => j !== i);
    for (const [x, y] of placements(board, p))
      if (trayClearable(resolvePlacement(board, p, x, y, 1).board, rest)) return true;
  }
  return false;
}

/**
 * Deal three pieces. Guarantee (when any piece fits at all): the tray can be fully placed in some
 * order — losing is always the player's placement, never the deal. Sampling keeps the ramp's
 * distribution; if sampling fails, a tray is built constructively along one valid placement path.
 */
export function dealTray(rng: Rng, board: Board, moves: number, cfg: RampConfig = DEFAULT_RAMP): TrayPiece[] {
  const weights = pieceWeights(moves, cfg);
  let pieces: Piece[] = [];
  let ok = false;
  for (let attempt = 0; attempt <= cfg.fairnessRetries && !ok; attempt++) {
    pieces = Array.from({ length: TRAY_SIZE }, () => PIECES[rng.weighted(weights)]!);
    ok = trayClearable(board, pieces);
  }
  if (!ok) {
    // constructive fallback: pick each next piece among those that fit after the previous ones
    let b = board;
    const built: Piece[] = [];
    for (let k = 0; k < TRAY_SIZE; k++) {
      const fitW = PIECES.map((p, i) => (fitsAnywhere(b, p) ? weights[i]! : 0));
      if (!fitW.some((w) => w > 0)) break; // board is full: nothing can be guaranteed
      const p = PIECES[rng.weighted(fitW)]!;
      const spots = placements(b, p);
      const [x, y] = spots[rng.int(spots.length)]!;
      b = resolvePlacement(b, p, x, y, 1).board;
      built.push(p);
    }
    if (built.length === TRAY_SIZE) {
      // shuffle so the "solution order" isn't simply left-to-right
      for (let i = built.length - 1; i > 0; i--) {
        const j = rng.int(i + 1);
        [built[i], built[j]] = [built[j]!, built[i]!];
      }
      pieces = built;
    }
  }
  const colors = dealColors(rng, TRAY_SIZE);
  return pieces.map((p, i) => ({ pieceId: p.id, color: colors[i]! }));
}

export function teachingTray(rng: Rng): TrayPiece[] {
  const colors = dealColors(rng, TRAY_SIZE);
  return TEACHING_TRAY.map((id, i) => ({ pieceId: pieceById(id).id, color: colors[i]! }));
}
