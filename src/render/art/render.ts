/**
 * Creature renderer (ADR 0011). Vector at authoring, raster at runtime (R34):
 * - each animation group is rasterised once per (size bucket, device scale, theme, golden, colour
 *   step, scale step) into a layer canvas with its same-hue outline drawn behind (R14), the Night rim
 *   (R15), patterns clipped to the silhouette, the highlight/shade (R17) and baked glow — never per
 *   frame (R36);
 * - an animated frame is ≤ 6 `drawImage`s with transforms + the live face rig (R35) (seamless chains
 *   add one ink pass per segment);
 * - a static frame (journal tile) is one composite sprite.
 * Caches are LRU with a 12 MB cap measured as w × h × 4 (R38).
 */
import { boundsOf, flatten, unionBox, type Box } from './path.ts';
import {
  defaultEye,
  eyeFloorUnits,
  type Expression,
  type Group,
  type Part,
  type Role,
  type SpeciesArt,
} from './kit.ts';
import { deriveBelly, deriveInk, GOLDEN, oklch, rimAlpha, ROSE_GOLD, SHARED } from './palette.ts';
import { pose, seedOf, type Pose, type PoseOpts, type Xf } from './motion.ts';
import { drawFace } from './face.ts';

type G = CanvasRenderingContext2D;

export interface RenderOpts extends PoseOpts {
  /** CSS px of the body box's long side. */
  readonly size: number;
  readonly golden?: boolean;
  readonly night?: boolean;
  /** Fill-only mask in this colour (locked journal entries, silhouette tests). */
  readonly silhouette?: string;
  readonly silhouetteAlpha?: number;
  /** -1 mirrors (faces left). */
  readonly facing?: 1 | -1;
  /** Radians, applied about the body-box centre. */
  readonly angle?: number;
  /** Groups not to draw (the garden eel's mound in the leap). */
  readonly hide?: readonly string[];
  /** The drifting "z" of `sleepy` (detail view). */
  readonly zzz?: boolean;
}

// ─── preparation (once per species) ───────────────────────────────────────────────────────────

interface PPart {
  readonly part: Part;
  readonly box: Box;
  path?: Path2D;
}
interface PGroup {
  readonly g: Group;
  readonly pivot: readonly [number, number];
  readonly parts: readonly PPart[];
  /** Bounds of the group's fills (units); patterns/lines are clipped to them. */
  readonly box: Box;
  /** Colour-cycle period of the group's parts (lcm of cycle lengths; 1 = no cycling). */
  readonly cycleLen: number;
}
export interface Prepared {
  readonly art: SpeciesArt;
  readonly groups: readonly PGroup[];
  /** R1 body box: fill parts, excluding `extra`. */
  readonly box: Box;
  /** Everything (for composite canvases). */
  readonly all: Box;
  readonly long: number;
  readonly seed: number;
  /** Effective eye height in units: authored (or default), raised to the absolute floor. */
  readonly eye: number;
  readonly anySeamless: boolean;
  shine?: Path2D;
  shade?: Path2D;
}

const prepared = new WeakMap<SpeciesArt, Prepared>();
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

export function prepare(art: SpeciesArt): Prepared {
  const hit = prepared.get(art);
  if (hit) return hit;
  let box: Box = { x: 0, y: 0, w: 0, h: 0 };
  let all: Box = box;
  const groups = art.groups.map((g) => {
    let gb: Box = { x: 0, y: 0, w: 0, h: 0 };
    let cycleLen = 1;
    const parts = g.parts.map((part) => {
      const b = boundsOf(flatten(part.d, 8));
      // patterns/lines are clipped to the fills, so the layer only needs the fills' bounds
      if ((part.kind ?? 'fill') === 'fill') gb = unionBox(gb, b);
      if ((part.kind ?? 'fill') === 'fill' && !part.extra && part.outline !== false && !g.prop) box = unionBox(box, b);
      if (part.cycle?.length) cycleLen = (cycleLen * part.cycle.length) / gcd(cycleLen, part.cycle.length);
      return { part, box: b };
    });
    // scale steps grow the layer about the pivot
    const pivot = g.pivot ?? ([gb.x + gb.w / 2, gb.y + gb.h / 2] as const);
    all = unionBox(all, gb);
    return { g, pivot, parts, box: gb, cycleLen };
  });
  const long = Math.max(box.w, box.h) || 1;
  const f = art.face;
  const authored = f.eye ?? defaultEye(art.klass, f);
  const eye = f.eyeFloor === false ? authored : Math.max(authored, eyeFloorUnits(art.size, long, box.h));
  const p: Prepared = {
    art,
    groups,
    box,
    all,
    long,
    seed: seedOf(art.id),
    eye,
    anySeamless: art.groups.some((g) => g.seamless),
  };
  prepared.set(art, p);
  return p;
}

const path2d = (pp: PPart) => (pp.path ??= new Path2D(pp.part.d));

// ─── colours ──────────────────────────────────────────────────────────────────────────────────

export interface Colors {
  readonly body: string;
  readonly belly: string;
  readonly accent: string;
  readonly ink: string;
  readonly white: string;
  readonly light: string;
  /** OKLCH lightness of the body (face rig). */
  readonly bodyL: number;
}
const colorMemo = new Map<string, Colors>();
export function colorsFor(art: SpeciesArt, golden = false): Colors {
  const key = `${art.id}|${golden ? 1 : 0}`;
  const hit = colorMemo.get(key);
  if (hit) return hit;
  const pal = art.palette;
  let c: Colors;
  if (golden) {
    const G = art.golden === 'rose' ? ROSE_GOLD : GOLDEN;
    c = {
      body: G.body,
      belly: G.belly,
      accent: G.accent,
      ink: G.ink,
      white: SHARED.white,
      light: G.accent,
      bodyL: oklch(G.body)[0],
    };
  } else {
    const belly = pal.belly ?? deriveBelly(pal.body);
    const accent = pal.accent ?? belly;
    c = {
      body: pal.body,
      belly,
      accent,
      ink: deriveInk(pal.body),
      white: SHARED.white,
      light: accent,
      bodyL: oklch(pal.body)[0],
    };
  }
  colorMemo.set(key, c);
  return c;
}
/** A part's fill colour at colour step `k` (golden keeps cycles in gold: they use the accent). */
function partColor(c: Colors, q: Part, k: number, golden: boolean): string {
  if (q.cycle?.length && !golden) return q.cycle[(k + (q.cycleOffset ?? 0)) % q.cycle.length]!;
  return c[q.role as Role];
}

// ─── LRU raster cache (R38) ───────────────────────────────────────────────────────────────────

interface Raster {
  readonly c: HTMLCanvasElement;
  /** Placement in artboard units. */
  readonly ux: number;
  readonly uy: number;
  readonly uw: number;
  readonly uh: number;
  readonly bytes: number;
}
const CAP = 12 * 1024 * 1024;
const cache = new Map<string, Raster>();
let bytes = 0;
let hits = 0,
  misses = 0;
function cached(key: string, make: () => Raster): Raster {
  const r = cache.get(key);
  if (r) {
    hits++;
    cache.delete(key);
    cache.set(key, r);
    return r;
  }
  misses++;
  const n = make();
  cache.set(key, n);
  bytes += n.bytes;
  for (const [k, v] of cache) {
    if (bytes <= CAP) break;
    if (k === key) continue;
    cache.delete(k);
    bytes -= v.bytes;
  }
  return n;
}
export const cacheStats = () => ({ entries: cache.size, bytes, cap: CAP, hits, misses });
export function clearCache(): void {
  cache.clear();
  bytes = 0;
  hits = misses = 0;
}

const canvas = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
};

/** R14: outline width in CSS px for a body box drawn at `ppu` px per unit. */
export const outlinePx = (p: Prepared, ppu: number) => Math.max(1.25, Math.min(3, 0.035 * p.box.h * ppu));

/** Size buckets (R34), CSS px of the body box's long side. 256 is an extra bucket for big leaps on tablets. */
const BUCKETS = [24, 32, 48, 64, 96, 160, 256];
const bucketFor = (px: number) => BUCKETS.find((b) => b >= px * 0.98) ?? BUCKETS[BUCKETS.length - 1]!;
const quantScale = (s: number) => Math.max(1, Math.round(s * 2) / 2);

// ─── layer rasterisation ──────────────────────────────────────────────────────────────────────

interface LayerSpec {
  readonly ppu: number; // CSS px per unit
  readonly dev: number; // device px per CSS px
  readonly night: boolean;
  readonly golden: boolean;
}
/** `all` = fills + outline; `ink` = outline/rim only; `fill` = everything but the outline (seamless chains). */
type Mode = 'all' | 'ink' | 'fill';

const scaleBox = (b: Box, s: number, [px, py]: readonly [number, number]): Box =>
  s === 1 ? b : { x: px + (b.x - px) * s, y: py + (b.y - py) * s, w: b.w * s, h: b.h * s };

function buildLayer(p: Prepared, pg: PGroup, s: LayerSpec, mode: Mode, step: number, scale: number): Raster {
  const { ppu, dev, night } = s;
  const col = colorsFor(p.art, s.golden);
  const k = outlinePx(p, ppu); // CSS px
  const glow = night && mode !== 'ink' && pg.parts.some((q) => q.part.role === 'light');
  const pad = k + (night ? 2 : 0) + (glow ? 6 : 0) + 1; // CSS px
  const b = scaleBox(pg.box, scale, pg.pivot);
  const W = (b.w * ppu + pad * 2) * dev,
    H = (b.h * ppu + pad * 2) * dev;
  const c = canvas(W, H);
  const g = c.getContext('2d')!;
  const sc = ppu * dev;
  g.setTransform(sc, 0, 0, sc, (pad - b.x * ppu) * dev, (pad - b.y * ppu) * dev);
  if (scale !== 1) {
    // geometry grows about the pivot; stroke widths are divided back so the outline keeps its weight
    g.translate(pg.pivot[0], pg.pivot[1]);
    g.scale(scale, scale);
    g.translate(-pg.pivot[0], -pg.pivot[1]);
  }
  const u = 1 / scale; // keeps stroke widths constant under the geometry scale
  g.lineJoin = 'round';
  g.lineCap = 'round';
  const fills = pg.parts.filter((q) => (q.part.kind ?? 'fill') === 'fill');
  const outlined = fills.filter((q) => q.part.outline !== false);
  if (mode === 'ink') {
    if (night) {
      g.strokeStyle = SHARED.rim;
      g.globalAlpha = rimAlpha(p.art.palette.body);
      g.lineWidth = ((2 * k + 2) / ppu) * u;
      for (const q of outlined) g.stroke(path2d(q));
      g.globalAlpha = 1;
    }
    g.strokeStyle = col.ink;
    g.lineWidth = ((2 * k) / ppu) * u;
    for (const q of outlined) g.stroke(path2d(q));
    return {
      c,
      ux: b.x - pad / ppu,
      uy: b.y - pad / ppu,
      uw: W / dev / ppu,
      uh: H / dev / ppu,
      bytes: c.width * c.height * 4,
    };
  }
  // 1. fills, back to front
  for (const q of fills) {
    g.globalAlpha = q.part.alpha ?? 1;
    g.fillStyle = partColor(col, q.part, step, s.golden);
    g.fill(path2d(q));
  }
  g.globalAlpha = 1;
  // 2. patterns, lines, highlight and shade: clipped to what's already there (the silhouette)
  g.globalCompositeOperation = 'source-atop';
  for (const q of pg.parts) {
    const kind = q.part.kind ?? 'fill';
    if (kind === 'pattern') {
      if (Math.min(q.box.w, q.box.h) * ppu * scale < 3) continue; // R18: drop sub-3 px features
      g.globalAlpha = q.part.alpha ?? 1;
      g.fillStyle = partColor(col, q.part, step, s.golden);
      g.fill(path2d(q));
    } else if (kind === 'line') {
      g.globalAlpha = q.part.alpha ?? 1;
      g.strokeStyle = q.part.role === 'ink' ? col.ink : partColor(col, q.part, step, s.golden);
      g.lineWidth = Math.max(q.part.w ?? (0.5 * k) / ppu, 0.8 / ppu) * u;
      g.stroke(path2d(q));
    }
  }
  g.globalAlpha = 1;
  if (pg.g.id === (p.art.shineOn ?? 'body')) {
    if (p.art.shine) {
      p.shine ??= new Path2D(p.art.shine);
      if (s.golden) {
        const bb = p.box;
        const gr = g.createLinearGradient(bb.x, bb.y, bb.x + bb.w * 0.6, bb.y + bb.h * 0.7);
        gr.addColorStop(0, 'rgba(255,255,255,0.75)');
        gr.addColorStop(1, 'rgba(255,248,214,0.1)');
        g.fillStyle = gr;
      } else {
        g.fillStyle = SHARED.white;
        g.globalAlpha = night ? 0.18 : 0.28;
      }
      g.fill(p.shine);
      g.globalAlpha = 1;
    }
    if (p.art.shade) {
      p.shade ??= new Path2D(p.art.shade);
      g.fillStyle = col.ink;
      g.globalAlpha = 0.12;
      g.fill(p.shade);
      g.globalAlpha = 1;
    }
  }
  // 3. the ink outline behind everything (internal joins vanish), then the Night rim behind that
  if (mode === 'all') {
    g.globalCompositeOperation = 'destination-over';
    g.strokeStyle = col.ink;
    g.lineWidth = ((2 * k) / ppu) * u;
    for (const q of outlined) g.stroke(path2d(q));
    if (night) {
      g.strokeStyle = SHARED.rim;
      g.globalAlpha = rimAlpha(p.art.palette.body);
      g.lineWidth = ((2 * k + 2) / ppu) * u;
      for (const q of outlined) g.stroke(path2d(q));
      g.globalAlpha = 1;
    }
  }
  g.globalCompositeOperation = 'source-over';
  // 4. baked glow on light organs at night (R15) — the only shadowBlur, and only at build time
  if (glow) {
    g.shadowColor = col.light;
    g.shadowBlur = 6 * dev;
    g.fillStyle = col.light;
    for (const q of pg.parts) if (q.part.role === 'light' && (q.part.kind ?? 'fill') !== 'line') g.fill(path2d(q));
    g.shadowBlur = 0;
  }
  return {
    c,
    ux: b.x - pad / ppu,
    uy: b.y - pad / ppu,
    uw: W / dev / ppu,
    uh: H / dev / ppu,
    bytes: c.width * c.height * 4,
  };
}

function layer(p: Prepared, pg: PGroup, s: LayerSpec, mode: Mode, cycle: number, scale: number): Raster {
  const step = cycle % pg.cycleLen;
  const key = `L|${p.art.id}|${pg.g.id}|${mode}|${step}|${scale}|${s.ppu.toFixed(3)}|${s.dev}|${s.night ? 1 : 0}|${s.golden ? 1 : 0}`;
  return cached(key, () => buildLayer(p, pg, s, mode, step, scale));
}

// ─── posing ───────────────────────────────────────────────────────────────────────────────────

function applyXf(g: G, xf: Xf | undefined, px: number, py: number, sx = 1, sy = 1): void {
  if (!xf) return;
  const ax = xf.sx / sx,
    ay = xf.sy / sy;
  if (xf.tx === 0 && xf.ty === 0 && xf.rot === 0 && ax === 1 && ay === 1) return;
  g.translate(px + xf.tx, py + xf.ty);
  if (xf.rot) g.rotate(xf.rot);
  if (ax !== 1 || ay !== 1) g.scale(ax, ay);
  g.translate(-px, -py);
}

/** The pre-rasterised scale step nearest the group's current scale (1 when it has none). */
function stepFor(pg: PGroup, xf: Xf | undefined): number {
  const steps = pg.g.scaleSteps;
  if (!steps?.length || !xf) return 1;
  const s = Math.sqrt(Math.abs(xf.sx * xf.sy));
  let best = 1,
    d = Infinity;
  for (const st of [1, ...steps]) {
    const e = Math.abs(Math.log(s / st));
    if (e < d) [best, d] = [st, e];
  }
  return best;
}

/** Draw the posed creature in artboard units (context already scaled so 1 unit = ppu CSS px). */
function drawPosed(
  g: G,
  p: Prepared,
  ps: Pose,
  s: LayerSpec,
  drawPpu = s.ppu,
  extra: { hide?: readonly string[]; zzz?: boolean; t?: number } = {},
): void {
  const art = p.art;
  const col = colorsFor(art, s.golden);
  const b = p.box;
  const rx = b.x + b.w / 2,
    ry = art.ground ? b.y + b.h : b.y + b.h / 2;
  const faceG = art.face.g ?? 'body';
  const visible = (pg: PGroup) => {
    if (extra.hide?.includes(pg.g.id)) return false;
    if (!pg.g.prop) return true;
    if (!ps.shown.has(pg.g.id)) return false;
    const xf = ps.groups.get(pg.g.id);
    return !(xf && Math.abs(xf.sx * xf.sy) < 1e-3);
  };
  const place = (pg: PGroup, mode: Mode) => {
    const xf = ps.groups.get(pg.g.id);
    const st = stepFor(pg, xf);
    g.save();
    if (!pg.g.prop || pg.g.followRoot) applyXf(g, ps.root, rx, ry);
    applyXf(g, xf, pg.pivot[0], pg.pivot[1], st, st);
    const r = layer(p, pg, s, mode, ps.cycle, st);
    g.drawImage(r.c, r.ux, r.uy, r.uw, r.uh);
    return st;
  };
  let inked = false;
  for (const pg of p.groups) {
    if (!visible(pg)) continue;
    if (pg.g.seamless && !inked) {
      // all seamless outlines in one pass behind all seamless fills: no seams at the joints
      inked = true;
      for (const q of p.groups)
        if (q.g.seamless && visible(q)) {
          place(q, 'ink');
          g.restore();
        }
    }
    const st = place(pg, pg.g.seamless ? 'fill' : 'all');
    if (pg.g.id === faceG) {
      if (st !== 1) {
        // the face follows the group's full scale (the layer carries the step, the face doesn't)
        g.translate(pg.pivot[0], pg.pivot[1]);
        g.scale(st, st);
        g.translate(-pg.pivot[0], -pg.pivot[1]);
      }
      drawFace(
        g,
        art.face,
        ps.face,
        { ink: col.ink, lid: col[art.face.lid ?? 'body'], body: col.body },
        {
          ppu: drawPpu,
          k: outlinePx(p, drawPpu) / drawPpu,
          night: s.night,
          eye: p.eye,
          bodyL: col.bodyL,
          zzz: extra.zzz,
          t: extra.t,
        },
      );
    }
    g.restore();
  }
}

function sparkle(g: G, x: number, y: number, r: number): void {
  g.beginPath();
  g.moveTo(x, y - r);
  g.quadraticCurveTo(x, y, x + r, y);
  g.quadraticCurveTo(x, y, x, y + r);
  g.quadraticCurveTo(x, y, x - r, y);
  g.quadraticCurveTo(x, y, x, y - r);
  g.fill();
}

/** R29 golden: 3 orbiting twinkles (animated) or 2 static ones (tiles). Units, around the body box. */
function goldenSparkles(g: G, p: Prepared, t: number | undefined): void {
  const b = p.box;
  const cx = b.x + b.w / 2,
    cy = b.y + b.h / 2;
  const R = p.long * 0.56;
  g.fillStyle = '#FFF6D0';
  if (t === undefined) {
    sparkle(g, cx + R * 0.78, cy - R * 0.62, p.long * 0.07);
    sparkle(g, cx - R * 0.82, cy - R * 0.38, p.long * 0.045);
    return;
  }
  const prev = g.globalAlpha;
  for (let i = 0; i < 3; i++) {
    const a = t * 0.9 + (i * Math.PI * 2) / 3;
    const tw = 0.5 + 0.5 * Math.sin(t * 5 + i * 2.1);
    g.globalAlpha = prev * (0.35 + 0.65 * tw);
    sparkle(g, cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.8, p.long * (0.035 + 0.04 * tw));
  }
  g.globalAlpha = prev;
}

// ─── public entry ─────────────────────────────────────────────────────────────────────────────

/** Device px per CSS px of the current transform (includes DPR and caller scaling). */
function deviceScale(g: G): number {
  const m = g.getTransform();
  return Math.hypot(m.a, m.b) || 1;
}

function silhouetteRaster(p: Prepared, ppu: number, dev: number): Raster {
  const key = `S|${p.art.id}|${ppu.toFixed(3)}|${dev}`;
  return cached(key, () => {
    const b = p.all;
    const pad = 1;
    const W = (b.w * ppu + pad * 2) * dev,
      H = (b.h * ppu + pad * 2) * dev;
    const c = canvas(W, H);
    const g = c.getContext('2d')!;
    const sc = ppu * dev;
    g.setTransform(sc, 0, 0, sc, (pad - b.x * ppu) * dev, (pad - b.y * ppu) * dev);
    g.fillStyle = '#000';
    for (const pg of p.groups)
      if (!pg.g.prop)
        for (const q of pg.parts) if ((q.part.kind ?? 'fill') === 'fill' && q.part.outline !== false) g.fill(path2d(q));
    return {
      c,
      ux: b.x - pad / ppu,
      uy: b.y - pad / ppu,
      uw: W / dev / ppu,
      uh: H / dev / ppu,
      bytes: c.width * c.height * 4,
    };
  });
}

/** Tinted copy of the silhouette mask (cached; tinting is a build-time composite, never per frame). */
function tinted(p: Prepared, ppu: number, dev: number, color: string): Raster {
  const key = `T|${p.art.id}|${ppu.toFixed(3)}|${dev}|${color}`;
  return cached(key, () => {
    const m = silhouetteRaster(p, ppu, dev);
    const c = canvas(m.c.width, m.c.height);
    const g = c.getContext('2d')!;
    g.drawImage(m.c, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    return { ...m, c };
  });
}

function compositeRaster(p: Prepared, s: LayerSpec, expr: Expression, o: RenderOpts): Raster {
  const key = `C|${p.art.id}|${s.ppu.toFixed(3)}|${s.dev}|${s.night ? 1 : 0}|${s.golden ? 1 : 0}|${expr}|${o.signatureAt ?? ''}|${o.zzz ? 1 : 0}|${o.hide?.join(',') ?? ''}`;
  return cached(key, () => {
    const b = p.all;
    const m = 0.2 * p.long; // room for static expression transforms, the "z", golden sparkles
    const k = outlinePx(p, s.ppu) + 3;
    const W = ((b.w + 2 * m) * s.ppu + 2 * k) * s.dev,
      H = ((b.h + 2 * m) * s.ppu + 2 * k) * s.dev;
    const c = canvas(W, H);
    const g = c.getContext('2d')!;
    const sc = s.ppu * s.dev;
    const ox = (k + (m - b.x) * s.ppu) * s.dev,
      oy = (k + (m - b.y) * s.ppu) * s.dev;
    g.setTransform(sc, 0, 0, sc, ox, oy);
    drawPosed(g, p, pose(p.art, { ...o, expression: expr }), s, s.ppu, { hide: o.hide, zzz: o.zzz });
    if (s.golden) goldenSparkles(g, p, undefined);
    return { c, ux: -ox / sc, uy: -oy / sc, uw: W / sc, uh: H / sc, bytes: c.width * c.height * 4 };
  });
}

/**
 * Draw a creature with its body-box centre at (x, y). `opts.size` = CSS px of the body box's long
 * side. With `t` it animates (idle loop, blinks, signature); without, it's one cached sprite.
 */
export function renderCreature(g: G, art: SpeciesArt, x: number, y: number, o: RenderOpts): void {
  const p = prepare(art);
  const ppuExact = o.size / p.long;
  const dev = quantScale(deviceScale(g));
  const b = p.box;
  g.save();
  g.translate(x, y);
  if (o.angle) g.rotate(o.angle);
  const f = o.facing ?? 1;
  g.scale(f * ppuExact, ppuExact);
  g.translate(-(b.x + b.w / 2), -(b.y + b.h / 2));
  // from here on: 1 unit = ppuExact CSS px
  if (o.silhouette) {
    const r = tinted(p, ppuExact, dev, o.silhouette);
    g.globalAlpha *= o.silhouetteAlpha ?? 1;
    g.drawImage(r.c, r.ux, r.uy, r.uw, r.uh);
    g.restore();
    return;
  }
  const night = !!o.night,
    golden = !!o.golden;
  const animated = o.t !== undefined || o.action !== undefined;
  if (!animated) {
    const r = compositeRaster(p, { ppu: ppuExact, dev, night, golden }, o.expression ?? 'idle', o);
    g.drawImage(r.c, r.ux, r.uy, r.uw, r.uh);
  } else {
    // layers come from the nearest size bucket at or above the drawn size, then scale down
    const ppuB = bucketFor(o.size) / p.long;
    drawPosed(g, p, pose(art, o), { ppu: ppuB, dev, night, golden }, ppuExact, { hide: o.hide, zzz: o.zzz, t: o.t });
    if (golden) goldenSparkles(g, p, o.t);
  }
  g.restore();
}
