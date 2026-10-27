/** Reveal present scale (pure: shared by the reveal chunk and unit tests). */
/**
 * CRITIQUE-2 NEW 5: the present is scaled by the creature's size class (an S seahorse no longer looks
 * as big as the legendary XL kraken, which breaks the card top). XS stays clearly readable.
 */
export const REVEAL_SCALE = { XS: 0.8, S: 0.9, M: 1, L: 1.15, XL: 1.3, XXL: 1.3 } as const;
/** No present is drawn bigger than the XL/XXL class scale, whatever its `tileScale`. */
export const REVEAL_SCALE_MAX = 1.3;
/**
 * Art critique round 5: reveal-only boosts (its art box read ~20 % smaller than the kraken's and
 * the whale shark's). Still capped by REVEAL_SCALE_MAX: the M seadragon (tileScale 1.25) reaches
 * the cap, 1.3, not the asked-for 1.5.
 */
export const REVEAL_BOOST: Readonly<Record<string, number>> = { seadragon: 1.2 };
/**
 * The modal present's scale: its size class × its framed-fill `tileScale` (× a reveal boost), capped
 * at REVEAL_SCALE_MAX (an L with a big tileScale would be ~1.5, past the legendary XL kraken).
 */
export function revealScaleOf(cls: keyof typeof REVEAL_SCALE, tileScale: number, id = ''): number {
  return Math.min(REVEAL_SCALE_MAX, REVEAL_SCALE[cls] * tileScale * (REVEAL_BOOST[id] ?? 1));
}
