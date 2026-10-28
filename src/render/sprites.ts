/**
 * Pre-rendered block sprites (one per look × theme × color × size × state × per-cell variant) so the
 * per-frame cost of a block is a single drawImage. Cache is invalidated when cell size or DPR changes.
 *
 * The default 'reef' style (ADR 0014) draws six real materials, one per colour: brain coral, golden
 * coral-rag limestone, sea glass, blue coral, wet porphyry and pink coralline crust. Each has an
 * organic silhouette within a few % of the cell, one top-left light (lit ridges, dark crevices), its
 * own micro-structure, a contact shadow and a wet highlight. Detail is chosen by tile size (LOD), and
 * three seeded variants per colour keep walls from tiling. Everything is deterministic.
 */
import { GEOM, type Palette } from './theme.ts';
import { LOOKS, type SkinLook } from './skins.ts';

export type Variant = 'normal' | 'lit';
type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
type Surface = HTMLCanvasElement | OffscreenCanvas;

/** Seeded variants per colour (reef style). */
export const VARIANTS = 3;
/** Variant of a board cell (0..2): a fixed hash of the index, so a saved board looks the same. */
export const cellVariant = (i: number): number => (Math.imul(i + 11, 0x9e3779b1) >>> 16) % VARIANTS;

/**
 * The edges that separate a reef stone from an empty cell (WCAG 1.4.11, 3:1 for graphics): by day
 * the dark lip under the stone, by night a thin moonlit rim (the lip is lost on the navy board).
 * tests/unit/contrast.test.ts checks every colour against the cell.
 */
export const reefEdge = (base: string, night: boolean): { lip: string; rim: string | null } => ({
  lip: shade(base, night ? -0.46 : -0.44),
  rim: night ? shade(base, 0.3) : null,
});

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt))));
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `rgb(${r},${g},${b})`;
}

/** mulberry32: deterministic visual randomness (never Math.random at draw time). */
function rng(a: number): () => number {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Silhouette per material: superellipse exponent (higher = squarer), edge wobble (share of the
 * half-size), two wobble frequencies, wet highlight strength.
 */
const MAT: readonly (readonly [n: number, wob: number, f1: number, f2: number, spec: number])[] = [
  [4, 0, 1, 1, 0],
  // spec: only the wet pebble shines; coral and stone are matte, the glass is frosted (critic r2:
  // one shared hot glint turned the whole set into candy)
  [3.1, 0.022, 3, 7, 0.2], // 1 brain coral: a dome, soft lumps, matte
  [4.6, 0.03, 4, 9, 0.1], // 2 sandstone: a chunky worn lump, matte
  [3.3, 0.012, 2, 4, 0], // 3 sea glass: tumbled soft, frosted (no shine at all)
  [5.2, 0.014, 3, 6, 0.18], // 4 blue coral: packed lobes, matte caps
  [3.0, 0.01, 2, 5, 0.42], // 5 porphyry: a damp beach-worn pebble, the only stone with a glint
  [3.5, 0.04, 6, 9, 0.08], // 6 coralline crust: lumpy, chalky
];

/** Unit silhouettes per (material, variant): computed once, scaled per sprite. */
const SHAPES = new Map<number, Float32Array>();

/** Superellipse with a seeded wobble, smoothed through midpoints. */
function blob(g: Ctx | Path2D, cx: number, cy: number, hw: number, hh: number, color: number, ph: number): void {
  const id = color * 64 + Math.round(ph * 10);
  let u = SHAPES.get(id);
  if (!u) {
    const [n, wob, f1, f2] = MAT[color] ?? MAT[0]!;
    u = new Float32Array(64);
    for (let k = 0; k < 32; k++) {
      const t = (k / 32) * Math.PI * 2;
      const c = Math.cos(t);
      const s = Math.sin(t);
      const r = 1 + wob * (0.6 * Math.sin(f1 * t + ph) + 0.4 * Math.sin(f2 * t + ph * 2.3));
      u[k * 2] = Math.sign(c) * Math.abs(c) ** (2 / n) * r;
      u[k * 2 + 1] = Math.sign(s) * Math.abs(s) ** (2 / n) * r;
    }
    SHAPES.set(id, u);
  }
  const pts: number[] = [];
  for (let k = 0; k < 32; k++) pts.push(cx + u[k * 2]! * hw, cy + u[k * 2 + 1]! * hh);
  const mid = (i: number, j: number) => (pts[(i * 2 + j) % 64]! + pts[(i * 2 + 2 + j) % 64]!) / 2;
  if (!(g instanceof Path2D)) g.beginPath();
  g.moveTo(mid(0, 0), mid(0, 1));
  for (let i = 1; i <= 32; i++) g.quadraticCurveTo(pts[(i % 32) * 2]!, pts[(i % 32) * 2 + 1]!, mid(i, 0), mid(i, 1));
  g.closePath();
}

export class SpriteCache {
  private cache = new Map<string, Surface>();
  look: SkinLook = LOOKS.pebble!;
  constructor(private dpr: number) {}

  setLook(l: SkinLook): void {
    this.look = l;
  }

  reset(dpr: number): void {
    this.dpr = dpr;
    this.cache.clear();
    this.built.clear();
  }

  /**
   * Lazy mode (the live scene): a sprite that isn't built yet is stood in for by the nearest one
   * already built for that stone (another size or variant; the caller scales it anyway), so a
   * frame never pays for drawing a material: in-between sizes of a drag or a tray return, and
   * variants before the idle warm-up reaches them. Only a stone with nothing built yet is drawn.
   */
  lazy = false;
  private built = new Map<string, [size: number, v: number, c: Surface][]>();

  /** `vari` (0..2) picks a seeded variant of the reef materials; other styles have one look. */
  pebble(p: Palette, color: number, size: number, variant: Variant = 'normal', vari = 0): CanvasImageSource {
    return this.get(p, color, size, variant, vari, this.lazy);
  }

  /** Build (if needed) and return the exact sprite, lazy mode or not (warm-up). */
  build(p: Palette, color: number, size: number, variant: Variant = 'normal', vari = 0): CanvasImageSource {
    return this.get(p, color, size, variant, vari, false);
  }

  private get(p: Palette, color: number, size: number, variant: Variant, vari: number, lazy: boolean): Surface {
    const reef = this.look.style === 'reef';
    const v = reef ? vari % VARIANTS : 0;
    const stone = `${this.look.id}:${p.name}:${color}:${variant}`;
    const key = `${stone}:${size}:${v}`;
    let c = this.cache.get(key);
    if (c) return c;
    const have = this.built.get(stone) ?? [];
    if (lazy && have.length) {
      // same variant first, then the closest size (larger wins a tie: downscaling stays crisp)
      let best = have[0]!;
      const cost = (e: [number, number, Surface]) =>
        (e[1] === v ? 0 : 1000) + Math.abs(e[0] - size) - (e[0] >= size ? 0.5 : 0);
      for (const e of have) if (cost(e) < cost(best)) best = e;
      return best[2];
    }
    c = reef
      ? variant === 'lit'
        ? this.litReef(p, color, size, v)
        : this.drawReef(p, color, size, v)
      : this.drawPebble(p, color, size, variant);
    this.cache.set(key, c);
    have.push([size, v, c]);
    this.built.set(stone, have);
    return c;
  }

  /** Night-theme halo (2× cell, soft radial) for additive glow under pebbles. */
  glow(color: number, size: number): CanvasImageSource {
    const key = `glow:${this.look.id}:${color}:${size}`;
    let c = this.cache.get(key);
    if (!c) {
      const px = Math.ceil(size * 2 * this.dpr);
      c = this.canvas(px);
      const g = c.getContext('2d') as CanvasRenderingContext2D;
      g.scale(this.dpr, this.dpr);
      const base = this.look.colors[color] ?? '#888888';
      const r = g.createRadialGradient(size, size, size * 0.2, size, size, size);
      r.addColorStop(0, base);
      r.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = r;
      g.fillRect(0, 0, size * 2, size * 2);
      this.cache.set(key, c);
    }
    return c;
  }

  private canvas(px: number): Surface {
    if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(px, px);
    const c = document.createElement('canvas');
    c.width = px;
    c.height = px;
    return c;
  }

  private ctx(size: number): [Surface, CanvasRenderingContext2D] {
    const c = this.canvas(Math.ceil(size * this.dpr));
    const g = c.getContext('2d') as CanvasRenderingContext2D;
    g.scale(this.dpr, this.dpr);
    return [c, g];
  }

  /** The face silhouette of a reef sprite (shared by the normal and lit drawings). */
  private face(g: Ctx | Path2D, size: number, color: number, v: number, inset = 0): void {
    const gut = size * GEOM.gutter;
    const s = size - gut * 2;
    blob(g, size / 2, gut + s * 0.45, s / 2 - inset, s * 0.45 - inset, color, 1.3 + v * 2.1 + color);
  }

  /** "This will be captured": the same stone, lifted toward the light, with the ring outline. */
  private litReef(p: Palette, color: number, size: number, v: number): Surface {
    const [c, g] = this.ctx(size);
    g.drawImage(this.build(p, color, size, 'normal', v), 0, 0, size, size);
    const s = size * (1 - GEOM.gutter * 2);
    this.face(g, size, color, v);
    // a light lift, not a whitewash: the material stays readable on a lit ring (critic r2), the
    // outline carries the "this will be captured" signal
    g.fillStyle = p.name === 'night' ? 'rgba(220,250,255,0.1)' : 'rgba(255,255,255,0.12)';
    g.fill();
    g.strokeStyle = p.ringOutline;
    g.globalAlpha = 0.9;
    g.lineWidth = Math.max(2, s * 0.075);
    this.face(g, size, color, v, g.lineWidth / 2);
    g.stroke();
    g.globalAlpha = 1;
    return c;
  }

  private drawReef(p: Palette, color: number, size: number, v: number): Surface {
    const [c, g] = this.ctx(size);
    const base = this.look.colors[color] ?? '#888888';
    const night = p.name === 'night';
    const gut = size * GEOM.gutter;
    const s = size - gut * 2;
    const h = s * 0.9;
    const x0 = gut;
    const y0 = gut;
    const cx = size / 2;
    const ph = 1.3 + v * 2.1 + color;
    const lod = size < 30 ? 0 : size < 50 ? 1 : 2;
    const rnd = rng(color * 7919 + v * 104729 + 17);
    const spec = MAT[color]![4];
    const lt = shade(base, night ? 0.42 : 0.38);
    const fillPath = (path: Path2D, style: string, a = 1) => {
      g.globalAlpha = a;
      g.fillStyle = style;
      g.fill(path);
      g.globalAlpha = 1;
    };
    // the face first; everything on it is drawn 'source-atop' (no clip masks: they are the
    // costly part of a small canvas), then the lip and shadow go in behind ('destination-over')
    const face = new Path2D();
    this.face(face, size, color, v);
    g.fillStyle = base;
    g.fill(face);
    g.globalCompositeOperation = 'source-atop';
    const dots = (n: number, rMin: number, rMax: number): number[][] => {
      const out: number[][] = [];
      for (let i = 0; i < n; i++)
        out.push([x0 + s * (0.08 + 0.84 * rnd()), y0 + h * (0.08 + 0.84 * rnd()), rMin + (rMax - rMin) * rnd()]);
      return out;
    };
    const disc = (path: Path2D, x: number, y: number, r: number) => {
      path.moveTo(x + r, y);
      path.arc(x, y, r, 0, Math.PI * 2);
    };
    // grain this small reads the same as a square and costs a fraction of an arc
    const speck = (path: Path2D, x: number, y: number, r: number) => path.rect(x - r, y - r, r * 1.8, r * 1.8);

    if (color === 1) {
      // brain coral: a labyrinth of thick rounded ridges (a random spanning tree of a jittered
      // grid, each run bowed so it meanders) over narrow valleys; ridges drop a shadow down-right
      // and catch the light on their upper-left crest
      const G = 5 + lod;
      const cw = s / G;
      const ch = h / G;
      const P: number[][] = [];
      for (let j = 0; j < G; j++)
        for (let i = 0; i < G; i++)
          P.push([x0 + (i + 0.5 + (rnd() - 0.5) * 0.55) * cw, y0 + (j + 0.5 + (rnd() - 0.5) * 0.55) * ch]);
      const seen = new Uint8Array(G * G);
      const ridge = new Path2D();
      const first = Math.floor(rnd() * G * G);
      const stack = [first];
      seen[first] = 1;
      let fresh = true;
      while (stack.length) {
        const at = stack[stack.length - 1]!;
        const ax = at % G;
        const nb = [ax > 0 ? at - 1 : -1, ax < G - 1 ? at + 1 : -1, at - G, at + G].filter(
          (q) => q >= 0 && q < G * G && !seen[q],
        );
        if (!nb.length) {
          stack.pop();
          fresh = true;
          continue;
        }
        const q = nb[Math.floor(rnd() * nb.length)]!;
        seen[q] = 1;
        const [ex, ey] = P[at]!;
        const [qx, qy] = P[q]!;
        if (fresh) ridge.moveTo(ex!, ey!);
        fresh = false;
        ridge.quadraticCurveTo(
          (ex! + qx!) / 2 + (rnd() - 0.5) * cw * 0.5,
          (ey! + qy!) / 2 + (rnd() - 0.5) * ch * 0.5,
          qx!,
          qy!,
        );
        stack.push(q);
      }
      g.fillStyle = shade(base, night ? -0.4 : -0.32);
      g.fillRect(x0, y0, s, h);
      const w = cw * 0.64;
      const d = Math.max(0.5, w * 0.16);
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.lineWidth = w;
      g.translate(d, d);
      g.strokeStyle = shade(base, night ? -0.58 : -0.5);
      g.stroke(ridge);
      g.translate(-d, -d);
      g.strokeStyle = shade(base, 0.08);
      g.stroke(ridge);
      g.translate(-d * 0.8, -d * 0.8);
      g.lineWidth = w * 0.36;
      g.globalAlpha = 0.55;
      g.strokeStyle = shade(base, 0.42);
      g.stroke(ridge);
      g.globalAlpha = 1;
      g.translate(d * 0.8, d * 0.8);
    } else if (color === 2) {
      // golden sandstone, beach-worn: wavy bedding layers in ochre tones (each bed lit on its top
      // edge, a thin dark parting below), gritty grain, and a few weathering pits
      const beds = [4, 5, 7][lod]!;
      const ang = 0.09 + (rnd() - 0.5) * 0.12; // a 5–8° cross-bedding tilt
      const amp = h * (0.03 + rnd() * 0.03);
      const fr = (Math.PI * 2) / (s * (0.8 + rnd() * 0.6));
      const p0 = rnd() * 6.3;
      let yb = y0 - h * 0.1;
      for (let i = 0; i < beds; i++) {
        const th = ((h * 1.25) / beds) * (0.7 + rnd() * 0.6);
        const tone = shade(base, [0.12, -0.12, 0.04, -0.2, 0.16, -0.06, 0.08][i % 7]!);
        const bed = new Path2D();
        const edge = new Path2D();
        const yy = (u: number, o: number) => o + Math.sin(fr * u + p0 + i * 0.7) * amp + (u - x0 - s / 2) * ang;
        for (let k = 0; k <= 10; k++) {
          const u = x0 - 2 + ((s + 4) * k) / 10;
          bed[k ? 'lineTo' : 'moveTo'](u, yy(u, yb));
          edge[k ? 'lineTo' : 'moveTo'](u, yy(u, yb));
        }
        for (let k = 10; k >= 0; k--) {
          const u = x0 - 2 + ((s + 4) * k) / 10;
          bed.lineTo(u, yy(u, yb + th));
        }
        bed.closePath();
        fillPath(bed, tone);
        g.lineWidth = Math.max(0.5, s * 0.016);
        g.strokeStyle = shade(base, -0.4);
        g.globalAlpha = 0.5;
        g.stroke(edge);
        g.translate(0, g.lineWidth);
        g.strokeStyle = lt;
        g.stroke(edge);
        g.translate(0, -g.lineWidth);
        g.globalAlpha = 1;
        yb += th;
      }
      const grain = new Path2D();
      const grain2 = new Path2D();
      for (const [x, y, r] of dots(10 + lod * 26, s * 0.01, s * 0.022)) speck(rnd() < 0.5 ? grain : grain2, x!, y!, r!);
      fillPath(grain, lt, 0.6);
      fillPath(grain2, shade(base, -0.45), 0.5);
      const lip = new Path2D();
      const hole = new Path2D();
      for (const [x, y, r] of dots(Math.min(lod, 2), s * 0.02, s * 0.032)) {
        disc(lip, x! + r! * 0.3, y! + r! * 0.3, r!);
        disc(hole, x!, y!, r!);
      }
      fillPath(lip, lt, 0.6);
      fillPath(hole, shade(base, -0.4));
    } else if (color === 3) {
      // sea glass: translucent body (light passes through and glows low-right), frosted skin,
      // tumbled C-marks, and a bright rim where the top-left edge catches the sun
      const glowG = g.createRadialGradient(x0 + s * 0.62, y0 + h * 0.68, 0, x0 + s * 0.62, y0 + h * 0.68, s * 0.6);
      glowG.addColorStop(0, shade(base, 0.38));
      glowG.addColorStop(0.6, base);
      glowG.addColorStop(1, shade(base, -0.12));
      g.fillStyle = glowG;
      g.fillRect(x0, y0, s, h);
      // a matte frosted skin: dense fine pitting, white at low alpha
      const frost = new Path2D();
      for (const [x, y, r] of dots(24 + lod * 60, s * 0.008, s * 0.02)) speck(frost, x!, y!, r!);
      fillPath(frost, '#FFFFFF', 0.18);
      // one or two seed bubbles trapped in the glass (big enough to survive 24 px)
      const bub = new Path2D();
      const bubHi = new Path2D();
      for (const [x, y, r] of dots(1 + (lod > 0 ? 1 : 0), s * (lod ? 0.05 : 0.09), s * (lod ? 0.075 : 0.11))) {
        disc(bub, x!, y!, r!);
        disc(bubHi, x! - r! * 0.3, y! - r! * 0.3, r! * 0.38);
      }
      fillPath(bub, shade(base, -0.22), 0.55);
      fillPath(bubHi, '#FFFFFF', 0.7);
      // thicker glass at the tumbled edge: a deeper, more saturated band inside the outline, so
      // the milky middle reads as frosted and the stone as translucent
      g.strokeStyle = shade(base, -0.3);
      g.globalAlpha = 0.45;
      g.lineWidth = s * 0.13;
      this.face(g, size, color, v, s * 0.02);
      g.stroke();
      g.globalAlpha = 1;
      // the worn edge lets light through: a soft lighter band just inside the outline, all round
      const rim = g.createLinearGradient(x0, y0, x0 + s * 0.8, y0 + h * 0.8);
      rim.addColorStop(0, 'rgba(255,255,255,0.6)');
      rim.addColorStop(0.5, 'rgba(255,255,255,0.22)');
      rim.addColorStop(1, 'rgba(255,255,255,0.36)');
      g.strokeStyle = rim;
      g.lineWidth = Math.max(1.4, s * 0.07);
      this.face(g, size, color, v, s * 0.065);
      g.stroke();
    } else if (color === 4) {
      // blue coral (Heliopora): packed rounded lobes of uneven height with dark grooves; each lobe
      // is a lit cylinder with a paler growing tip and, from 30 px, rows of polyp pores
      g.fillStyle = shade(base, night ? -0.5 : -0.45);
      g.fillRect(x0, y0, s, h);
      const n = v === 2 ? 4 : 3;
      const cw = s / n;
      const pores = new Path2D();
      const poreLip = new Path2D();
      for (let i = 0; i < n; i++) {
        const w = cw * (0.82 + rnd() * 0.12);
        const x = x0 + i * cw + (cw - w) / 2 + (rnd() - 0.5) * cw * 0.08;
        const top = y0 + h * (0.01 + rnd() * 0.2);
        const gr = g.createLinearGradient(x, 0, x + w, 0);
        gr.addColorStop(0, shade(base, 0.38));
        gr.addColorStop(0.4, shade(base, 0.16));
        gr.addColorStop(1, shade(base, -0.16));
        g.fillStyle = gr;
        g.beginPath();
        g.roundRect(x, top, w, h * 1.3, w / 2);
        g.fill();
        const tip = g.createRadialGradient(x + w * 0.42, top + w * 0.38, 0, x + w * 0.42, top + w * 0.38, w * 0.55);
        tip.addColorStop(0, shade(base, 0.42)); // a matte growing tip, not a glossy cap
        tip.addColorStop(1, shade(base, 0.1).replace('rgb', 'rgba').replace(')', ',0)'));
        g.fillStyle = tip;
        g.fillRect(x, top, w, w);
        if (lod) {
          const rows = 2 + lod * 2;
          for (let k = 0; k < rows; k++)
            for (let m = 0; m < lod; m++) {
              const px = x + w * (lod === 1 ? 0.5 : 0.3 + m * 0.4) + (rnd() - 0.5) * w * 0.2;
              const py = top + w * 0.8 + ((h - w * 0.5) / rows) * (k + (m ? 0.5 : 0));
              const r = s * (0.026 - lod * 0.005);
              disc(poreLip, px + r * 0.35, py + r * 0.45, r);
              disc(pores, px, py, r);
            }
        }
      }
      fillPath(poreLip, lt, night ? 0.8 : 0.6);
      fillPath(pores, shade(base, night ? -0.62 : -0.55));
    } else if (color === 5) {
      // porphyry: dark lilac groundmass set with pale angular feldspar crystals and a few black
      // flecks, tumbled smooth and wet (the strongest highlight in the set)
      const wet = g.createLinearGradient(0, y0, 0, y0 + h);
      // (Night: the same dark face; the moonlit rim, not a lighter body, separates it from the
      // board — a lighter purple drifted toward blue coral under deuteranopia)
      wet.addColorStop(0, shade(base, -0.02));
      wet.addColorStop(1, shade(base, -0.34));
      g.fillStyle = wet;
      g.fillRect(x0, y0, s, h);
      const xl = new Path2D();
      const mafic = new Path2D();
      // feldspar laths: small cream rectangles, roughly aligned (0–35°) as they are in the rock;
      // at 24 px two or three larger ones carry it
      const laths = (path: Path2D, n: number, lMin: number, lMax: number, aspect: number) => {
        const tilt = rnd() * 0.6;
        for (const [x, y, l] of dots(n, lMin, lMax)) {
          const a = tilt + rnd() * 0.6;
          const ca = Math.cos(a);
          const sa = Math.sin(a);
          const hl = l! / 2;
          const hw = (l! * aspect) / 2;
          path.moveTo(x! + ca * hl - sa * hw, y! + sa * hl + ca * hw);
          path.lineTo(x! - ca * hl - sa * hw, y! - sa * hl + ca * hw);
          path.lineTo(x! - ca * hl + sa * hw, y! - sa * hl - ca * hw);
          path.lineTo(x! + ca * hl + sa * hw, y! + sa * hl - ca * hw);
          path.closePath();
        }
      };
      // the groundmass is granular, not glossy: a fine salt-and-pepper of dark and pale grains
      const gDark = new Path2D();
      const gPale = new Path2D();
      for (const [x, y, r] of dots(14 + lod * 40, s * 0.01, s * 0.022)) speck(rnd() < 0.6 ? gDark : gPale, x!, y!, r!);
      fillPath(gDark, shade(base, -0.5), 0.55);
      fillPath(gPale, shade(base, 0.35), 0.45);
      laths(xl, [3, 5, 6][lod]!, s * [0.14, 0.11, 0.09][lod]!, s * [0.18, 0.15, 0.13][lod]!, 0.7);
      laths(mafic, [2, 4, 7][lod]!, s * 0.035, s * 0.06, 0.6);
      fillPath(xl, '#EFDDE6', 0.9);
      fillPath(mafic, shade(base, -0.75), 0.8);
    } else {
      // pink coralline crust: chalky encrusting algae over rock, raised in a few low knobs (lit
      // top-left, shadowed low-right), with the pale growing margin real crusts have
      // many small knobs (a crust, not popcorn)
      const knobs = dots([5, 9, 12][lod]!, s * (lod ? 0.075 : 0.11), s * (lod ? 0.13 : 0.16));
      if (lod > 1) knobs.push(...dots(8, s * 0.035, s * 0.06));
      const sh = new Path2D();
      const body = new Path2D();
      const hi = new Path2D();
      // knobbly, irregular lumps (not circles): one seeded wobble per knob, shared by its layers
      const lump = (path: Path2D, x: number, y: number, r: number, k: readonly number[]) => {
        for (let i = 0; i <= 7; i++) {
          const a = (i / 7) * Math.PI * 2;
          const rr = r * k[i % 7]!;
          path[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        }
        path.closePath();
      };
      for (const [x, y, r] of knobs) {
        const k = Array.from({ length: 7 }, () => 0.78 + rnd() * 0.36);
        lump(sh, x! + r! * 0.2, y! + r! * 0.26, r!, k);
        lump(body, x!, y!, r! * 0.95, k);
        lump(hi, x! - r! * 0.28, y! - r! * 0.3, r! * 0.5, k);
      }
      fillPath(sh, shade(base, night ? -0.5 : -0.42), 0.7);
      fillPath(body, base);
      fillPath(hi, shade(base, 0.36), 0.85);
      const chalk = new Path2D();
      for (const [x, y, r] of dots(6 + lod * 22, s * 0.01, s * 0.02)) speck(chalk, x!, y!, r!);
      fillPath(chalk, shade(base, 0.7), 0.5);
      g.strokeStyle = shade(base, 0.62);
      g.globalAlpha = 0.8;
      g.lineWidth = Math.max(0.9, s * 0.045);
      this.face(g, size, color, v, s * 0.01);
      g.stroke();
      g.globalAlpha = 1;
    }

    // volume: lit dome top-left, occluded toward the lower-right edge (tinted, not grey, so the
    // stone keeps its colour)
    const vol = g.createRadialGradient(x0 + s * 0.36, y0 + h * 0.3, s * 0.05, x0 + s * 0.4, y0 + h * 0.36, s * 0.78);
    vol.addColorStop(0, 'rgba(255,255,255,0.12)');
    vol.addColorStop(0.5, 'rgba(255,255,255,0)');
    vol.addColorStop(
      1,
      shade(base, night ? -0.7 : -0.6)
        .replace('rgb', 'rgba')
        .replace(')', ',0.45)'),
    );
    g.fillStyle = vol;
    g.fillRect(x0, y0, s, h);
    // colour grade: the hex's hue and saturation over the material's own light and dark, so the
    // texture lives in luminance and the stone keeps its piece colour (ADR 0014 §CVD)
    g.globalCompositeOperation = 'color';
    g.globalAlpha = 0.6;
    g.fillStyle = base;
    g.fill(face);
    g.globalCompositeOperation = 'source-atop';
    g.globalAlpha = 1;
    // wet highlight: a soft bloom plus a sharp glint
    const hx = x0 + s * 0.3;
    const hy = y0 + h * 0.24;
    const bl = g.createRadialGradient(hx, hy, 0, hx, hy, s * 0.3);
    bl.addColorStop(0, `rgba(255,255,255,${spec * 0.45})`);
    bl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = bl;
    g.fillRect(x0, y0, s, h);
    if (spec > 0.35) {
      g.fillStyle = `rgba(255,255,255,${Math.min(0.95, spec * 1.05)})`;
      g.beginPath();
      g.ellipse(hx - s * 0.02, hy - h * 0.03, s * 0.085, s * 0.04, -0.6, 0, Math.PI * 2);
      g.fill();
    }
    const edge = reefEdge(base, night);
    if (edge.rim) {
      // a thin moonlit outline: the stone's edge against the navy board (≥ 3:1, see reefEdge)
      g.strokeStyle = edge.rim;
      g.lineWidth = Math.max(0.75, s * 0.028);
      this.face(g, size, color, v, s * 0.012);
      g.stroke();
    }
    if (night) {
      // a cool moonlit rim along the top edge separates the stone from the navy board
      const rl = g.createLinearGradient(0, y0, 0, y0 + h * 0.3);
      rl.addColorStop(0, 'rgba(190,240,255,0.3)');
      rl.addColorStop(1, 'rgba(190,240,255,0)');
      g.fillStyle = rl;
      g.fillRect(x0, y0, s, h * 0.3);
    }
    g.globalCompositeOperation = 'destination-over';
    // the side the light doesn't reach
    g.fillStyle = edge.lip;
    blob(g, cx, y0 + s / 2, s / 2, s / 2, color, ph);
    g.fill();
    // soft contact shadow, a little wider than the stone
    g.fillStyle = night ? 'rgba(0,0,0,0.4)' : 'rgba(80,55,30,0.24)';
    blob(g, cx, y0 + s * 0.535, s * 0.505, s * 0.48, color, ph);
    g.fill();
    g.globalCompositeOperation = 'source-over';
    return c;
  }

  /** Sprite covers the full cell (size × size CSS px) including gutter and shadow padding. */
  private drawPebble(p: Palette, color: number, size: number, variant: Variant): Surface {
    const [c, g] = this.ctx(size);
    const base = this.look.colors[color] ?? '#888888';
    const gut = size * GEOM.gutter;
    const x = gut;
    const y = gut;
    const s = size - gut * 2;
    const r = s * GEOM.cellRadius;
    const style = this.look.style;
    const night = p.name === 'night';
    const rr = (yy: number, hh: number) => {
      g.beginPath();
      g.roundRect(x, yy, s, hh, r);
    };
    // contact shadow (all styles)
    g.fillStyle = night ? 'rgba(0,0,0,0.35)' : 'rgba(80,55,30,0.22)';
    rr(y + s * 0.06, s);
    g.fill();
    if (style === 'glyph') {
      g.fillStyle = base;
      rr(y, s);
      g.fill();
      g.lineWidth = Math.max(1.5, s * 0.06);
      g.strokeStyle = night ? '#FFFFFF' : '#1A1A1A';
      rr(y + g.lineWidth / 2, s - g.lineWidth);
      g.stroke();
      drawGlyph(g, color, x + s / 2, y + s / 2, s * 0.22, luminance(base) < 0.35 ? '#FFFFFF' : '#1A1A1A');
    } else if (style === 'lantern') {
      g.fillStyle = night ? '#3A4357' : '#2B2F3A';
      rr(y, s);
      g.fill();
      g.strokeStyle = shade(base, -0.1);
      g.lineWidth = Math.max(1, s * 0.05);
      rr(y + g.lineWidth / 2, s - g.lineWidth);
      g.stroke();
      const glow = g.createRadialGradient(x + s / 2, y + s * 0.46, 0, x + s / 2, y + s * 0.46, s * 0.55);
      glow.addColorStop(0, '#FFFFFF');
      glow.addColorStop(0.25, base);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = glow;
      rr(y, s * 0.92);
      g.fill();
    } else {
      // bottom lip
      g.fillStyle = shade(base, style === 'glass' ? -0.12 : -0.28);
      rr(y, s);
      g.fill();
      // face
      const face = g.createLinearGradient(x, y, x, y + s);
      const hiAmt = variant === 'lit' ? 0.38 : 0.16;
      face.addColorStop(0, shade(base, hiAmt));
      face.addColorStop(1, shade(base, variant === 'lit' ? 0.12 : -0.04));
      g.globalAlpha = style === 'glass' ? 0.9 : 1;
      g.fillStyle = face;
      rr(y, s * 0.9);
      g.fill();
      g.globalAlpha = 1;
      if (style === 'pearl') {
        // iridescent diagonal sheen
        const sh = g.createLinearGradient(x, y + s, x + s, y);
        sh.addColorStop(0.35, 'rgba(255,255,255,0)');
        sh.addColorStop(0.5, 'rgba(255,240,255,0.45)');
        sh.addColorStop(0.62, 'rgba(200,255,250,0.25)');
        sh.addColorStop(0.75, 'rgba(255,255,255,0)');
        g.fillStyle = sh;
        rr(y, s * 0.9);
        g.fill();
      }
      if (style === 'coral') {
        g.fillStyle = shade(base, -0.2);
        for (const [px, py] of [
          [0.3, 0.35],
          [0.62, 0.3],
          [0.48, 0.58],
          [0.72, 0.62],
          [0.28, 0.66],
        ] as const) {
          g.beginPath();
          g.arc(x + s * px, y + s * py, s * 0.045, 0, Math.PI * 2);
          g.fill();
        }
      }
      // top-left highlight
      const hi = g.createRadialGradient(x + s * 0.32, y + s * 0.26, 0, x + s * 0.32, y + s * 0.26, s * 0.55);
      hi.addColorStop(0, `rgba(255,255,255,${style === 'glass' ? 0.6 : 0.55})`);
      hi.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = hi;
      rr(y, s * 0.9);
      g.fill();
      if (style === 'glass') {
        g.strokeStyle = 'rgba(255,255,255,0.85)';
        g.lineWidth = Math.max(1, s * 0.05);
        rr(y + g.lineWidth, s * 0.9 - g.lineWidth * 2);
        g.stroke();
      }
    }
    if (variant === 'lit') {
      g.strokeStyle = p.ringOutline;
      g.lineWidth = Math.max(2, s * 0.085);
      g.beginPath();
      g.roundRect(x + g.lineWidth / 2, y + g.lineWidth / 2, s - g.lineWidth, s * 0.9 - g.lineWidth, r);
      g.stroke();
    }
    return c;
  }
}

/** Six shapes so colors are distinguishable without hue (Glyph skin). */
function drawGlyph(g: CanvasRenderingContext2D, color: number, cx: number, cy: number, r: number, ink: string): void {
  g.fillStyle = ink;
  g.strokeStyle = ink;
  g.lineWidth = r * 0.45;
  g.lineCap = 'round';
  g.beginPath();
  switch (color) {
    case 1:
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.fill();
      break;
    case 2:
      g.rect(cx - r * 0.85, cy - r * 0.85, r * 1.7, r * 1.7);
      g.fill();
      break;
    case 3:
      g.moveTo(cx, cy - r);
      g.lineTo(cx + r, cy + r * 0.8);
      g.lineTo(cx - r, cy + r * 0.8);
      g.closePath();
      g.fill();
      break;
    case 4:
      g.moveTo(cx - r, cy - r);
      g.lineTo(cx + r, cy + r);
      g.moveTo(cx + r, cy - r);
      g.lineTo(cx - r, cy + r);
      g.stroke();
      break;
    case 5:
      g.moveTo(cx, cy - r * 1.1);
      g.lineTo(cx + r, cy);
      g.lineTo(cx, cy + r * 1.1);
      g.lineTo(cx - r, cy);
      g.closePath();
      g.fill();
      break;
    default:
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.lineWidth = r * 0.4;
      g.stroke();
  }
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}

export { shade, luminance };
