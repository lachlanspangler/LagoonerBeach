/**
 * The creature art kit (ADR 0011, style guide in docs/research/CREATURE_ART.md §3).
 *
 * A species is DATA: layered parts as SVG path strings on a 100-unit artboard (origin at the centre,
 * facing right, y down), grouped into animation groups with pivots, plus face anchors, a size class
 * and an idle spec. Everything else — outline, night rim, palette derivation, golden, the face rig,
 * expressions, motion, caching — is shared code, so 47 species read as one cast.
 *
 * Fleet artists: author one file in `species/<id>.ts` that `export default defineArt({...})`.
 * Use the shape helpers below (they return path strings) or raw `d` strings.
 */
import { parsePath, type Seg } from './path.ts';

// ─── types ─────────────────────────────────────────────────────────────────────────────────────

/** Fill roles. Colours come from the palette (body/belly/accent) or are shared (white/ink/light). */
export type Role = 'body' | 'belly' | 'accent' | 'white' | 'ink' | 'light';
/** R27 size classes. */
export type SizeClass = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';
/** R23 idle class (also selects the R12 body class for the silhouette test, see `bodyClassOf`). */
export type Klass = 'fish' | 'shark' | 'long' | 'chibi' | 'jelly' | 'wing' | 'object' | 'horse' | 'turtle' | 'snail';
/**
 * R19 closed expression set. `sleepy` = closed, contented ‿ eyes (CRITIQUE-1 #1: the old half-lid
 * read grumpy); `drowsy` = the half-lid, kept only as a per-species `restExpression` (grouper).
 */
export type Expression = 'idle' | 'blink' | 'happy' | 'surprised' | 'proud' | 'sleepy' | 'shy' | 'drowsy';
export const EXPRESSIONS: readonly Expression[] = [
  'idle',
  'blink',
  'happy',
  'surprised',
  'proud',
  'sleepy',
  'shy',
  'drowsy',
];
/** R8 mouth vocabulary (grin/underbite/toothy are signature exceptions). */
export type Mouth = 'none' | 'smile' | 'w' | 'o' | 'open' | 'flat' | 'pout' | 'grin' | 'underbite' | 'toothy';
/** R18 closed pattern set. */
export type PatternKind = 'bands' | 'stripes' | 'spots' | 'saddle' | 'rings' | 'ribs' | 'glow' | 'plain';

export interface Part {
  /** SVG path data on the 100-unit artboard. */
  readonly d: string;
  readonly role: Role;
  /**
   * `fill` (default): a silhouette primitive — outlined, part of the fill-only mask.
   * `pattern`: clipped to its group's silhouette, no outline; dropped below 3 px features (R18).
   * `line`: an interior ink line (stroked, round caps), clipped to the group; width `w` units.
   */
  readonly kind?: 'fill' | 'pattern' | 'line';
  /** Line width in units (lines only; default 0.5 × outline). */
  readonly w?: number;
  /** Excluded from the body box (tail tips, antennae, spines — R1). */
  readonly extra?: boolean;
  readonly alpha?: number;
  /** `false`: no ink outline / Night rim for this fill (glow halos, soft light props). */
  readonly outline?: boolean;
  /**
   * Animated colour: the part cycles through these colours (cached steps, never per-frame work).
   * Step k shows `cycle[(k + cycleOffset) % n]`; offsets make ripples (comb-jelly ribs, cuttle bands).
   * Timing is `SpeciesArt.cycle`. A static tile shows step 0.
   */
  readonly cycle?: readonly string[];
  readonly cycleOffset?: number;
}

export interface Group {
  /** `body` is required; animation groups are e.g. `tail`, `finA`, `clawR`, `head`, `arm1`. */
  readonly id: string;
  /** Rotation/scale pivot in artboard units (default: centre of the group's bounds). */
  readonly pivot?: readonly [number, number];
  readonly parts: readonly Part[];
  /**
   * A prop (the clownfish's anemone, a bubble, a pearl): hidden at rest, drawn only while a
   * performance animates it, outside the creature's root transform, and never part of the
   * silhouette or body box.
   */
  readonly prop?: boolean;
  /** Props only: move with the creature (root transform) instead of staying put. */
  readonly followRoot?: boolean;
  /**
   * Scale steps (e.g. [1, 1.2, 1.4]): the layer is pre-rasterised at each so a `s`/`sx`/`sy` track
   * (puffer inflate) scales the shape without thickening the outline; the nearest step is used and
   * the remainder applied as a transform.
   */
  readonly scaleSteps?: readonly number[];
  /**
   * Seamless chain (segmented eels/tentacles): the outlines of all seamless groups are drawn in one
   * pass behind all their fills, so joints between moving segments show no seam.
   */
  readonly seamless?: boolean;
}

export interface Face {
  /** Group the face rides on (default `body`). Drawn right after that group, so later groups occlude it. */
  readonly g?: string;
  /** Eye centres (1 for profile species, 2 for front-facing ones). */
  readonly eyes: readonly (readonly [number, number])[];
  /**
   * Eye height in units (R7: 14–24 % of face-zone height). Width = 0.85 × height. Default: 22 % of the
   * zone for profile fish/sharks, 18 % otherwise. The renderer never draws an eye below the absolute
   * floor (`eyeFloorUnits`: ≥ 4 CSS px in a 54 px tile and ≥ 9 % of the body-box height) unless
   * `eyeFloor: false`; the validator warns when the authored eye is below it (R7F).
   */
  readonly eye?: number;
  readonly eyeFloor?: boolean;
  /** Pupil shape: `round` (default, the solid oval) or `w` (cuttlefish: light eye with a W pupil). */
  readonly pupil?: 'round' | 'w';
  /** Profile view even with two eyes (hammerhead eyes on the hammer tips). */
  readonly profile?: boolean;
  /** Blush override: colour, alpha, and `always` (on in every expression, e.g. the sunfish's sun-blush). */
  readonly blush?: { readonly color?: string; readonly alpha?: number; readonly always?: boolean };
  /** Face zone [x, y, w, h] — used to validate eye size/placement (R7). */
  readonly zone: readonly [number, number, number, number];
  /** Idle mouth: anchor (centre), width in units, shape. */
  readonly mouth: { readonly at: readonly [number, number]; readonly w: number; readonly shape: Mouth };
  /** Front-facing: blush sits outward of each eye; otherwise toward the back (−x). */
  readonly front?: boolean;
  /** "sweet" personality: blush in idle too (R9). */
  readonly sweet?: boolean;
  /** Pink/red body: blush becomes ink at 25 % (R9). */
  readonly blushInk?: boolean;
  /** Colour role of the sleepy lid (default `body`). */
  readonly lid?: Role;
}

/** Ambient idle channel (R23). Rotations in degrees, translations in units, scales as fractions. */
export interface Channel {
  readonly m: 'bob' | 'glide' | 'breathe' | 'pulse' | 'wag' | 'flutter' | 'sway' | 'paddle' | 'wave';
  /** Group(s); default `root` (the whole creature). With a list, `lag` offsets each one's phase. */
  readonly g?: string | readonly string[];
  readonly amp: number;
  /** Seconds at size class M (scaled by R24). */
  readonly period: number;
  /** Phase offset, in cycles (0–1). */
  readonly phase?: number;
  /** Per-group delay in seconds when `g` is a list (tentacles lag 90–150 ms). */
  readonly lag?: number;
}

export type Prop = 'tx' | 'ty' | 'rot' | 's' | 'sx' | 'sy';
/** A keyframe track: [u (0–1), value] pairs, eased in-out between keys. */
export interface Track {
  readonly g?: string;
  readonly p: Prop;
  readonly k: readonly (readonly [number, number])[];
}
export type FaceOverride = Expression | 'wink';
/** A one-shot performance: signature idle, catch or release (R22, R26). */
export interface Motion {
  /** Seconds (authored as seen; not tempo-scaled). */
  readonly dur: number;
  readonly tracks: readonly Track[];
  /** Face overrides over parts of the motion: [u0, u1, expression]. */
  readonly face?: readonly (readonly [number, number, FaceOverride])[];
}
export interface Signature extends Motion {
  /** Seconds between performances (R23: 4–8 s). */
  readonly every?: readonly [number, number];
}

export interface SpeciesArt {
  readonly id: string;
  readonly klass: Klass;
  readonly size: SizeClass;
  /** R10: the one exaggerated signature trait, as words (shown in review sheets). */
  readonly feature: string;
  readonly personality: readonly [string, string, string];
  /** ≤ 3 authored colours (R16). belly defaults to a derived countershade; ink is always derived. */
  readonly palette: { readonly body: string; readonly accent?: string; readonly belly?: string };
  /** Back to front. */
  readonly groups: readonly Group[];
  /** R17 highlight (white 28 % Day / 18 % Night), clipped to the body group. */
  readonly shine?: string;
  /** R17 optional shade (ink 12 %), clipped to the body group. */
  readonly shade?: string;
  /** Group the shine/shade are clipped to (default `body`; e.g. the hermit's `shell`). */
  readonly shineOn?: string;
  readonly face: Face;
  readonly idle: { readonly ambient: readonly Channel[]; readonly signature: Signature };
  /** Plays at the leap apex (default: a happy wiggle). */
  readonly catch?: Motion;
  /** Plays when released back to the sea (default: a tail flick). */
  readonly release?: Motion;
  /** Awake at night, sleepy by day (R32). Default: Night-habitat species. */
  readonly nocturnal?: boolean;
  /** Squash pivots at the bottom of the body box instead of its centre. */
  readonly ground?: boolean;
  /** Golden variant palette: `rose` for the Golden Turtle (R33). */
  readonly golden?: 'gold' | 'rose';
  /** Resting face in the journal when awake (default `idle`; e.g. the grouper's `drowsy` half-lid). */
  readonly restExpression?: Expression;
  /** Never shown `sleepy`, on either theme (the kraken). */
  readonly neverSleepy?: boolean;
  /** Timing of `Part.cycle` colours: steps per second, always or only during the signature. */
  readonly cycle?: { readonly rate: number; readonly during?: 'always' | 'signature' };
  /**
   * Leap options: `point: false` = lean into the arc instead of pointing along it (default: fish,
   * sharks, eels, seahorses, rays point); `hide` = groups not drawn in the leap (the garden eel's mound).
   */
  readonly leap?: { readonly point?: boolean; readonly hide?: readonly string[] };
  /** XXL tile crop: keep the head in frame (default) or crop both ends evenly. */
  readonly crop?: 'head' | 'center';
  /** R-number → one-line reason for each deliberate deviation from the guide. */
  readonly deviations?: Readonly<Partial<Record<string, string>>>;
}

// ─── tables (style guide numbers) ─────────────────────────────────────────────────────────────

/**
 * R27 journal tile fill: share of the 54 px art box taken by the body box's long side. CRITIQUE-1 #4:
 * flatter at the bottom (XS were 22–30 px smudges), steeper at the top; XL must break the art box by
 * 2–4 px with fins/tips (validated, R28), XXL is cropped.
 */
export const TILE_FILL: Record<SizeClass, number> = { XS: 0.5, S: 0.6, M: 0.7, L: 0.82, XL: 0.95, XXL: 1.15 };
/** The journal art box (CSS px) the fill table refers to, and the bleed the tile canvas allows past it. */
export const TILE_PX = 54;
export const TILE_BLEED = 8;
/** R28: XL frame-break past the art box, in CSS px at TILE_PX. */
export const FRAME_BREAK: readonly [number, number] = [2, 4];

/** CRITIQUE-1 #2: absolute eye floor in units — ≥ 4 CSS px in a 54 px tile and ≥ 9 % of the body-box height. */
export function eyeFloorUnits(size: SizeClass, long: number, boxH: number): number {
  const ppu = (TILE_FILL[size] * TILE_PX) / long;
  return Math.max(4 / ppu, 0.09 * boxH);
}
/** Default eye height when a species omits `face.eye`. */
export function defaultEye(klass: Klass, face: Pick<Face, 'eyes' | 'zone' | 'profile'>): number {
  const profile = face.eyes.length === 1 || !!face.profile;
  return (profile && (klass === 'fish' || klass === 'shark') ? 0.22 : 0.18) * face.zone[3];
}
/** Detail (species page) fill: everything large enough to admire, size still legible. */
export const DETAIL_FILL: Record<SizeClass, number> = { XS: 0.46, S: 0.56, M: 0.66, L: 0.76, XL: 0.86, XXL: 1.1 };
/** R27 leap scale (× today's leaping fish). */
export const LEAP_SCALE: Record<SizeClass, number> = { XS: 0.55, S: 0.75, M: 1, L: 1.3, XL: 1.6, XXL: 2 };
/** R24 tempo: period multiplier and amplitude multiplier. */
export const PERIOD: Record<SizeClass, number> = { XS: 0.6, S: 0.8, M: 1, L: 1.25, XL: 1.5, XXL: 1.8 };
export const AMP: Record<SizeClass, number> = { XS: 1.3, S: 1.15, M: 1, L: 0.85, XL: 0.7, XXL: 0.6 };
/** R25 squash extremes (fraction away from 1). */
export const SQUASH: Record<SizeClass, number> = { XS: 0.15, S: 0.15, M: 0.1, L: 0.1, XL: 0.05, XXL: 0.05 };

/** R27: default size class from the geometric mean of the species' size range (cm). */
export function sizeClassFor(range: readonly [number, number]): SizeClass {
  const g = Math.sqrt(range[0] * range[1]);
  return g < 4 ? 'XS' : g < 12 ? 'S' : g < 40 ? 'M' : g < 150 ? 'L' : g < 500 ? 'XL' : 'XXL';
}

/** R5/R12 body class used for the "within the same body class" silhouette threshold. */
export function bodyClassOf(k: Klass): 'fish' | 'chibi' | 'long' | 'object' | 'wing' | 'turtle' {
  switch (k) {
    case 'fish':
    case 'shark':
      return 'fish';
    case 'chibi':
    case 'jelly':
      return 'chibi';
    case 'long':
    case 'horse':
      return 'long';
    case 'object':
    case 'snail':
      return 'object';
    case 'wing':
      return 'wing';
    case 'turtle':
      return 'turtle';
  }
}

// ─── authoring ─────────────────────────────────────────────────────────────────────────────────

/** Identity, but typed: `export default defineArt({...})`. */
export const defineArt = (a: SpeciesArt): SpeciesArt => a;

const f = (n: number) => String(Math.round(n * 100) / 100);
const pt = (x: number, y: number) => `${f(x)} ${f(y)}`;
const K = 0.5522847498;

/** Ellipse as 4 cubics; `rot` in degrees. */
export function ellipse(cx: number, cy: number, rx: number, ry: number, rot = 0): string {
  const a = (rot * Math.PI) / 180,
    c = Math.cos(a),
    s = Math.sin(a);
  const P = (x: number, y: number) => pt(cx + x * c - y * s, cy + x * s + y * c);
  return (
    `M${P(rx, 0)}C${P(rx, ry * K)} ${P(rx * K, ry)} ${P(0, ry)}` +
    `C${P(-rx * K, ry)} ${P(-rx, ry * K)} ${P(-rx, 0)}` +
    `C${P(-rx, -ry * K)} ${P(-rx * K, -ry)} ${P(0, -ry)}` +
    `C${P(rx * K, -ry)} ${P(rx, -ry * K)} ${P(rx, 0)}Z`
  );
}

export const circle = (cx: number, cy: number, r: number) => ellipse(cx, cy, r, r);

/** Rounded rectangle; r is clamped to half the short side (R3: r ≥ 2). */
export function rrect(x: number, y: number, w: number, h: number, r: number): string {
  const q = Math.min(r, w / 2, h / 2);
  const k = q * (1 - K);
  return (
    `M${pt(x + q, y)}L${pt(x + w - q, y)}C${pt(x + w - k, y)} ${pt(x + w, y + k)} ${pt(x + w, y + q)}` +
    `L${pt(x + w, y + h - q)}C${pt(x + w, y + h - k)} ${pt(x + w - k, y + h)} ${pt(x + w - q, y + h)}` +
    `L${pt(x + q, y + h)}C${pt(x + k, y + h)} ${pt(x, y + h - k)} ${pt(x, y + h - q)}` +
    `L${pt(x, y + q)}C${pt(x, y + k)} ${pt(x + k, y)} ${pt(x + q, y)}Z`
  );
}

/** Tapered capsule from (x1,y1) radius r1 to (x2,y2) radius r2 — limbs, fins, spines (R2). */
export function capsule(x1: number, y1: number, r1: number, x2: number, y2: number, r2: number): string {
  const dx = x2 - x1,
    dy = y2 - y1;
  const L = Math.hypot(dx, dy) || 1e-6;
  const ux = dx / L,
    uy = dy / L;
  const nx = -uy,
    ny = ux;
  const sa = Math.max(-0.999, Math.min(0.999, (r1 - r2) / L));
  const ca = Math.sqrt(1 - sa * sa);
  const vx = nx * ca - ux * sa,
    vy = ny * ca - uy * sa;
  const wx = -nx * ca - ux * sa,
    wy = -ny * ca - uy * sa;
  const big2 = sa > 0 ? 1 : 0;
  const big1 = sa < 0 ? 1 : 0;
  return (
    `M${pt(x1 + r1 * vx, y1 + r1 * vy)}L${pt(x2 + r2 * vx, y2 + r2 * vy)}` +
    `A${f(r2)} ${f(r2)} 0 ${big2} 0 ${pt(x2 + r2 * wx, y2 + r2 * wy)}` +
    `L${pt(x1 + r1 * wx, y1 + r1 * wy)}A${f(r1)} ${f(r1)} 0 ${big1} 0 ${pt(x1 + r1 * vx, y1 + r1 * vy)}Z`
  );
}

/**
 * Smooth closed shape through points (Catmull-Rom → cubics). The workhorse for organic bodies:
 * place 5–12 points around the silhouette and let the curve do the rest. `tension` 0.5–1.4.
 */
export function blob(points: readonly (readonly [number, number])[], tension = 1): string {
  const n = points.length;
  const P = (i: number) => points[((i % n) + n) % n]!;
  let d = `M${pt(P(0)[0], P(0)[1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = P(i - 1),
      p1 = P(i),
      p2 = P(i + 1),
      p3 = P(i + 2);
    const t = tension / 6;
    d += `C${pt(p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t)} ${pt(
      p2[0] - (p3[0] - p1[0]) * t,
      p2[1] - (p3[1] - p1[1]) * t,
    )} ${pt(p2[0], p2[1])}`;
  }
  return d + 'Z';
}

/**
 * A tapered tube along a spine of [x, y, radius] points (tentacles, tails, eels), with round ends.
 * Keep ≤ 10 spine points (segments = 2 × points + 2 ≤ 24, R2).
 */
export function tube(spine: readonly (readonly [number, number, number])[], tension = 1): string {
  const n = spine.length;
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = spine[Math.max(0, i - 1)]!,
      b = spine[Math.min(n - 1, i + 1)]!;
    let dx = b[0] - a[0],
      dy = b[1] - a[1];
    const L = Math.hypot(dx, dy) || 1;
    dx /= L;
    dy /= L;
    const [x, y, r] = spine[i]!;
    left.push([x - dy * r, y + dx * r]);
    right.push([x + dy * r, y - dx * r]);
  }
  const end = (i: number, j: number): [number, number] => {
    const [x, y, r] = spine[i]!;
    const [px, py] = spine[j]!;
    const L = Math.hypot(x - px, y - py) || 1;
    return [x + ((x - px) / L) * r, y + ((y - py) / L) * r];
  };
  return blob([...left, end(n - 1, n - 2), ...right.reverse(), end(0, 1)], tension);
}

/** Several subpaths as one part (counts their segments together). */
export const join = (...ds: string[]) => ds.join('');

/** Apply an affine map to a path (e.g. mirror a claw: `xform(d, { sx: -1 })`). Rotation in degrees about (ox, oy). */
export function xform(
  d: string,
  o: { tx?: number; ty?: number; sx?: number; sy?: number; rot?: number; ox?: number; oy?: number },
): string {
  const { tx = 0, ty = 0, sx = 1, sy = 1, rot = 0, ox = 0, oy = 0 } = o;
  const a = (rot * Math.PI) / 180,
    c = Math.cos(a),
    s = Math.sin(a);
  const T = (x: number, y: number) => {
    const X = (x - ox) * sx,
      Y = (y - oy) * sy;
    return pt(ox + X * c - Y * s + tx, oy + X * s + Y * c + ty);
  };
  return parsePath(d)
    .segs.map((g: Seg) => {
      switch (g.c) {
        case 'M':
          return `M${T(g.p[0], g.p[1])}`;
        case 'L':
          return `L${T(g.p[0], g.p[1])}`;
        case 'C':
          return `C${T(g.p[0], g.p[1])} ${T(g.p[2], g.p[3])} ${T(g.p[4], g.p[5])}`;
        case 'Q':
          return `Q${T(g.p[0], g.p[1])} ${T(g.p[2], g.p[3])}`;
        default:
          return 'Z';
      }
    })
    .join('');
}

// ─── motion presets (signature idles and catch/release hooks) ─────────────────────────────────

/** Darts forward `dist` units and glides back (minnow, barracuda). */
export const dart = (dist = 6, dur = 0.8): Signature => ({
  dur,
  tracks: [
    {
      p: 'tx',
      k: [
        [0, 0],
        [0.12, -1.5],
        [0.3, dist],
        [1, 0],
      ],
    },
    {
      p: 'sx',
      k: [
        [0, 1],
        [0.12, 0.94],
        [0.3, 1.06],
        [0.5, 1],
      ],
    },
  ],
});
/** A hop with squash & stretch (R25). */
export const hop = (h = 6, dur = 0.6, sq = 0.12): Motion => ({
  dur,
  tracks: [
    {
      p: 'ty',
      k: [
        [0, 0],
        [0.15, 0],
        [0.5, -h],
        [0.85, 0],
        [1, 0],
      ],
    },
    {
      p: 'sy',
      k: [
        [0, 1],
        [0.14, 1 - sq],
        [0.3, 1 + sq],
        [0.7, 1],
        [0.86, 1 - sq * 0.7],
        [1, 1],
      ],
    },
    {
      p: 'sx',
      k: [
        [0, 1],
        [0.14, 1 + sq],
        [0.3, 1 - sq * 0.8],
        [0.7, 1],
        [0.86, 1 + sq * 0.6],
        [1, 1],
      ],
    },
  ],
});
/** Rotates a group by `deg` twice, fast (crab claw clack). */
export const snap = (g: string, deg: number): Track => ({
  g,
  p: 'rot',
  k: [
    [0, 0],
    [0.12, deg],
    [0.24, 0],
    [0.4, deg],
    [0.52, 0],
    [1, 0],
  ],
});
/** Waves a group: `n` swings of ±deg (star arm, manta wingtip, claw hello). */
export function waveTrack(g: string, deg: number, n = 3): Track {
  const k: [number, number][] = [[0, 0]];
  for (let i = 0; i < n; i++) k.push([(i + 0.5) / (n + 0.5), deg * (i % 2 ? 0.4 : 1)]);
  k.push([1, 0]);
  return { g, p: 'rot', k };
}
/** Shrinks a group into its pivot and pops back out (hermit into the shell). */
export const hideTrack = (g: string, low = 0.1): Track => ({
  g,
  p: 's',
  k: [
    [0, 1],
    [0.18, low],
    [0.62, low],
    [0.8, 1.1],
    [0.9, 0.97],
    [1, 1],
  ],
});
/** Root rotation wiggle (clownfish into its anemone). */
export const wiggleTrack = (deg = 8, n = 4): Track => {
  const k: [number, number][] = [[0, 0]];
  for (let i = 0; i < n; i++) k.push([(i + 0.5) / n, i % 2 ? -deg : deg]);
  k.push([1, 0]);
  return { p: 'rot', k };
};
/** Squeeze a track into [u0, u1] of a longer performance (it rests outside that span). */
export const within = (tr: Track, u0: number, u1: number): Track => ({
  ...tr,
  k: tr.k.map(([u, v]) => [u0 + u * (u1 - u0), v] as const),
});
/** The default catch hook: a happy wiggle with a squash. */
export const DEFAULT_CATCH: Motion = {
  dur: 0.5,
  tracks: [
    wiggleTrack(10, 3),
    {
      p: 'sy',
      k: [
        [0, 1],
        [0.2, 0.9],
        [0.45, 1.1],
        [1, 1],
      ],
    },
  ],
  face: [[0, 1, 'happy']],
};
/** The default release hook: a little tail flick wave. */
export const DEFAULT_RELEASE: Motion = {
  dur: 0.5,
  tracks: [
    {
      p: 'rot',
      k: [
        [0, 0],
        [0.3, -12],
        [0.6, 6],
        [1, 0],
      ],
    },
  ],
  face: [[0, 1, 'happy']],
};
