/**
 * Creature drawing: the public API every surface calls (`drawCreature`).
 *
 * New art (ADR 0011) lives in a lazily loaded chunk (`art/creature-art.ts`, prefetched on idle
 * after first paint). Species with new art are drawn by the kit; everything else, and everything
 * before the chunk arrives, uses the legacy procedural drawing below, so the game is never broken
 * mid-migration.
 */
import type { Species } from '../meta/creatures.ts';
import type * as ArtChunk from './art/creature-art.ts';

export type DrawOpts = ArtChunk.DrawOpts;

type G = CanvasRenderingContext2D;

let chunk: typeof ArtChunk | null = null;
let loading: Promise<typeof ArtChunk> | null = null;

/** Load the art chunk (idempotent). Resolves once new art can be drawn. */
export function loadCreatureArt(): Promise<typeof ArtChunk> {
  loading ??= import('./art/creature-art.ts').then((m) => {
    chunk = m;
    if (typeof location !== 'undefined' && /[?&]debug=1/.test(location.search))
      (globalThis as { __lbArt?: unknown }).__lbArt = m;
    return m;
  });
  return loading;
}

/** True when this species will be drawn with new art right now. */
export const hasNewArt = (id: string): boolean => chunk?.ART.has(id) ?? false;
/** Run `cb` once the art chunk is in (immediately if it already is). */
export function whenArtReady(cb: () => void): void {
  if (chunk) cb();
  else void loadCreatureArt().then(cb, () => {});
}

// R39: prefetch after first paint, on idle, so the art is in before the first capture.
if (typeof window !== 'undefined' && typeof requestAnimationFrame === 'function') {
  const w = window as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void };
  requestAnimationFrame(() => {
    if (w.requestIdleCallback) w.requestIdleCallback(() => void loadCreatureArt(), { timeout: 2500 });
    else setTimeout(() => void loadCreatureArt(), 600);
  });
}

/**
 * Draw a species centred at (x, y). `s`: the box (fit tile/detail), the old leaping-fish size (fit
 * leap), or the creature's span. Opts extend the legacy ones with expression, t (animate), night, fit.
 */
export function drawCreature(g: G, sp: Species, x: number, y: number, s: number, angle = 0, o: DrawOpts = {}): void {
  const art = chunk?.ART.get(sp.id);
  if (chunk && art) return chunk.drawSpecies(g, sp, art, x, y, s, angle, o);
  drawLegacy(g, sp, x, y, o.fit === 'tile' || o.fit === 'detail' ? s * 0.82 : s, angle, o);
}

/** The original procedural art: body type + two colours + a pattern, about `s` wide. */
export function drawLegacy(g: G, sp: Species, x: number, y: number, s: number, angle = 0, o: DrawOpts = {}): void {
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  const [a, b] = sp.colors;
  const ink = o.silhouette;
  const c1 = ink ?? a;
  const c2 = ink ?? b;
  const eye = ink ?? '#1A1A1A';
  const P: Painter = { g, s, c1, c2, eye, pattern: ink ? 'plain' : sp.pattern, white: ink ?? '#FFFFFF' };
  BODIES[sp.body](P);
  if (o.golden && !ink) {
    g.globalCompositeOperation = 'source-atop';
    const gr = g.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2);
    gr.addColorStop(0, 'rgba(255,215,90,0.65)');
    gr.addColorStop(0.5, 'rgba(255,248,200,0.35)');
    gr.addColorStop(1, 'rgba(230,170,40,0.65)');
    g.fillStyle = gr;
    g.fillRect(-s, -s, s * 2, s * 2);
    g.globalCompositeOperation = 'source-over';
  }
  g.restore();
}

interface Painter {
  g: G;
  s: number;
  c1: string;
  c2: string;
  eye: string;
  white: string;
  pattern: Species['pattern'];
}

/** Fill the current path with c1, then the pattern in c2 clipped to it. */
function fillBody(P: Painter, path: Path2D, w: number, h: number): void {
  const { g } = P;
  g.fillStyle = P.c1;
  g.fill(path);
  if (P.pattern === 'plain') return;
  g.save();
  g.clip(path);
  g.fillStyle = P.c2;
  const s = P.s;
  if (P.pattern === 'stripes') for (let i = -3; i <= 3; i++) g.fillRect(i * s * 0.16 - s * 0.03, -h, s * 0.06, h * 2);
  else if (P.pattern === 'bands') for (let i = -2; i <= 2; i++) g.fillRect(i * s * 0.22 - s * 0.05, -h, s * 0.1, h * 2);
  else
    for (let i = 0; i < 9; i++) {
      const px = (((i * 37) % 9) / 9 - 0.5) * w;
      const py = (((i * 53) % 7) / 7 - 0.5) * h;
      g.beginPath();
      g.arc(px, py, s * 0.05, 0, Math.PI * 2);
      g.fill();
    }
  g.restore();
}

function eyeAt(P: Painter, x: number, y: number, r: number): void {
  const { g } = P;
  g.fillStyle = P.white;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = P.eye;
  g.beginPath();
  g.arc(x + r * 0.2, y, r * 0.55, 0, Math.PI * 2);
  g.fill();
}

const ellipse = (rx: number, ry: number, cx = 0, cy = 0) => {
  const p = new Path2D();
  p.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  return p;
};

function fish(P: Painter, opts: { long?: number; tall?: number; dark?: boolean } = {}): void {
  const { g, s } = P;
  const rx = s * 0.36 * (opts.long ?? 1);
  const ry = s * 0.2 * (opts.tall ?? 1);
  // tail
  g.fillStyle = P.c2;
  g.beginPath();
  g.moveTo(-rx * 0.85, 0);
  g.lineTo(-rx * 1.45, -ry * 0.9);
  g.quadraticCurveTo(-rx * 1.25, 0, -rx * 1.45, ry * 0.9);
  g.closePath();
  g.fill();
  // dorsal fin
  g.beginPath();
  g.moveTo(-rx * 0.3, -ry * 0.8);
  g.quadraticCurveTo(0, -ry * 1.6, rx * 0.35, -ry * 0.85);
  g.closePath();
  g.fill();
  fillBody(P, ellipse(rx, ry), rx * 2, ry * 2);
  eyeAt(P, rx * 0.55, -ry * 0.2, s * 0.055);
}

const BODIES: Record<Species['body'], (P: Painter) => void> = {
  fish: (P) => fish(P),
  shark: (P) => {
    const { g, s } = P;
    g.fillStyle = P.c1;
    g.beginPath();
    g.moveTo(-s * 0.1, -s * 0.12);
    g.lineTo(s * 0.02, -s * 0.34);
    g.lineTo(s * 0.12, -s * 0.12);
    g.fill();
    g.beginPath();
    g.moveTo(-s * 0.36, 0);
    g.lineTo(-s * 0.55, -s * 0.2);
    g.lineTo(-s * 0.48, 0);
    g.lineTo(-s * 0.55, s * 0.16);
    g.closePath();
    g.fill();
    const p = new Path2D();
    p.moveTo(s * 0.48, 0);
    p.quadraticCurveTo(s * 0.3, -s * 0.18, -s * 0.38, -s * 0.04);
    p.quadraticCurveTo(-s * 0.4, 0, -s * 0.38, s * 0.04);
    p.quadraticCurveTo(s * 0.3, s * 0.18, s * 0.48, 0);
    fillBody(P, p, s, s * 0.36);
    g.fillStyle = P.white;
    g.globalAlpha = P.white === '#FFFFFF' ? 0.7 : 1;
    g.beginPath();
    g.ellipse(s * 0.08, s * 0.08, s * 0.28, s * 0.05, 0, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
    eyeAt(P, s * 0.33, -s * 0.03, s * 0.035);
  },
  angler: (P) => {
    const { g, s } = P;
    fish(P, { tall: 1.5, long: 0.85 });
    g.strokeStyle = P.c1;
    g.lineWidth = s * 0.025;
    g.beginPath();
    g.moveTo(s * 0.1, -s * 0.28);
    g.quadraticCurveTo(s * 0.35, -s * 0.55, s * 0.5, -s * 0.3);
    g.stroke();
    g.fillStyle = P.c2;
    g.beginPath();
    g.arc(s * 0.5, -s * 0.28, s * 0.06, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = P.white;
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.moveTo(s * (0.18 + i * 0.04), s * 0.06);
      g.lineTo(s * (0.2 + i * 0.04), s * 0.12);
      g.lineTo(s * (0.22 + i * 0.04), s * 0.06);
      g.fill();
    }
  },
  flat: (P) => {
    const { g, s } = P;
    // a flatfish lying on the sand: wide thin oval, one continuous fin rim, both eyes on top
    g.fillStyle = P.c2;
    g.beginPath();
    g.moveTo(-s * 0.38, 0);
    g.lineTo(-s * 0.52, -s * 0.09);
    g.lineTo(-s * 0.52, s * 0.09);
    g.closePath();
    g.fill();
    g.fill(ellipse(s * 0.42, s * 0.19));
    fillBody(P, ellipse(s * 0.36, s * 0.14), s * 0.72, s * 0.28);
    // lateral line
    g.strokeStyle = P.c2;
    g.lineWidth = s * 0.012;
    g.beginPath();
    g.moveTo(-s * 0.3, 0);
    g.quadraticCurveTo(0, -s * 0.03, s * 0.2, 0);
    g.stroke();
    eyeAt(P, s * 0.2, -s * 0.11, s * 0.035);
    eyeAt(P, s * 0.28, -s * 0.08, s * 0.035);
  },
  hermit: (P) => {
    const { g, s } = P;
    // the borrowed spiral shell behind, the crab peeking out in front
    const shell = ellipse(s * 0.24, s * 0.21, -s * 0.1, -s * 0.06);
    g.fillStyle = P.c2;
    g.fill(shell);
    g.strokeStyle = P.eye === P.c1 ? P.c1 : 'rgba(0,0,0,0.25)';
    g.lineWidth = s * 0.025;
    g.beginPath();
    for (let t = 0; t < 14; t++) {
      const a = t * 0.75;
      const r = s * 0.016 * t;
      const x = -s * 0.1 + Math.cos(a) * r;
      const y = -s * 0.06 + Math.sin(a) * r;
      if (t === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
    g.strokeStyle = P.c1;
    g.lineWidth = s * 0.035;
    g.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.moveTo(s * 0.12, s * (0.08 + i * 0.05));
      g.lineTo(s * (0.2 + i * 0.03), s * (0.2 + i * 0.03));
      g.stroke();
    }
    g.fillStyle = P.c1;
    g.beginPath();
    g.ellipse(s * 0.2, s * 0.02, s * 0.12, s * 0.09, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(s * 0.34, -s * 0.03, s * 0.08, s * 0.06, -0.4, 0, Math.PI * 2);
    g.fill();
    eyeAt(P, s * 0.22, -s * 0.1, s * 0.035);
    eyeAt(P, s * 0.3, -s * 0.09, s * 0.035);
  },
  limpet: (P) => {
    const { g, s } = P;
    const p = new Path2D();
    p.moveTo(-s * 0.34, s * 0.12);
    p.quadraticCurveTo(-s * 0.1, -s * 0.34, s * 0.02, -s * 0.3);
    p.quadraticCurveTo(s * 0.14, -s * 0.28, s * 0.34, s * 0.12);
    p.closePath();
    fillBody(P, p, s * 0.68, s * 0.42);
    g.strokeStyle = P.c2;
    g.lineWidth = s * 0.014;
    for (let i = -3; i <= 3; i++) {
      g.beginPath();
      g.moveTo(s * 0.02, -s * 0.29);
      g.lineTo(i * s * 0.09, s * 0.11);
      g.stroke();
    }
    g.fillStyle = P.c2;
    g.fillRect(-s * 0.36, s * 0.11, s * 0.72, s * 0.035);
  },
  eel: (P) => {
    const { g, s } = P;
    const p = new Path2D();
    const N = 14;
    const pts: [number, number][] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      pts.push([(t - 0.5) * s * 1.1, Math.sin(t * Math.PI * 2.2) * s * 0.1]);
    }
    p.moveTo(pts[0]![0], pts[0]![1]);
    for (let i = 1; i <= N; i++) {
      const w = s * 0.07 * Math.min(1, (i / N) * 3);
      p.lineTo(pts[i]![0], pts[i]![1] - w);
    }
    for (let i = N; i >= 0; i--) {
      const w = s * 0.07 * Math.min(1, (i / N) * 3);
      p.lineTo(pts[i]![0], pts[i]![1] + w);
    }
    p.closePath();
    fillBody(P, p, s * 1.1, s * 0.4);
    const head = pts[N]!;
    eyeAt(P, head[0] - s * 0.05, head[1] - s * 0.025, s * 0.03);
    void g;
  },
  ray: (P) => {
    const { g, s } = P;
    g.strokeStyle = P.c1;
    g.lineWidth = s * 0.025;
    g.beginPath();
    g.moveTo(-s * 0.2, 0);
    g.quadraticCurveTo(-s * 0.45, s * 0.05, -s * 0.62, -s * 0.05);
    g.stroke();
    const p = new Path2D();
    p.moveTo(s * 0.3, 0);
    p.quadraticCurveTo(s * 0.05, -s * 0.12, -s * 0.05, -s * 0.42);
    p.quadraticCurveTo(-s * 0.12, -s * 0.1, -s * 0.25, 0);
    p.quadraticCurveTo(-s * 0.12, s * 0.1, -s * 0.05, s * 0.42);
    p.quadraticCurveTo(s * 0.05, s * 0.12, s * 0.3, 0);
    fillBody(P, p, s * 0.6, s * 0.84);
    eyeAt(P, s * 0.16, -s * 0.06, s * 0.03);
    eyeAt(P, s * 0.16, s * 0.06, s * 0.03);
  },
  crab: (P) => {
    const { g, s } = P;
    g.strokeStyle = P.c1;
    g.lineWidth = s * 0.04;
    g.lineCap = 'round';
    for (const side of [-1, 1])
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.moveTo(side * s * 0.15, s * (0.02 + i * 0.07));
        g.lineTo(side * s * (0.34 + i * 0.03), s * (0.12 + i * 0.08));
        g.stroke();
      }
    for (const side of [-1, 1]) {
      g.beginPath();
      g.moveTo(side * s * 0.15, -s * 0.06);
      g.lineTo(side * s * 0.3, -s * 0.2);
      g.stroke();
      g.fillStyle = P.c1;
      g.beginPath();
      g.ellipse(side * s * 0.34, -s * 0.26, s * 0.09, s * 0.07, side * 0.5, 0, Math.PI * 2);
      g.fill();
    }
    fillBody(P, ellipse(s * 0.24, s * 0.16, 0, 0), s * 0.5, s * 0.32);
    eyeAt(P, -s * 0.07, -s * 0.18, s * 0.04);
    eyeAt(P, s * 0.07, -s * 0.18, s * 0.04);
  },
  star: (P) => {
    const { s } = P;
    const p = new Path2D();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? s * 0.17 : s * 0.42;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      if (i === 0) p.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else p.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    p.closePath();
    P.g.lineJoin = 'round';
    P.g.lineWidth = s * 0.06;
    P.g.strokeStyle = P.c1;
    P.g.stroke(p);
    fillBody(P, p, s * 0.84, s * 0.84);
  },
  horse: (P) => {
    const { g, s } = P;
    g.strokeStyle = P.c1;
    g.lineCap = 'round';
    // curled tail
    g.lineWidth = s * 0.08;
    g.beginPath();
    g.moveTo(-s * 0.02, s * 0.12);
    g.quadraticCurveTo(-s * 0.05, s * 0.42, -s * 0.18, s * 0.36);
    g.quadraticCurveTo(-s * 0.26, s * 0.28, -s * 0.14, s * 0.24);
    g.stroke();
    fillBody(P, ellipse(s * 0.13, s * 0.22, 0, -s * 0.02), s * 0.3, s * 0.5);
    g.fillStyle = P.c1;
    g.beginPath();
    g.ellipse(s * 0.06, -s * 0.28, s * 0.1, s * 0.08, 0.3, 0, Math.PI * 2);
    g.fill();
    g.fillRect(s * 0.1, -s * 0.31, s * 0.18, s * 0.06);
    eyeAt(P, s * 0.07, -s * 0.3, s * 0.035);
  },
  jelly: (P) => {
    const { g, s } = P;
    g.strokeStyle = P.c2;
    g.lineWidth = s * 0.025;
    for (let i = -2; i <= 2; i++) {
      g.beginPath();
      g.moveTo(i * s * 0.08, 0);
      g.bezierCurveTo(i * s * 0.08 + s * 0.06, s * 0.15, i * s * 0.08 - s * 0.06, s * 0.28, i * s * 0.08, s * 0.4);
      g.stroke();
    }
    const p = new Path2D();
    p.moveTo(-s * 0.26, s * 0.02);
    p.quadraticCurveTo(-s * 0.26, -s * 0.3, 0, -s * 0.3);
    p.quadraticCurveTo(s * 0.26, -s * 0.3, s * 0.26, s * 0.02);
    p.quadraticCurveTo(0, s * 0.08, -s * 0.26, s * 0.02);
    g.globalAlpha = P.white === '#FFFFFF' ? 0.9 : 1;
    fillBody(P, p, s * 0.52, s * 0.4);
    g.globalAlpha = 1;
  },
  octo: (P) => {
    const { g, s } = P;
    g.strokeStyle = P.c1;
    g.lineCap = 'round';
    g.lineWidth = s * 0.06;
    for (let i = 0; i < 6; i++) {
      const x = (i - 2.5) * s * 0.08;
      g.beginPath();
      g.moveTo(x, s * 0.02);
      g.quadraticCurveTo(x * 1.6, s * 0.25, x * 2 + (i % 2 ? s * 0.06 : -s * 0.06), s * 0.36);
      g.stroke();
    }
    fillBody(P, ellipse(s * 0.24, s * 0.22, 0, -s * 0.1), s * 0.48, s * 0.44);
    eyeAt(P, -s * 0.08, -s * 0.08, s * 0.045);
    eyeAt(P, s * 0.08, -s * 0.08, s * 0.045);
  },
  squid: (P) => {
    const { g, s } = P;
    g.strokeStyle = P.c1;
    g.lineWidth = s * 0.035;
    g.lineCap = 'round';
    for (let i = -2; i <= 2; i++) {
      g.beginPath();
      g.moveTo(-s * 0.18, i * s * 0.04);
      g.quadraticCurveTo(-s * 0.35, i * s * 0.08, -s * 0.48, i * s * 0.1);
      g.stroke();
    }
    const p = new Path2D();
    p.moveTo(s * 0.42, 0);
    p.quadraticCurveTo(s * 0.2, -s * 0.16, -s * 0.2, -s * 0.1);
    p.lineTo(-s * 0.2, s * 0.1);
    p.quadraticCurveTo(s * 0.2, s * 0.16, s * 0.42, 0);
    fillBody(P, p, s * 0.62, s * 0.32);
    eyeAt(P, -s * 0.1, -s * 0.03, s * 0.04);
  },
  turtle: (P) => {
    const { g, s } = P;
    g.fillStyle = P.c2;
    for (const [fx, fy] of [
      [0.22, -0.2],
      [0.22, 0.2],
      [-0.2, -0.18],
      [-0.2, 0.18],
    ] as const) {
      g.beginPath();
      g.ellipse(fx * s, fy * s, s * 0.11, s * 0.05, fy > 0 ? 0.6 : -0.6, 0, Math.PI * 2);
      g.fill();
    }
    g.beginPath();
    g.ellipse(s * 0.34, 0, s * 0.08, s * 0.065, 0, 0, Math.PI * 2);
    g.fill();
    fillBody(P, ellipse(s * 0.27, s * 0.2), s * 0.54, s * 0.4);
    g.strokeStyle = P.c2;
    g.lineWidth = s * 0.015;
    g.stroke(ellipse(s * 0.17, s * 0.12));
    eyeAt(P, s * 0.37, -s * 0.02, s * 0.022);
  },
  snail: (P) => {
    const { g, s } = P;
    g.fillStyle = P.c2;
    g.beginPath();
    g.ellipse(s * 0.08, s * 0.16, s * 0.3, s * 0.07, 0, 0, Math.PI * 2);
    g.fill();
    fillBody(P, ellipse(s * 0.22, s * 0.22, -s * 0.02, -s * 0.04), s * 0.44, s * 0.44);
    g.strokeStyle = P.c2;
    g.lineWidth = s * 0.03;
    g.beginPath();
    for (let t = 0; t < 12; t++) {
      const a = t * 0.8;
      const r = s * 0.02 * t * 0.75;
      const x = -s * 0.02 + Math.cos(a) * r;
      const y = -s * 0.04 + Math.sin(a) * r;
      if (t === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
    eyeAt(P, s * 0.33, s * 0.08, s * 0.025);
  },
  shrimp: (P) => {
    const { g, s } = P;
    // antennae
    g.strokeStyle = P.c1;
    g.lineWidth = s * 0.012;
    for (const k of [0, 1]) {
      g.beginPath();
      g.moveTo(s * 0.3, -s * 0.02);
      g.quadraticCurveTo(s * 0.55, -s * (0.2 + k * 0.1), s * 0.15, -s * (0.34 + k * 0.06));
      g.stroke();
    }
    // curled, tapering segmented body (head right, tail fan left-below)
    const segs = 6;
    for (let i = segs - 1; i >= 0; i--) {
      const t = i / (segs - 1);
      const a = -0.25 + t * 2.4;
      const x = Math.cos(a) * s * 0.18 + s * 0.06 - t * s * 0.12;
      const y = Math.sin(a) * s * 0.18 - s * 0.02;
      const r = s * (0.1 - t * 0.045);
      g.fillStyle = P.pattern === 'bands' && i % 2 ? P.c2 : P.c1;
      g.beginPath();
      g.ellipse(x, y, r * 1.15, r, a + Math.PI / 2, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = P.c1;
    g.beginPath();
    g.moveTo(-s * 0.16, s * 0.12);
    g.lineTo(-s * 0.3, s * 0.06);
    g.lineTo(-s * 0.26, s * 0.2);
    g.closePath();
    g.fill();
    // legs
    g.strokeStyle = P.c2;
    g.lineWidth = s * 0.012;
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.moveTo(s * (0.18 - i * 0.06), s * 0.08);
      g.lineTo(s * (0.16 - i * 0.06), s * 0.17);
      g.stroke();
    }
    eyeAt(P, s * 0.27, -s * 0.05, s * 0.028);
  },
  mola: (P) => {
    const { g, s } = P;
    g.fillStyle = P.c1;
    for (const d of [-1, 1]) {
      g.beginPath();
      g.moveTo(-s * 0.08, d * s * 0.18);
      g.lineTo(-s * 0.2, d * s * 0.45);
      g.lineTo(s * 0.04, d * s * 0.2);
      g.closePath();
      g.fill();
    }
    g.fillStyle = P.c2;
    g.beginPath();
    g.ellipse(-s * 0.3, 0, s * 0.06, s * 0.2, 0, 0, Math.PI * 2);
    g.fill();
    fillBody(P, ellipse(s * 0.3, s * 0.25), s * 0.6, s * 0.5);
    eyeAt(P, s * 0.16, -s * 0.06, s * 0.04);
  },
  dragon: (P) => {
    BODIES.horse(P);
    const { g, s } = P;
    g.fillStyle = P.c2;
    for (const [x, y, r] of [
      [-0.12, -0.12, -0.8],
      [-0.14, 0.05, -1.4],
      [0.12, -0.05, 0.6],
      [0.1, 0.12, 1.1],
      [-0.2, 0.3, -1.9],
      [0.05, -0.42, -0.2],
    ] as const) {
      g.beginPath();
      g.ellipse(x * s, y * s, s * 0.09, s * 0.035, r, 0, Math.PI * 2);
      g.fill();
    }
  },
  puffer: (P) => {
    const { g, s } = P;
    g.strokeStyle = P.c2;
    g.lineWidth = s * 0.02;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      g.beginPath();
      g.moveTo(Math.cos(a) * s * 0.26, Math.sin(a) * s * 0.26);
      g.lineTo(Math.cos(a) * s * 0.33, Math.sin(a) * s * 0.33);
      g.stroke();
    }
    g.fillStyle = P.c2;
    g.beginPath();
    g.moveTo(-s * 0.24, 0);
    g.lineTo(-s * 0.38, -s * 0.1);
    g.lineTo(-s * 0.38, s * 0.1);
    g.fill();
    fillBody(P, ellipse(s * 0.27, s * 0.26), s * 0.54, s * 0.52);
    eyeAt(P, s * 0.12, -s * 0.06, s * 0.05);
  },
  urchin: (P) => {
    const { g, s } = P;
    g.strokeStyle = P.c1;
    g.lineWidth = s * 0.02;
    g.lineCap = 'round';
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      g.beginPath();
      g.moveTo(Math.cos(a) * s * 0.15, Math.sin(a) * s * 0.15);
      g.lineTo(Math.cos(a) * s * 0.4, Math.sin(a) * s * 0.4);
      g.stroke();
    }
    fillBody(P, ellipse(s * 0.2, s * 0.2), s * 0.4, s * 0.4);
  },
  clam: (P) => {
    const { g, s } = P;
    const p = new Path2D();
    p.moveTo(-s * 0.06, s * 0.2);
    p.lineTo(-s * 0.32, -s * 0.02);
    p.quadraticCurveTo(0, -s * 0.5, s * 0.32, -s * 0.02);
    p.lineTo(s * 0.06, s * 0.2);
    p.closePath();
    fillBody(P, p, s * 0.64, s * 0.5);
    g.strokeStyle = P.c2;
    g.lineWidth = s * 0.015;
    for (let i = -3; i <= 3; i++) {
      g.beginPath();
      g.moveTo(0, s * 0.18);
      g.lineTo(i * s * 0.08, -s * 0.24 + Math.abs(i) * s * 0.05);
      g.stroke();
    }
  },
  dollar: (P) => {
    const { g, s } = P;
    fillBody(P, ellipse(s * 0.3, s * 0.3), s * 0.6, s * 0.6);
    g.fillStyle = P.c2;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      g.beginPath();
      g.ellipse(Math.cos(a) * s * 0.12, Math.sin(a) * s * 0.12, s * 0.07, s * 0.025, a, 0, Math.PI * 2);
      g.fill();
    }
  },
  otter: (P) => {
    const { g, s } = P;
    g.fillStyle = P.c1;
    g.beginPath();
    g.ellipse(-s * 0.32, s * 0.06, s * 0.14, s * 0.045, 0.3, 0, Math.PI * 2);
    g.fill();
    fillBody(P, ellipse(s * 0.28, s * 0.14, -s * 0.02, s * 0.02), s * 0.56, s * 0.3);
    g.fillStyle = P.c2;
    g.beginPath();
    g.arc(s * 0.26, -s * 0.06, s * 0.13, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = P.c1;
    for (const ex of [0.2, 0.33]) {
      g.beginPath();
      g.arc(s * ex, -s * 0.17, s * 0.03, 0, Math.PI * 2);
      g.fill();
    }
    eyeAt(P, s * 0.3, -s * 0.08, s * 0.025);
    g.fillStyle = P.eye;
    g.beginPath();
    g.arc(s * 0.38, -s * 0.03, s * 0.022, 0, Math.PI * 2);
    g.fill();
  },
};
