/** Reveal present scale (pure: shared by the reveal chunk and unit tests). */
/**
 * CRITIQUE-2 NEW 5: the present is scaled by the creature's size class (an S seahorse no longer looks
 * as big as the legendary XL kraken, which breaks the card top). XS stays clearly readable.
 */
export const REVEAL_SCALE = { XS: 0.8, S: 0.9, M: 1, L: 1.15, XL: 1.3, XXL: 1.3 } as const;
/** No present is drawn bigger than the XL/XXL class scale, whatever its `tileScale`. */
export const REVEAL_SCALE_MAX = 1.3;
/**
 * The modal present's scale: its size class × its framed-fill `tileScale`, capped at
 * REVEAL_SCALE_MAX (an L seadragon with tileScale 1.25 was 1.44, past the legendary XL kraken).
 */
export function revealScaleOf(cls: keyof typeof REVEAL_SCALE, tileScale: number): number {
  return Math.min(REVEAL_SCALE_MAX, REVEAL_SCALE[cls] * tileScale);
}
