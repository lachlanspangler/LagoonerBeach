/**
 * Scoring. Integer-only so every platform agrees.
 *
 *   pocket value  = area × ring          (a 1-cell pinch with a full ring = 8; a 6-cell lagoon ≈ 80)
 *   wave value    = Σ pocket values in the wave × pockets in the wave × wave number (1, 2, 3…)
 *   capture       = Σ wave values         (cascades through thick walls escalate fast)
 *   streak bonus  = capture × (4 + min(streak − 1, 12)) / 4      → ×1.00 … ×4.00
 *   move total    = placed cells + streak-adjusted capture + clean-reef bonus
 *
 * The streak counts consecutive capturing moves; it survives up to STREAK_GRACE − 1 dry moves.
 */
import type { Pocket, Wave } from './rules.ts';

export const STREAK_GRACE = 3;
export const CLEAN_REEF_BONUS = 300;

export interface ScoreBreakdown {
  readonly placed: number;
  readonly pocketValues: readonly number[];
  /** Pockets captured this move (all waves). */
  readonly multi: number;
  readonly waves: number;
  readonly streakQuarters: number;
  readonly cleanBonus: number;
  readonly total: number;
}

export function pocketValue(p: Pocket): number {
  return p.cells.length * p.ring.length;
}

export function scoreMove(
  placedCells: number,
  waves: readonly Wave[],
  streak: number,
  boardEmpty: boolean,
): ScoreBreakdown {
  const pocketValues = waves.flatMap((w) => w.pockets.map(pocketValue));
  const multi = pocketValues.length;
  let raw = 0;
  waves.forEach((w, i) => {
    raw += w.pockets.reduce((a, p) => a + pocketValue(p), 0) * w.pockets.length * (i + 1);
  });
  const streakQuarters = multi > 0 ? 4 + Math.min(Math.max(streak - 1, 0), 12) : 4;
  const capture = Math.floor((raw * streakQuarters) / 4);
  const cleanBonus = multi > 0 && boardEmpty ? CLEAN_REEF_BONUS : 0;
  return {
    placed: placedCells,
    pocketValues,
    multi,
    waves: waves.length,
    streakQuarters,
    cleanBonus,
    total: placedCells + capture + cleanBonus,
  };
}

/** Streak after a move: +1 on capture; reset after STREAK_GRACE consecutive dry moves. */
export function nextStreak(streak: number, dry: number, captured: boolean): { streak: number; dry: number } {
  if (captured) return { streak: streak + 1, dry: 0 };
  const d = dry + 1;
  return d >= STREAK_GRACE ? { streak: 0, dry: d } : { streak, dry: d };
}
