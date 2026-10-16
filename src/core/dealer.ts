/**
 * Tray dealer: deterministic given the RNG. Shapes difficulty with a ramp from friendly to chunky
 * pieces, guarantees at least one dealt piece fits (no dealt-dead trays), and can deal a scripted
 * teaching tray that lets a first-time player close a loop in two moves.
 */
import type { Rng } from './rng.ts';
import { PIECES, pieceById, type Family, type Piece } from './pieces.ts';
import { fitsAnywhere, type Board } from './rules.ts';

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
  /** Re-deal attempts to avoid a tray where nothing fits. */
  readonly fairnessRetries: number;
}

/**
 * Tuned with scripts/tune.ts (see docs/DIARY.md 2026-10-16): random ≈ 20 moves, human-like ≈ 50
 * (~3 min), greedy ≈ 56 (median). Changing these numbers changes the daily challenge for everyone, and the
 * bot regression bands in tests/unit/balance.test.ts will flag it.
 */
export const DEFAULT_RAMP: RampConfig = {
  start: 8,
  end: 45,

  early: { tiny: 0.9, small: 1.6, medium: 3.2, large: 1.6, huge: 0.25 },
  late: { tiny: 0.05, small: 0.3, medium: 1.5, large: 3.2, huge: 1.8 },
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

export function dealTray(rng: Rng, board: Board, moves: number, cfg: RampConfig = DEFAULT_RAMP): TrayPiece[] {
  const weights = pieceWeights(moves, cfg);
  let pieces: Piece[] = [];
  let fair = false;
  for (let attempt = 0; attempt <= cfg.fairnessRetries && !fair; attempt++) {
    pieces = Array.from({ length: TRAY_SIZE }, () => PIECES[rng.weighted(weights)]!);
    fair = pieces.some((p) => fitsAnywhere(board, p));
  }
  if (!fair) {
    // Rejection sampling can miss when only rare pieces fit: force one slot to a fitting piece.
    const fitW = PIECES.map((p, i) => (fitsAnywhere(board, p) ? weights[i]! : 0));
    if (fitW.some((w) => w > 0)) pieces[rng.int(TRAY_SIZE)] = PIECES[rng.weighted(fitW)]!;
  }
  const colors = dealColors(rng, TRAY_SIZE);
  return pieces.map((p, i) => ({ pieceId: p.id, color: colors[i]! }));
}

export function teachingTray(rng: Rng): TrayPiece[] {
  const colors = dealColors(rng, TRAY_SIZE);
  return TEACHING_TRAY.map((id, i) => ({ pieceId: pieceById(id).id, color: colors[i]! }));
}
