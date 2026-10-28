/**
 * Catch requirements as data (pure): one `Req` per species is the single source of truth for when it
 * can be caught (`matches`, used by catch.ts via `Species.when`) and for what the journal says about
 * it (`describe` in reqText.ts, a lazy chunk). Kept deliberately simple (owner, 2026-10-28): how big
 * the pool is and how big a combo you're on — plus the two habitat gates, Night and Reefs. No shapes,
 * cascade waves, islands, move counts or reef tiers. Bounds are inclusive: `{ minArea: 6 }` = 6+ cells.
 */
import type { CatchContext } from './creatures.ts';

export type Mode = CatchContext['mode'];

export interface Req {
  /** Pool size in cells, inclusive bounds. */
  readonly minArea?: number;
  readonly maxArea?: number;
  /** COMBO ×N (consecutive capturing moves) at least this. */
  readonly streak?: number;
  /** The theme at capture time (`CatchContext.night`): the Night habitat's gate. */
  readonly theme?: 'day' | 'night';
  /** Only in these modes: the Reef habitat's gate. */
  readonly mode?: readonly Mode[];
}

/** Does a lagoon's catch context meet the requirement? */
export function matches(r: Req, c: CatchContext): boolean {
  if (r.minArea !== undefined && c.area < r.minArea) return false;
  if (r.maxArea !== undefined && c.area > r.maxArea) return false;
  if (r.streak !== undefined && c.streak < r.streak) return false;
  if (r.theme !== undefined && c.night !== (r.theme === 'night')) return false;
  if (r.mode && !r.mode.includes(c.mode)) return false;
  return true;
}
