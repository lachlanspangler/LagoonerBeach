/**
 * The lazily loaded creature-art chunk (ADR 0011): the kit runtime plus every species' art.
 * `src/render/creatures.ts` imports this with `import()` after first paint; until then (and for
 * species without new art) the legacy procedural drawing is used.
 */
import type { Species } from '../../meta/creatures.ts';
import { DETAIL_FILL, LEAP_SCALE, TILE_FILL, type Expression, type SpeciesArt } from './kit.ts';
import { SHARED } from './palette.ts';
import { renderCreature } from './render.ts';

export { ART } from './species/index.ts';
export { renderCreature, cacheStats, clearCache, prepare } from './render.ts';

/** Options `drawCreature` accepts (a superset of the legacy ones). */
export interface DrawOpts {
  readonly silhouette?: string;
  readonly golden?: boolean;
  readonly expression?: Expression;
  /** Seconds: animate (idle loop, blink, signature). Omit for a static sprite. */
  readonly t?: number;
  /** Blinks only (reduced motion). */
  readonly still?: boolean;
  readonly night?: boolean;
  /**
   * How `s` maps to the drawing. tile/detail: `s` is the box in px and the size class sets the fill
   * (R27). leap: `s` is the old leaping-fish size, times the R27 leap scale. Omitted: `s` ≈ span.
   */
  readonly fit?: 'tile' | 'detail' | 'leap';
  /** Mirror (face left). */
  readonly flip?: boolean;
  readonly action?: { readonly kind: 'catch' | 'release'; readonly u: number };
  readonly signatureAt?: number;
}

/** R32: day species doze on Night, night species doze on Day. */
export function restingFace(art: SpeciesArt, sp: Species, night: boolean): Expression {
  const nocturnal = art.nocturnal ?? sp.habitat === 'night';
  return night !== nocturnal ? 'sleepy' : 'idle';
}

/** Long side of the body box in px for a `drawCreature` call. */
export function spanFor(art: SpeciesArt, s: number, fit: DrawOpts['fit']): number {
  return fit === 'tile'
    ? s * TILE_FILL[art.size]
    : fit === 'detail'
      ? s * DETAIL_FILL[art.size]
      : fit === 'leap'
        ? s * 0.84 * LEAP_SCALE[art.size]
        : s * 0.84;
}

export function drawSpecies(
  g: CanvasRenderingContext2D,
  sp: Species,
  art: SpeciesArt,
  x: number,
  y: number,
  s: number,
  angle: number,
  o: DrawOpts,
): void {
  const framed = o.fit === 'tile' || o.fit === 'detail';
  const long = spanFor(art, s, o.fit);
  // XXL bleeds out of the tile: keep the head in frame, crop the tail (R27)
  if (framed && long > s) x -= (long - s) / 2;
  const night = !!o.night;
  const facing = o.flip ? -1 : 1;
  if (o.silhouette) {
    renderCreature(g, art, x, y, {
      size: long,
      angle,
      facing,
      silhouette: framed ? (night ? SHARED.silNight : SHARED.silDay) : o.silhouette,
      silhouetteAlpha: framed ? (night ? 0.18 : 0.22) : 1,
    });
    return;
  }
  renderCreature(g, art, x, y, {
    size: long,
    angle,
    facing,
    night,
    golden: o.golden,
    expression: o.expression ?? (framed ? restingFace(art, sp, night) : 'idle'),
    t: o.t,
    still: o.still,
    action: o.action,
    signatureAt: o.signatureAt,
  });
}
