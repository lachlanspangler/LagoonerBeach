/**
 * The lazily loaded creature-art chunk (ADR 0011): the kit runtime plus every species' art.
 * `src/render/creatures.ts` imports this with `import()` after first paint; until then (and for
 * species without new art) the legacy procedural drawing is used.
 */
import type { Species } from '../../meta/creatures.ts';
import { DETAIL_FILL, LEAP_SCALE, TILE_FILL, tileScaleOf, type Expression, type SpeciesArt } from './kit.ts';
import { SHARED } from './palette.ts';
import { renderCreature } from './render.ts';

export { ART } from './species/index.ts';
export { renderCreature, cacheStats, clearCache, prepare } from './render.ts';
// for the in-browser checks (tests/e2e/art.spec.ts): Path2D vs the pure rasteriser, R12 limits
export { silhouetteMask, IOU_MAX, IOU_MAX_SAME_CLASS, SIL_GRID } from './silhouette.ts';
export { bodyClassOf, tileScaleOf } from './kit.ts';
export { goldenKind } from './palette.ts';

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
  readonly fit?: 'tile' | 'detail' | 'leap' | 'avatar';
  /** Mirror (face left). */
  readonly flip?: boolean;
  readonly action?: { readonly kind: 'catch' | 'release'; readonly u: number };
  readonly signatureAt?: number;
  /**
   * Framed views: show the awake resting face even when the species would doze on this theme
   * (CRITIQUE-4: the Night journal caps dozers per habitat page; a new catch wakes on its page).
   */
  readonly awake?: boolean;
}

const SWIMMERS: ReadonlySet<SpeciesArt['klass']> = new Set(['fish', 'shark', 'long', 'wing', 'horse']);

/**
 * R32: day species doze on Night, night species doze on Day; awake, a species shows its
 * `restExpression` (default idle). `neverSleepy` species (the kraken) are always awake.
 * CRITIQUE-2 NEW 1 (the Night journal was a dormitory): off-theme *tiles* doze `drowsy` (half-open,
 * highlights showing); the closed contented ‿ `sleepy` (with its "z") is for the detail view only.
 * A tile never rests eyes-closed: a closed-eyed rest face (the seadragon's `proud`) stays for the
 * detail view, and the tile shows it eyes-open (`idle`).
 */
export function restingFace(
  art: SpeciesArt,
  sp: Species,
  night: boolean,
  view: 'tile' | 'detail' = 'detail',
  forceAwake = false,
): Expression {
  const nocturnal = art.nocturnal ?? sp.habitat === 'night';
  const rest = art.restExpression ?? 'idle';
  const awake = view === 'tile' && CLOSED_EYES.has(rest) ? 'idle' : rest;
  if (forceAwake || art.neverSleepy || night === nocturnal) return awake;
  return view === 'tile' ? 'drowsy' : 'sleepy';
}
const CLOSED_EYES: ReadonlySet<Expression> = new Set(['sleepy', 'proud', 'happy', 'blink']);

/** True when the species dozes on this theme (an off-theme tile: drowsy, and may wake for a look). */
export function dozing(art: SpeciesArt, sp: Species, night: boolean): boolean {
  return !art.neverSleepy && night !== (art.nocturnal ?? sp.habitat === 'night');
}

/** Long side of the body box in px for a `drawCreature` call. */
export function spanFor(art: SpeciesArt, s: number, fit: DrawOpts['fit']): number {
  // CRITIQUE-4: `tileScale` adjusts the framed views (tile, species page) only; the leap keeps R27
  return fit === 'tile'
    ? s * TILE_FILL[art.size] * tileScaleOf(art)
    : fit === 'detail'
      ? s * DETAIL_FILL[art.size] * tileScaleOf(art)
      : fit === 'leap'
        ? s * 0.84 * LEAP_SCALE[art.size]
        : fit === 'avatar'
          ? s * 0.8 // identity, not size: every class fills the avatar circle
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
  const framed = o.fit === 'tile' || o.fit === 'detail' || o.fit === 'avatar';
  const long = spanFor(art, s, o.fit);
  // XXL doesn't fit (R27): cropped by the art box; keep the head in frame unless `crop: 'center'`
  const cropped = framed && long > s;
  if (cropped) {
    g.save();
    g.beginPath();
    g.roundRect(x - s / 2, y - s / 2, s, s, s * 0.16);
    g.clip();
    if (art.crop !== 'center') x -= (long - s) / 2;
  }
  const night = !!o.night;
  const facing = o.flip ? -1 : 1;
  // swimmers point along their path; crabs, octopuses and coins only lean into it
  const leap = o.fit === 'leap';
  if (leap && !(art.leap?.point ?? SWIMMERS.has(art.klass))) angle *= 0.3;
  const hide = leap ? art.leap?.hide : undefined;
  drawArt(g, sp, art, x, y, long, angle, facing, framed, night, hide, o);
  if (cropped) g.restore();
}

function drawArt(
  g: CanvasRenderingContext2D,
  sp: Species,
  art: SpeciesArt,
  x: number,
  y: number,
  long: number,
  angle: number,
  facing: 1 | -1,
  framed: boolean,
  night: boolean,
  hide: readonly string[] | undefined,
  o: DrawOpts,
): void {
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
    expression:
      o.expression ?? (framed ? restingFace(art, sp, night, o.fit === 'detail' ? 'detail' : 'tile', o.awake) : 'idle'),
    t: o.t,
    still: o.still,
    action: o.action,
    signatureAt: o.signatureAt,
    hide,
    zzz: o.fit === 'detail',
  });
}
