/** The reveal present's scale: size class × tileScale, never past the XL/XXL cap. */
import { describe, expect, it } from 'vitest';
import { ART } from '../../src/render/art/species/index.ts';
import { tileScaleOf } from '../../src/render/art/kit.ts';
import { REVEAL_SCALE, REVEAL_SCALE_MAX, revealScaleOf } from '../../src/ui/revealScale.ts';

describe('reveal scale', () => {
  it('no species is drawn bigger than the XL class (class × tileScale is capped)', () => {
    expect(REVEAL_SCALE_MAX).toBe(Math.max(...Object.values(REVEAL_SCALE)));
    for (const art of ART.values()) {
      const s = revealScaleOf(art.size, tileScaleOf(art), art.id);
      expect(s, art.id).toBeLessThanOrEqual(REVEAL_SCALE_MAX);
      expect(s, art.id).toBeGreaterThan(0);
    }
    // an L with the largest tileScale would be 1.15 × 1.3 ≈ 1.5: capped
    expect(revealScaleOf('L', 1.3)).toBe(REVEAL_SCALE_MAX);
  });
  it('the seadragon is boosted to the cap (it read ~20 % smaller than the XL legendaries)', () => {
    const sd = ART.get('seadragon')!;
    expect(revealScaleOf(sd.size, tileScaleOf(sd), 'seadragon')).toBe(REVEAL_SCALE_MAX);
    expect(revealScaleOf(sd.size, tileScaleOf(sd))).toBeLessThan(REVEAL_SCALE_MAX);
  });
  it('below the cap the product is unchanged', () => {
    expect(revealScaleOf('M', 1.1)).toBeCloseTo(1.1);
    expect(revealScaleOf('S', 0.9)).toBeCloseTo(0.81);
  });
});
