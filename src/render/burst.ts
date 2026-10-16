/**
 * Ring burst (ADR 0012): when a ring clears, every pebble becomes a burst piece. It lifts in
 * place (anticipation), then pops outward from the lagoon's centroid with spin, a little gravity,
 * scale-down and fade — sea-worn pebbles scattering, not glass shattering.
 *
 * Closed-form motion (position is a function of time, no integration), so a frozen clock renders
 * the same frame every time (pixel baselines, filmstrips). Fixed pool, no per-frame allocation;
 * the pebble art is the pre-rendered sprite, so a piece costs one drawImage.
 */
import { LIMITS } from './moments.ts';
import { clamp01, easeInCubic, easeOutCubic, easeOutQuad, lerp } from './tween.ts';

/** Anticipation: the pebble swells in its cell before it flies (ms). */
export const BURST_LIFT = 70;
/** Reduced motion: shrink-and-fade in place (ms). */
const STILL_LIFE = 200;

export class Burst {
  readonly cap: number;
  count = 0;
  /** Pieces that fly (the rest pop in place); capped so the scatter stays readable. */
  private flying = 0;
  private x0: Float32Array;
  private y0: Float32Array;
  private vx: Float32Array;
  private vy: Float32Array;
  private vr: Float32Array;
  private start: Float64Array;
  private life: Float32Array;
  private color: Uint8Array;
  private still: Uint8Array;
  /** Gravity in px/s² (set from the cell size). */
  gravity = 500;

  constructor(cap = 160) {
    this.cap = cap;
    this.x0 = new Float32Array(cap);
    this.y0 = new Float32Array(cap);
    this.vx = new Float32Array(cap);
    this.vy = new Float32Array(cap);
    this.vr = new Float32Array(cap);
    this.start = new Float64Array(cap);
    this.life = new Float32Array(cap);
    this.color = new Uint8Array(cap);
    this.still = new Uint8Array(cap);
  }

  /**
   * One pebble at (x, y) bursting away from the lagoon centroid (cx, cy) at time `start`.
   * strength ≈ 0.8 (pinch) … 1.6 (screen-filling); 0 = reduced motion (pops in place).
   * Returns false when the pool is full (the caller lets it pop in place instead).
   */
  add(
    x: number,
    y: number,
    cx: number,
    cy: number,
    color: number,
    start: number,
    strength: number,
    cell: number,
    rand: () => number,
  ): boolean {
    if (this.count >= this.cap) return false;
    const j = this.count++;
    this.x0[j] = x;
    this.y0[j] = y;
    this.start[j] = start;
    this.color[j] = color;
    this.gravity = cell * 11;
    if (strength <= 0 || this.flying >= LIMITS.maxBurstPieces) {
      this.still[j] = 1;
      this.vx[j] = this.vy[j] = this.vr[j] = 0;
      this.life[j] = STILL_LIFE;
      return true;
    }
    this.still[j] = 0;
    this.flying++;
    let dx = x - cx;
    let dy = y - cy;
    let d = Math.hypot(dx, dy);
    if (d < 1e-3) {
      const a = rand() * Math.PI * 2;
      dx = Math.cos(a);
      dy = Math.sin(a);
      d = 1;
    }
    // outward, with a little angular jitter so rings don't fly as perfect spokes
    const jit = (rand() - 0.5) * 0.7;
    const ux = dx / d;
    const uy = dy / d;
    const rx = ux * Math.cos(jit) - uy * Math.sin(jit);
    const ry = ux * Math.sin(jit) + uy * Math.cos(jit);
    const sp = cell * (2.2 + rand() * 1.4) * strength;
    this.vx[j] = rx * sp;
    // an upward kick so the scatter arcs (then gravity takes it)
    this.vy[j] = ry * sp - cell * (1.5 + rand() * 1.1) * strength;
    this.vr[j] = (rand() < 0.5 ? -1 : 1) * (3 + rand() * 5) * strength;
    this.life[j] = (420 + rand() * 160) * (0.9 + 0.1 * strength);
    return true;
  }

  /** Any piece still pending or in flight at `now`. */
  active(now: number): boolean {
    for (let i = 0; i < this.count; i++) if (now < this.start[i]! + BURST_LIFT + this.life[i]!) return true;
    return false;
  }

  /**
   * `lit` = the white-rimmed "will pop" pebble; `plain` = the normal one. In flight the rim
   * crossfades away (a scattering pebble is just a pebble; the rim only marks the ring in place).
   */
  draw(
    g: CanvasRenderingContext2D,
    now: number,
    size: number,
    lit: (color: number) => CanvasImageSource,
    plain: (color: number) => CanvasImageSource = lit,
  ): void {
    for (let i = 0; i < this.count; i++) {
      const st = this.start[i]!;
      const spr = lit(this.color[i]!);
      const x0 = this.x0[i]!;
      const y0 = this.y0[i]!;
      if (now < st) {
        // waiting its turn: lit, in place
        g.drawImage(spr, x0 - size / 2, y0 - size / 2, size, size);
        continue;
      }
      if (this.still[i]) {
        const k = (now - st) / this.life[i]!;
        if (k >= 1) continue;
        const s = size * lerp(1, 0.55, easeOutQuad(k));
        g.globalAlpha = 1 - easeInCubic(k);
        g.drawImage(spr, x0 - s / 2, y0 - s / 2, s, s);
        g.globalAlpha = 1;
        continue;
      }
      const lt = now - st;
      if (lt < BURST_LIFT) {
        const s = size * lerp(1, 1.12, easeOutCubic(lt / BURST_LIFT));
        g.drawImage(spr, x0 - s / 2, y0 - s / 2, s, s);
        continue;
      }
      const ft = lt - BURST_LIFT;
      const k = ft / this.life[i]!;
      if (k >= 1) continue;
      const t = ft / 1000;
      const x = x0 + this.vx[i]! * t;
      const y = y0 + this.vy[i]! * t + 0.5 * this.gravity * t * t;
      const s = size * lerp(1.12, 0.3, easeInCubic(k) * 0.6 + k * 0.4);
      const rot = this.vr[i]! * t;
      const a = k < 0.55 ? 1 : 1 - clamp01((k - 0.55) / 0.45);
      // rim → plain over the first third of the flight
      const m = clamp01((k - 0.04) / 0.3);
      g.save();
      g.translate(x, y);
      g.rotate(rot);
      if (m < 1) {
        g.globalAlpha = a * (1 - m);
        g.drawImage(spr, -s / 2, -s / 2, s, s);
      }
      if (m > 0) {
        g.globalAlpha = a * m;
        g.drawImage(plain(this.color[i]!), -s / 2, -s / 2, s, s);
      }
      g.restore();
    }
    g.globalAlpha = 1;
  }

  /** Drop finished pieces (swap-remove; order doesn't matter for drawing). */
  gc(now: number): void {
    let i = 0;
    while (i < this.count) {
      const still = this.still[i] === 1;
      const end = this.start[i]! + (still ? 0 : BURST_LIFT) + this.life[i]!;
      if (now >= end) {
        if (!still) this.flying--;
        const l = --this.count;
        this.x0[i] = this.x0[l]!;
        this.y0[i] = this.y0[l]!;
        this.vx[i] = this.vx[l]!;
        this.vy[i] = this.vy[l]!;
        this.vr[i] = this.vr[l]!;
        this.start[i] = this.start[l]!;
        this.life[i] = this.life[l]!;
        this.color[i] = this.color[l]!;
        this.still[i] = this.still[l]!;
        continue;
      }
      i++;
    }
  }

  clear(): void {
    this.count = 0;
    this.flying = 0;
  }
}
