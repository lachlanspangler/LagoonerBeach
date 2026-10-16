/**
 * The shared face rig (style guide R7–R9, R19–R21). One implementation for every species: solid
 * low-set oval eyes with two highlights, a tiny ink mouth from a closed vocabulary, blush, and the
 * closed expression set. Species only supply anchors (`Face`), never face art.
 *
 * Drawn live (R35) in artboard units on a context already transformed into the face group's space.
 */
import type { Expression, Face, Mouth } from './kit.ts';
import { SHARED } from './palette.ts';
import type { FaceState } from './motion.ts';

type G = CanvasRenderingContext2D;

export interface FaceInk {
  /** Derived species ink (mouth, lid line, closed-eye arcs on dark bodies stay eye-coloured). */
  readonly ink: string;
  /** Lid colour for `sleepy` (the skin the eye sits on). */
  readonly lid: string;
  /** Body colour (pout lips). */
  readonly body: string;
}

export interface FaceCtx {
  /** CSS px per artboard unit (for the R7 pixel minimums). */
  readonly ppu: number;
  /** Outline width in units (mouth/lid lines are 0.5 ×). */
  readonly k: number;
  readonly night: boolean;
}

const TAU = Math.PI * 2;

/** Mouth used by each expression (R19); idle/blink use the species default. */
export function mouthFor(expr: Expression, idle: Mouth): Mouth {
  switch (expr) {
    case 'happy':
      return 'open';
    case 'surprised':
      return 'o';
    case 'proud':
      return idle === 'smile' ? 'smile' : 'w';
    case 'sleepy':
      return 'flat';
    case 'shy':
      return 'none';
    default:
      return idle;
  }
}

export const blushOn = (expr: Expression, sweet: boolean) =>
  expr === 'happy' ||
  expr === 'proud' ||
  expr === 'surprised' ||
  expr === 'shy' ||
  (sweet && (expr === 'idle' || expr === 'blink'));

export function drawFace(g: G, f: Face, st: FaceState, c: FaceInk, x: FaceCtx): void {
  const h = f.eye;
  const w = h * 0.85;
  const expr = st.expr;
  const px = 1 / x.ppu; // one CSS px in units
  const cx0 = f.zone[0] + f.zone[2] / 2;

  // blush first (under the eyes)
  if (blushOn(expr, !!f.sweet)) {
    g.fillStyle = f.blushInk ? c.ink : SHARED.blush;
    const base = f.blushInk ? 0.25 : x.night ? 0.35 : 0.45;
    const a = Math.min(0.7, base * (expr === 'happy' ? 1.3 : 1));
    const prev = g.globalAlpha;
    g.globalAlpha = prev * a;
    for (const [ex, ey] of f.eyes) {
      const back = f.front ? (ex < cx0 ? -1 : 1) : -1;
      g.beginPath();
      g.ellipse(ex + back * 0.3 * w, ey + 0.7 * h, 0.55 * w, 0.275 * h, 0, 0, TAU);
      g.fill();
    }
    g.globalAlpha = prev;
  }

  const eyeCol = SHARED.eye;
  const lineW = Math.max(0.5 * x.k, 0.9 * px);
  g.lineCap = 'round';
  g.lineJoin = 'round';

  f.eyes.forEach(([ex, ey0], i) => {
    // which eye winks: the back one in profile (only one eye) or the second front eye
    const winkThis = st.wink && (f.eyes.length === 1 || i === 1);
    const ey = ey0 + (expr === 'shy' ? 0.2 * h : 0);
    const arc = (lift: number, thick: number) => {
      g.strokeStyle = eyeCol;
      g.lineWidth = Math.max(thick, 1.1 * px);
      g.beginPath();
      g.moveTo(ex - 0.62 * w, ey + 0.08 * h);
      g.quadraticCurveTo(ex, ey + 0.08 * h + lift * h, ex + 0.62 * w, ey + 0.08 * h);
      g.stroke();
    };
    if (winkThis || expr === 'happy') return arc(-1.0, 3 * Math.min(1, h / 8)); // ^ ^ (3 units at full size)
    if (expr === 'proud') return arc(0.75, 2.6 * Math.min(1, h / 8)); // smug ‿
    if (expr === 'blink') return arc(0.32, 2 * Math.min(1, h / 8)); // closed, relaxed

    const big = expr === 'surprised' ? 1.15 : 1;
    const ew = w * big,
      eh = h * big;
    if (expr === 'surprised') {
      // white sclera ring (15 %) with an ink edge so it reads on pale bodies
      g.fillStyle = SHARED.white;
      g.strokeStyle = c.ink;
      g.lineWidth = lineW;
      g.beginPath();
      g.ellipse(ex, ey, ew * 0.5 * 1.3, eh * 0.5 * 1.3, 0, 0, TAU);
      g.fill();
      g.stroke();
    }
    g.fillStyle = eyeCol;
    g.beginPath();
    g.ellipse(ex, ey, ew / 2, eh / 2, 0, 0, TAU);
    g.fill();
    // highlights: primary always (≥ 1 px), secondary only when the eye is ≥ 3 px tall
    const eyePx = eh * x.ppu;
    const hl = expr === 'surprised' ? 1.25 : 1;
    if (expr !== 'sleepy') {
      g.fillStyle = SHARED.white;
      g.beginPath();
      g.arc(ex - 0.22 * ew, ey - 0.24 * eh, Math.max(0.3 * ew * hl, 0.5 * px), 0, TAU);
      g.fill();
      if (eyePx >= 3) {
        g.beginPath();
        g.arc(ex + 0.2 * ew, ey + 0.26 * eh, 0.12 * ew * hl, 0, TAU);
        g.fill();
      }
    } else {
      // half-lid: the top 45 % covered by skin, with an ink lid line
      g.save();
      g.beginPath();
      g.ellipse(ex, ey, ew / 2 + 0.3 * px, eh / 2 + 0.3 * px, 0, 0, TAU);
      g.clip();
      const ly = ey - eh / 2 + eh * 0.45;
      g.fillStyle = c.lid;
      g.fillRect(ex - ew, ey - eh, ew * 2, ly - (ey - eh));
      g.restore();
      g.strokeStyle = eyeCol;
      g.lineWidth = Math.max(0.16 * h, 1 * px);
      g.beginPath();
      g.moveTo(ex - ew * 0.56, ly - 0.04 * eh);
      g.quadraticCurveTo(ex, ly + 0.12 * eh, ex + ew * 0.56, ly - 0.04 * eh);
      g.stroke();
    }
  });

  drawMouth(g, f, mouthFor(expr, f.mouth.shape), c, lineW);
}

function drawMouth(g: G, f: Face, m: Mouth, c: FaceInk, lw: number): void {
  if (m === 'none') return;
  const [mx, my] = f.mouth.at;
  const mw = f.mouth.w;
  g.strokeStyle = c.ink;
  g.fillStyle = c.ink;
  g.lineWidth = lw;
  g.beginPath();
  switch (m) {
    case 'smile':
      g.moveTo(mx - mw / 2, my);
      g.quadraticCurveTo(mx, my + mw * 0.5, mx + mw / 2, my);
      g.stroke();
      return;
    case 'w':
      g.moveTo(mx - mw / 2, my - mw * 0.05);
      g.quadraticCurveTo(mx - mw / 4, my + mw * 0.42, mx, my);
      g.quadraticCurveTo(mx + mw / 4, my + mw * 0.42, mx + mw / 2, my - mw * 0.05);
      g.stroke();
      return;
    case 'flat':
      g.moveTo(mx - mw * 0.32, my + mw * 0.05);
      g.lineTo(mx + mw * 0.32, my + mw * 0.05);
      g.stroke();
      return;
    case 'o':
      g.ellipse(mx, my + mw * 0.12, mw * 0.2, mw * 0.25, 0, 0, TAU);
      g.fill();
      return;
    case 'pout':
      g.fillStyle = c.body;
      g.ellipse(mx, my, mw * 0.28, mw * 0.34, 0, 0, TAU);
      g.fill();
      g.stroke();
      return;
    case 'open':
    case 'grin':
    case 'toothy': {
      const depth = m === 'grin' ? 0.55 : 0.75;
      const ww = m === 'grin' ? mw * 1.3 : mw;
      g.moveTo(mx - ww / 2, my - mw * 0.06);
      g.quadraticCurveTo(mx, my - mw * 0.16, mx + ww / 2, my - mw * 0.06);
      g.quadraticCurveTo(mx + ww * 0.42, my + mw * depth, mx, my + mw * depth);
      g.quadraticCurveTo(mx - ww * 0.42, my + mw * depth, mx - ww / 2, my - mw * 0.06);
      g.closePath();
      g.fill();
      g.save();
      g.clip();
      if (m === 'open') {
        g.fillStyle = SHARED.tongue;
        g.beginPath();
        g.ellipse(mx, my + mw * 0.72, mw * 0.3, mw * 0.24, 0, 0, TAU);
        g.fill();
      } else {
        g.fillStyle = SHARED.white;
        const n = m === 'grin' ? 2 : 4;
        for (let i = 0; i < n; i++) {
          const tx = mx - ww * 0.3 + (ww * 0.6 * (i + 0.5)) / n;
          g.beginPath();
          g.ellipse(tx, my, ww * 0.07, mw * 0.2, 0, 0, TAU);
          g.fill();
        }
      }
      g.restore();
      return;
    }
    case 'underbite': {
      g.moveTo(mx - mw / 2, my);
      g.quadraticCurveTo(mx, my + mw * 0.2, mx + mw / 2, my - mw * 0.1);
      g.stroke();
      g.fillStyle = SHARED.white;
      for (const tx of [mx - mw * 0.1, mx + mw * 0.22]) {
        g.beginPath();
        g.ellipse(tx, my - mw * 0.05, mw * 0.08, mw * 0.16, 0, 0, TAU);
        g.fill();
        g.stroke();
      }
      return;
    }
  }
}
