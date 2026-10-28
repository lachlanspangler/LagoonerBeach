/**
 * Catch requirements as data (pure): one `Req` per species is the single source of truth for when it
 * can be caught (`matches`, used by catch.ts via `Species.when`) and for what the journal says about
 * it (`describe` in reqText.ts, a lazy chunk). Every field is a condition; all of them must hold.
 * Lower bounds are inclusive ("≥"), so `{ minArea: 6 }` reads "6+ cells".
 */
import type { CatchContext, Shape } from './creatures.ts';

export type Mode = CatchContext['mode'];

export interface Req {
  /** Pool size in cells, inclusive bounds. */
  readonly minArea?: number;
  readonly maxArea?: number;
  /** The pool's shape is one of these (catch.ts `classify`). */
  readonly shape?: readonly Shape[];
  /** Bounding-box width / height at least this; `wGtH`: wider than tall. */
  readonly minW?: number;
  readonly minH?: number;
  readonly wGtH?: true;
  /** At least this many pools sealed in the same wave. */
  readonly pockets?: number;
  /** Captured on this cascade wave or later (1 = the first). */
  readonly wave?: number;
  /** COMBO (consecutive capturing moves) at least this. */
  readonly streak?: number;
  /** Move number at least this. */
  readonly moves?: number;
  /** The theme at capture time (`CatchContext.night`). */
  readonly theme?: 'day' | 'night';
  /** Only in these modes / never in these modes. */
  readonly mode?: readonly Mode[];
  readonly notMode?: readonly Mode[];
  /** Reef tier is one of these (puzzle mode). */
  readonly tier?: readonly string[];
  /** This capture clears the reef. */
  readonly reefWin?: true;
  /** This capture clears the whole board. */
  readonly clean?: true;
}

/** Does a lagoon's catch context meet the requirement? */
export function matches(r: Req, c: CatchContext): boolean {
  if (r.minArea !== undefined && c.area < r.minArea) return false;
  if (r.maxArea !== undefined && c.area > r.maxArea) return false;
  if (r.shape && !r.shape.includes(c.shape)) return false;
  if (r.minW !== undefined && c.w < r.minW) return false;
  if (r.minH !== undefined && c.h < r.minH) return false;
  if (r.wGtH && !(c.w > c.h)) return false;
  if (r.pockets !== undefined && c.pockets < r.pockets) return false;
  if (r.wave !== undefined && c.wave < r.wave) return false;
  if (r.streak !== undefined && c.streak < r.streak) return false;
  if (r.moves !== undefined && c.moves < r.moves) return false;
  if (r.theme !== undefined && c.night !== (r.theme === 'night')) return false;
  if (r.mode && !r.mode.includes(c.mode)) return false;
  if (r.notMode && r.notMode.includes(c.mode)) return false;
  if (r.tier && (c.tier === undefined || !r.tier.includes(c.tier))) return false;
  if (r.reefWin && !c.reefWin) return false;
  if (r.clean && !c.clean) return false;
  return true;
}
