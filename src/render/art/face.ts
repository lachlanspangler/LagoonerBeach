/**
 * The shared face rig (style guide R7–R9, R19–R21). One implementation for every species: solid
 * low-set oval eyes with two highlights, a tiny ink mouth from a closed vocabulary, blush, and the
 * closed expression set. Species only supply anchors (`Face`), never face art.
 *
 * Drawn live (R35) in artboard units on a context already transformed into the face group's space.
 * CRITIQUE-1 changes: `sleepy` is closed contented ‿ eyes (the half-lid moved to `drowsy`), eyes have
 * an absolute size floor (the caller passes the effective `eye`), Night blush on darker bodies is
 * brighter, and small mouths fall back to shapes that survive rasterising.
 */
import type { Expression, Face, Mouth } from './kit.ts';
import { SHARED } from './palette.ts';
import type { FaceState } from './motion.ts';

type G = CanvasRenderingContext2D;

export interface FaceInk {
  /** Derived species ink (mouth, lid line). */
  readonly ink: string;
  /** Lid colour for `drowsy` (the skin the eye sits on). */
  readonly lid: string;
  /** Body colour (pout lips). */
  readonly body: string;
}

export interface FaceCtx {
  /** CSS px per artboard unit (for the pixel minimums). */
  readonly ppu: number;
  /** Outline width in units (mouth/lid lines are 0.5 ×). */
  readonly k: number;
  readonly night: boolean;
  /** Effective eye height in units (authored or default, raised to the absolute floor). */
  readonly eye: number;
  /** OKLCH lightness of the body (Night blush rule). */
  readonly bodyL: number;
  /** Draw the drifting "z" of `sleepy` (detail view only). */
  readonly zzz?: boolean;
  readonly t?: number;
}

const TAU = Math.PI * 2;
/** Night blush on bodies darker than L 0.65 (CRITIQUE-1: the default went muddy). */
export const NIGHT_BLUSH = { color: '#FF9DB0', alpha: 0.45, belowL: 0.65 } as const;

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
      return idle === 'o' ? 'o' : 'smile';
    case 'drowsy':
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
  expr === 'sleepy' ||
  (sweet && (expr === 'idle' || expr === 'blink' || expr === 'drowsy'));

/** Blush colour and alpha for a face (R9 + CRITIQUE-1 Night rule + per-species override). */
export function blushStyle(f: Face, expr: Expression, x: Pick<FaceCtx, 'night' | 'bodyL'>): [string, number] {
  let color: string = SHARED.blush;
  let alpha: number = x.night ? 0.35 : 0.45;
  if (x.night && x.bodyL < NIGHT_BLUSH.belowL) [color, alpha] = [NIGHT_BLUSH.color, NIGHT_BLUSH.alpha];
  if (f.blushInk) alpha = 0.25;
  if (f.blush?.color) color = f.blush.color;
  if (f.blush?.alpha !== undefined) alpha = f.blush.alpha;
  if (expr === 'sleepy') alpha = Math.min(alpha, 0.25);
  if (expr === 'happy') alpha *= 1.3;
  return [color, Math.min(0.7, alpha)];
}

export function drawFace(g: G, f: Face, st: FaceState, c: FaceInk, x: FaceCtx): void {
  const h = x.eye;
  const w = h * 0.85;
  const expr = st.expr;
  const px = 1 / x.ppu; // one CSS px in units
  const cx0 = f.zone[0] + f.zone[2] / 2;
  const front = !!f.front && !f.profile;

  // blush first (under the eyes)
  if (blushOn(expr, !!f.sweet) || f.blush?.always) {
    const [color, a] = blushStyle(f, expr, x);
    g.fillStyle = f.blushInk && !f.blush?.color ? c.ink : color;
    const prev = g.globalAlpha;
    g.globalAlpha = prev * a;
    for (const [ex, ey] of f.eyes) {
      const back = front ? (ex < cx0 ? -1 : 1) : -1;
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
  const thick = (u: number) => Math.max(u * Math.min(1, h / 8), 1.1 * px);

  f.eyes.forEach(([ex, ey0], i) => {
    // which eye winks: the back one in profile (only one eye) or the second eye
    const winkThis = st.wink && (f.eyes.length === 1 || i === 1);
    const ey = ey0 + (expr === 'shy' ? 0.2 * h : 0);
    const arc = (lift: number, lw: number, drop = 0, span = 0.62) => {
      g.strokeStyle = eyeCol;
      g.lineWidth = lw;
      g.beginPath();
      const y = ey + 0.08 * h + drop * h;
      g.moveTo(ex - span * w, y);
      g.quadraticCurveTo(ex, y + lift * h, ex + span * w, y);
      g.stroke();
    };
    if (winkThis || expr === 'happy') return arc(-1.0, thick(3)); // ^ ^
    if (expr === 'proud') return arc(0.75, thick(2.6)); // smug ‿, level
    if (expr === 'sleepy') return arc(0.62, thick(3), 0.12, 0.58); // contented ‿, set a touch lower
    if (expr === 'blink') return arc(0.32, thick(2)); // closed, relaxed

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
    if (f.pupil === 'w') {
      // cuttlefish eye: a light iris with a bold W pupil
      g.fillStyle = '#F6EEDC';
      g.strokeStyle = eyeCol;
      g.lineWidth = Math.max(0.1 * eh, 0.9 * px);
      g.beginPath();
      g.ellipse(ex, ey, ew * 0.56, eh * 0.5, 0, 0, TAU);
      g.fill();
      g.stroke();
      g.lineWidth = Math.max(0.2 * eh, 1.2 * px);
      g.beginPath();
      g.moveTo(ex - ew * 0.38, ey - eh * 0.12);
      g.lineTo(ex - ew * 0.19, ey + eh * 0.16);
      g.lineTo(ex, ey - eh * 0.04);
      g.lineTo(ex + ew * 0.19, ey + eh * 0.16);
      g.lineTo(ex + ew * 0.38, ey - eh * 0.12);
      g.stroke();
    } else {
      g.fillStyle = eyeCol;
      g.beginPath();
      g.ellipse(ex, ey, ew / 2, eh / 2, 0, 0, TAU);
      g.fill();
    }
    // highlights: primary always (≥ 1 px), secondary only when the eye is ≥ 3 px tall
    const eyePx = eh * x.ppu;
    const hl = expr === 'surprised' ? 1.25 : 1;
    g.fillStyle = SHARED.white;
    g.beginPath();
    g.arc(ex - 0.22 * ew, ey - 0.24 * eh, Math.max(0.3 * ew * hl, 0.5 * px), 0, TAU);
    g.fill();
    if (eyePx >= 3 && f.pupil !== 'w') {
      g.beginPath();
      g.arc(ex + 0.2 * ew, ey + 0.26 * eh, 0.12 * ew * hl, 0, TAU);
      g.fill();
    }
    if (expr === 'drowsy') {
      // half-lid: the top 45 % covered by skin, with an ink lid line (the grouper's personality)
      const ly = ey - eh / 2 + eh * 0.45;
      g.save();
      g.beginPath();
      g.ellipse(ex, ey, ew / 2 + 0.3 * px, eh / 2 + 0.3 * px, 0, 0, TAU);
      g.clip();
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

  drawMouth(g, f, mouthFor(expr, f.mouth.shape), c, lineW, x.ppu);
  if (expr === 'sleepy' && x.zzz) drawZ(g, f, c.ink, x);
}

/** Two little drifting "z"s above the face zone (detail view only). */
function drawZ(g: G, f: Face, ink: string, x: FaceCtx): void {
  const [zx, zy, zw, zh] = f.zone;
  const s = Math.max(zh * 0.14, 6 / x.ppu);
  const k = x.t === undefined ? 0.35 : (x.t * 0.35) % 1;
  g.strokeStyle = ink;
  g.lineWidth = Math.max(0.12 * s, 1 / x.ppu);
  const prev = g.globalAlpha;
  for (const [i, sc] of [
    [0, 1],
    [0.5, 0.7],
  ] as const) {
    const u = (k + i) % 1;
    const bx = zx + zw * 0.92 + u * s * 0.8;
    const by = zy - s * 0.2 - u * s * 1.6;
    const q = s * sc;
    g.globalAlpha = prev * (u < 0.15 ? u / 0.15 : u > 0.75 ? (1 - u) / 0.25 : 1);
    g.beginPath();
    g.moveTo(bx, by);
    g.lineTo(bx + q, by);
    g.lineTo(bx, by + q);
    g.lineTo(bx + q, by + q);
    g.stroke();
  }
  g.globalAlpha = prev;
}

function drawMouth(g: G, f: Face, m0: Mouth, c: FaceInk, lw: number, ppu: number): void {
  const [mx, my] = f.mouth.at;
  const mw = f.mouth.w;
  const wpx = mw * ppu;
  // small-size fallbacks (CRITIQUE-1): an open mouth below ~6 px rasterises as an "S"
  let m = m0;
  if (m === 'w' && wpx < 4) m = 'smile';
  const tiny = (m === 'open' || m === 'toothy' || m === 'grin') && wpx < 6;
  if (m === 'none') return;
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
    case 'o': {
      const r = Math.max(mw * 0.2, 0.9 / ppu);
      g.ellipse(mx, my + mw * 0.12, r, r * 1.25, 0, 0, TAU);
      g.fill();
      return;
    }
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
      // tiny: a plain filled D, at least 1.6 px deep
      const dd = tiny ? Math.max(mw * 0.62, 1.6 / ppu) : mw * depth;
      g.moveTo(mx - ww / 2, my - mw * 0.06);
      if (tiny) g.lineTo(mx + ww / 2, my - mw * 0.06);
      else g.quadraticCurveTo(mx, my - mw * 0.16, mx + ww / 2, my - mw * 0.06);
      g.quadraticCurveTo(mx + ww * 0.42, my + dd, mx, my + dd);
      g.quadraticCurveTo(mx - ww * 0.42, my + dd, mx - ww / 2, my - mw * 0.06);
      g.closePath();
      g.fill();
      if (tiny) return;
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
