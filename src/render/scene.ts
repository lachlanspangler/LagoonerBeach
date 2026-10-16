/**
 * Scene: the presentation model + Canvas2D drawing. It mirrors the logical board and holds only
 * animation state. It never decides rules — it's told what happened (see fx.ts).
 */
import { CELLS, N, xOf, yOf } from '../core/grid.ts';
import { pieceById, type Piece } from '../core/pieces.ts';
import type { TrayPiece } from '../core/dealer.ts';
import { computeLayout, type Insets, type Layout } from './layout.ts';
import { Particles } from './particles.ts';
import { SpriteCache } from './sprites.ts';
import { DAY, GEOM, MOTION, type Palette } from './theme.ts';
import { clamp01, easeInCubic, easeOutBack, easeOutCubic, easeOutQuad, lerp } from './tween.ts';
import { STREAK_GRACE } from '../core/scoring.ts';

export interface DragView {
  slot: number;
  /** Top-left of the piece in CSS px (already lifted above the finger). */
  x: number;
  y: number;
  /** 0 = tray scale, 1 = board scale (animated by the drag controller). */
  grow: number;
}

export interface PreviewView {
  /** Anchor cell for the ghost, or null when no valid snap. */
  ax: number;
  ay: number;
  piece: Piece;
  color: number;
  pocket: ReadonlySet<number>;
  ring: ReadonlySet<number>;
  /** Points this drop would score (shown only for lagoons of 3+ cells). */
  points?: number;
}

interface Dying {
  cell: number;
  color: number;
  start: number;
}
interface Lagoon {
  cells: readonly number[];
  start: number;
}
interface Ripple {
  x: number;
  y: number;
  start: number;
  r: number;
}
interface FloatText {
  text: string;
  x: number;
  y: number;
  start: number;
  size: number;
  life: number;
  strong: boolean;
}
interface Fish {
  x: number;
  y: number;
  vx: number;
  vy: number;
  start: number;
  size: number;
  hue: string;
}
interface TraySlot {
  t: TrayPiece | null;
  dealStart: number;
  /** When a piece snaps back after an invalid drop. */
  back: { x: number; y: number; start: number } | null;
}
interface Placing {
  cells: readonly number[];
  color: number;
  fromX: number;
  fromY: number;
  ax: number;
  ay: number;
  piece: Piece;
  start: number;
}

export const FONT = `ui-rounded, "SF Pro Rounded", "Nunito", system-ui, -apple-system, "Segoe UI", sans-serif`;

export class Scene {
  palette: Palette = DAY;
  layout: Layout;
  dpr = 1;
  reducedMotion = false;
  readonly sprites: SpriteCache;
  readonly particles = new Particles(700);

  board = new Uint8Array(CELLS);
  land = new Float64Array(CELLS); // start time of landing bounce per cell
  dying: Dying[] = [];
  lagoons: Lagoon[] = [];
  ripples: Ripple[] = [];
  texts: FloatText[] = [];
  placing: Placing[] = [];
  fish: Fish[] = [];
  tray: TraySlot[] = [0, 1, 2].map(() => ({ t: null, dealStart: 0, back: null }));
  drag: DragView | null = null;
  preview: PreviewView | null = null;
  shake = { start: -1e9, amp: 0 };
  score = 0;
  /** Latest logical total, revealed by fx when a capture's points land. */
  pendingScore: number | null = null;
  shownScore = 0;
  best = 0;
  streak = 0;
  /** Dry moves since the last capture (streak breaks at STREAK_GRACE). */
  dry = 0;
  streakPulse = -1e9;
  gameOverAt = -1;
  hint: { cells: readonly number[]; start: number } | null = null;
  /** Replaces the score HUD (puzzle mode). */
  hudLabel: { top: string; big: string; sub: string } | null = null;

  /** Tray slots whose piece fits nowhere on the current board (drawn faded). */
  misfit: boolean[] = [false, false, false];
  /** Tap-to-place selection (drawn raised with an outline). */
  selected: number | null = null;

  private panel: HTMLCanvasElement | OffscreenCanvas | null = null;
  private visRand = 0x12345;

  constructor(
    readonly canvas: HTMLCanvasElement,
    private readonly g: CanvasRenderingContext2D,
  ) {
    this.sprites = new SpriteCache(1);
    this.layout = computeLayout(360, 640);
  }

  /** Visual-only randomness (never used for gameplay). */
  rand = (): number => {
    this.visRand = (this.visRand * 1664525 + 1013904223) >>> 0;
    return this.visRand / 4294967296;
  };

  resize(w: number, h: number, dpr: number, inset?: Insets): void {
    this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.layout = computeLayout(w, h, inset);
    this.sprites.reset(dpr);
    this.panel = null;
  }

  setPalette(p: Palette): void {
    this.palette = p;
    this.panel = null;
  }

  cellCenter(i: number): [number, number] {
    const l = this.layout;
    return [l.board.x + (xOf(i) + 0.5) * l.cell, l.board.y + (yOf(i) + 0.5) * l.cell];
  }

  /** Top-left CSS px of a tray piece at rest in its slot. */
  trayPieceOrigin(slot: number, p: Piece): [number, number] {
    const s = this.layout.slots[slot]!;
    const c = this.layout.trayCell;
    return [s.cx - (p.w * c) / 2, s.cy - (p.h * c) / 2];
  }

  // ------------------------------------------------------------------ drawing

  draw(now: number, dt: number): void {
    const g = this.g;
    const l = this.layout;
    const p = this.palette;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.particles.update(dt);
    this.shownScore = this.shownScore + (this.score - this.shownScore) * Math.min(1, dt / 90);
    if (Math.abs(this.score - this.shownScore) < 0.5) this.shownScore = this.score;

    // background
    g.fillStyle = p.bg;
    g.fillRect(0, 0, l.w, l.h);
    const glow = g.createRadialGradient(
      l.w / 2,
      l.board.y + l.board.h * 0.4,
      0,
      l.w / 2,
      l.board.y + l.board.h * 0.4,
      l.w * 0.9,
    );
    glow.addColorStop(0, p.bgGlow);
    glow.addColorStop(1, p.bg);
    g.fillStyle = glow;
    g.fillRect(0, 0, l.w, l.h);

    // shake (board + pieces only, never HUD)
    const st = (now - this.shake.start) / MOTION.shake;
    let sx = 0;
    let sy = 0;
    if (!this.reducedMotion && st < 1) {
      const a = this.shake.amp * (1 - st) * (1 - st);
      sx = Math.sin(now * 0.09) * a;
      sy = Math.cos(now * 0.113) * a;
    }
    g.save();
    g.translate(sx, sy);
    this.drawPanel();
    this.drawLagoons(now);
    this.drawPreviewWater(now);
    this.drawBlocks(now);
    this.drawGhost();
    this.drawPlacing(now);
    this.drawDying(now);
    this.drawRipples(now);
    g.restore();
    this.drawPointsPeek();

    this.drawHint(now);
    this.drawTray(now);
    this.drawDrag();
    this.drawFish(now);
    this.particles.draw(g, this.sprites.look.colors, p.foam);
    this.drawTexts(now);
    this.drawHud(now);
    this.gc(now);
  }

  private drawPanel(): void {
    const l = this.layout;
    if (!this.panel) {
      const pad = Math.ceil(l.cell * 0.22);
      const W = l.board.w + pad * 2;
      const px = Math.ceil(W * this.dpr);
      const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(px, px) : document.createElement('canvas');
      c.width = px;
      c.height = px;
      const g = c.getContext('2d') as CanvasRenderingContext2D;
      g.scale(this.dpr, this.dpr);
      const p = this.palette;
      g.fillStyle = p.boardEdge;
      g.beginPath();
      g.roundRect(0, pad * 0.25, W, W, W * GEOM.boardRadius);
      g.fill();
      g.fillStyle = p.board;
      g.beginPath();
      g.roundRect(0, 0, W, W, W * GEOM.boardRadius);
      g.fill();
      const cell = l.cell;
      const gut = cell * GEOM.gutter;
      for (let i = 0; i < CELLS; i++) {
        const x = pad + xOf(i) * cell + gut;
        const y = pad + yOf(i) * cell + gut;
        const s = cell - gut * 2;
        g.fillStyle = p.cellInset;
        g.beginPath();
        g.roundRect(x, y, s, s, s * GEOM.cellRadius);
        g.fill();
        g.fillStyle = p.cell;
        g.beginPath();
        g.roundRect(x, y + s * 0.05, s, s * 0.95, s * GEOM.cellRadius);
        g.fill();
      }
      this.panel = c;
      (this.panel as unknown as { pad: number }).pad = pad;
    }
    const pad = (this.panel as unknown as { pad: number }).pad;
    const W = l.board.w + pad * 2;
    this.g.drawImage(this.panel, l.board.x - pad, l.board.y - pad, W, W);
  }

  private cellRect(i: number, scale = 1): [number, number, number] {
    const l = this.layout;
    const s = l.cell * scale;
    return [l.board.x + xOf(i) * l.cell + (l.cell - s) / 2, l.board.y + yOf(i) * l.cell + (l.cell - s) / 2, s];
  }

  private drawWaterCell(i: number, alpha: number, now: number): void {
    const g = this.g;
    const p = this.palette;
    const [x, y, s] = this.cellRect(i);
    const gut = s * GEOM.gutter;
    g.globalAlpha = alpha;
    g.fillStyle = p.water;
    g.beginPath();
    g.roundRect(x + gut, y + gut, s - gut * 2, s - gut * 2, s * GEOM.cellRadius);
    g.fill();
    // shimmer band
    const phase = (now / 900 + xOf(i) * 0.17 + yOf(i) * 0.11) % 1;
    g.globalAlpha = alpha * 0.55;
    g.fillStyle = p.waterHi;
    g.fillRect(x + gut * 2, y + gut + (s - gut * 2) * phase * 0.8, s - gut * 4, Math.max(1.5, s * 0.08));
    g.globalAlpha = 1;
  }

  private drawPreviewWater(now: number): void {
    const pv = this.preview;
    if (!pv || pv.pocket.size === 0) return;
    const a = 0.55 + 0.2 * Math.sin(now / 160);
    for (const c of pv.pocket) this.drawWaterCell(c, a, now);
  }

  /** "+84" floating over a big would-be lagoon: makes pinch-vs-lagoon a visible choice. */
  private drawPointsPeek(): void {
    const pv = this.preview;
    if (!pv || !pv.points || pv.pocket.size < 3) return;
    let sx = 0;
    let sy = 0;
    for (const c of pv.pocket) {
      const [x, y] = this.cellCenter(c);
      sx += x;
      sy += y;
    }
    const g = this.g;
    const size = Math.round(this.layout.cell * 0.42);
    g.font = `800 ${size}px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.lineWidth = size * 0.22;
    g.strokeStyle = this.palette.name === 'night' ? 'rgba(0,20,30,0.8)' : 'rgba(255,255,255,0.95)';
    const t = `+${pv.points}`;
    g.strokeText(t, sx / pv.pocket.size, sy / pv.pocket.size);
    g.fillStyle = this.palette.name === 'night' ? this.palette.waterHi : '#1F8FB5';
    g.fillText(t, sx / pv.pocket.size, sy / pv.pocket.size);
  }

  private drawLagoons(now: number): void {
    for (const lg of this.lagoons) {
      const t = (now - lg.start) / (MOTION.lagoonFill * 4);
      if (t < 0 || t >= 1) continue;
      const a = t < 0.25 ? easeOutQuad(t / 0.25) : 1 - easeInCubic((t - 0.25) / 0.75);
      for (const c of lg.cells) this.drawWaterCell(c, a * 0.95, now);
    }
  }

  private drawBlocks(now: number): void {
    const g = this.g;
    const pv = this.preview;
    for (let i = 0; i < CELLS; i++) {
      const c = this.board[i]!;
      if (!c) continue;
      let scale = 1;
      const lt = (now - this.land[i]!) / MOTION.place;
      if (lt >= 0 && lt < 1.6) scale = lt < 1 ? lerp(1.12, 1, easeOutBack(lt, 3)) : 1;
      const lit = pv?.ring.has(i) ?? false;
      if (lit && !this.reducedMotion) scale *= 1.03 + 0.03 * Math.sin(now / 90 + i);
      const [x, y, s] = this.cellRect(i, scale);
      g.drawImage(
        this.sprites.pebble(this.palette, c, Math.round(this.layout.cell), lit ? 'lit' : 'normal'),
        x,
        y,
        s,
        s,
      );
    }
  }

  private drawGhost(): void {
    const pv = this.preview;
    if (!pv) return;
    const g = this.g;
    const l = this.layout;
    g.globalAlpha = 0.38;
    for (const [dx, dy] of pv.piece.cells) {
      const i = (pv.ay + dy) * N + pv.ax + dx;
      if (pv.ring.has(i)) continue; // drawn lit as part of the ring
      const [x, y, s] = this.cellRect(i);
      g.drawImage(this.sprites.pebble(this.palette, pv.color, Math.round(l.cell)), x, y, s, s);
    }
    g.globalAlpha = 1;
    if (pv.ring.size) {
      g.globalAlpha = 0.9;
      for (const [dx, dy] of pv.piece.cells) {
        const i = (pv.ay + dy) * N + pv.ax + dx;
        if (!pv.ring.has(i)) continue;
        const [x, y, s] = this.cellRect(i);
        g.drawImage(this.sprites.pebble(this.palette, pv.color, Math.round(l.cell), 'lit'), x, y, s, s);
      }
      g.globalAlpha = 1;
    }
  }

  private drawPlacing(now: number): void {
    const l = this.layout;
    for (const pl of this.placing) {
      const t = clamp01((now - pl.start) / (MOTION.place * 0.8));
      const e = easeOutCubic(t);
      const tx = l.board.x + pl.ax * l.cell;
      const ty = l.board.y + pl.ay * l.cell;
      const ox = lerp(pl.fromX, tx, e);
      const oy = lerp(pl.fromY, ty, e);
      for (const [dx, dy] of pl.piece.cells) {
        this.g.drawImage(
          this.sprites.pebble(this.palette, pl.color, Math.round(l.cell)),
          ox + dx * l.cell,
          oy + dy * l.cell,
          l.cell,
          l.cell,
        );
      }
    }
  }

  private drawDying(now: number): void {
    const g = this.g;
    for (const d of this.dying) {
      const t = (now - d.start) / 260;
      if (t < 0) {
        const [x, y, s] = this.cellRect(d.cell);
        g.drawImage(this.sprites.pebble(this.palette, d.color, Math.round(this.layout.cell), 'lit'), x, y, s, s);
        continue;
      }
      if (t >= 1) continue;
      const scale = t < 0.3 ? lerp(1, 1.18, easeOutQuad(t / 0.3)) : lerp(1.18, 0, easeInCubic((t - 0.3) / 0.7));
      const [x, y, s] = this.cellRect(d.cell, scale);
      g.globalAlpha = 1 - easeInCubic(t);
      g.drawImage(this.sprites.pebble(this.palette, d.color, Math.round(this.layout.cell), 'lit'), x, y, s, s);
      g.globalAlpha = 1;
    }
  }

  private drawRipples(now: number): void {
    const g = this.g;
    g.strokeStyle = this.palette.foam;
    for (const r of this.ripples) {
      const t = (now - r.start) / 700;
      if (t < 0 || t >= 1) continue;
      g.globalAlpha = (1 - t) * 0.7;
      g.lineWidth = Math.max(1, 4 * (1 - t));
      g.beginPath();
      g.arc(r.x, r.y, r.r * easeOutCubic(t), 0, Math.PI * 2);
      g.stroke();
    }
    g.globalAlpha = 1;
  }

  private drawPieceAt(p: Piece, color: number, x: number, y: number, cell: number, alpha = 1): void {
    const g = this.g;
    g.globalAlpha = alpha;
    const spr = this.sprites.pebble(this.palette, color, Math.round(cell));
    for (const [dx, dy] of p.cells) g.drawImage(spr, x + dx * cell, y + dy * cell, cell, cell);
    g.globalAlpha = 1;
  }

  private drawTray(now: number): void {
    const l = this.layout;
    this.tray.forEach((slot, i) => {
      if (!slot.t || this.drag?.slot === i) return;
      const p = pieceById(slot.t.pieceId);
      const [ox, oy] = this.trayPieceOrigin(i, p);
      const t = clamp01((now - slot.dealStart) / MOTION.dealIn);
      if (t <= 0) return;
      let x = ox;
      let y = oy + (1 - easeOutCubic(t)) * l.cell * 1.2;
      const a = easeOutQuad(t);
      if (slot.back) {
        const bt = clamp01((now - slot.back.start) / MOTION.returnToTray);
        const e = easeOutCubic(bt);
        x = lerp(slot.back.x, ox, e);
        y = lerp(slot.back.y, oy, e);
        if (bt >= 1) slot.back = null;
        const cell = lerp(l.cell, l.trayCell, e);
        this.drawPieceAt(p, slot.t.color, x, y, cell);
        return;
      }
      const dimmed = this.gameOverAt >= 0 || this.misfit[i] === true;
      // last chance: the pieces that couldn't fit shake "no" before the card appears
      const wt = now - this.gameOverAt;
      if (this.gameOverAt >= 0 && wt < 600 && !this.reducedMotion)
        x += Math.sin(wt / 28) * l.cell * 0.12 * (1 - wt / 600);
      if (this.selected === i) {
        const sl = l.slots[i]!;
        this.g.strokeStyle = this.palette.water;
        this.g.lineWidth = 3;
        this.g.beginPath();
        this.g.roundRect(sl.cx - sl.w * 0.42, sl.cy - sl.h * 0.42, sl.w * 0.84, sl.h * 0.84, l.cell * 0.4);
        this.g.stroke();
        y -= l.cell * 0.15;
      }
      this.drawPieceAt(p, slot.t.color, x, y, l.trayCell, a * (dimmed ? 0.45 : 1));
    });
  }

  private drawDrag(): void {
    const d = this.drag;
    if (!d) return;
    const slot = this.tray[d.slot];
    if (!slot?.t) return;
    const l = this.layout;
    const p = pieceById(slot.t.pieceId);
    const cell = lerp(l.trayCell, l.cell, easeOutCubic(d.grow));
    // soft lifted shadow
    const g = this.g;
    g.globalAlpha = 0.18;
    g.fillStyle = '#000';
    for (const [dx, dy] of p.cells) {
      g.beginPath();
      g.roundRect(d.x + dx * cell + cell * 0.12, d.y + dy * cell + cell * 0.3, cell * 0.8, cell * 0.8, cell * 0.25);
      g.fill();
    }
    g.globalAlpha = 1;
    this.drawPieceAt(p, slot.t.color, d.x, d.y, cell);
  }

  private drawHint(now: number): void {
    const h = this.hint;
    if (!h) return;
    const g = this.g;
    const a = 0.25 + 0.2 * Math.sin((now - h.start) / 220);
    g.strokeStyle = this.palette.water;
    g.lineWidth = 2.5;
    g.globalAlpha = a;
    for (const c of h.cells) {
      const [x, y, s] = this.cellRect(c, 0.86);
      g.beginPath();
      g.roundRect(x, y, s, s, s * GEOM.cellRadius);
      g.stroke();
    }
    g.globalAlpha = 1;
  }

  /** Ballistic little fish leaping out of a lagoon (visual only). */
  private drawFish(now: number): void {
    const g = this.g;
    for (const f of this.fish) {
      const t = (now - f.start) / 1000;
      if (t < 0 || t > 0.9) continue;
      const x = f.x + f.vx * t;
      const y = f.y + f.vy * t + 0.5 * 2600 * t * t;
      const ang = Math.atan2(f.vy + 2600 * t, f.vx);
      g.save();
      g.translate(x, y);
      g.rotate(ang);
      g.globalAlpha = t > 0.7 ? 1 - (t - 0.7) / 0.2 : 1;
      const s = f.size;
      g.fillStyle = f.hue;
      g.beginPath();
      g.ellipse(0, 0, s, s * 0.52, 0, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.moveTo(-s * 0.85, 0);
      g.lineTo(-s * 1.55, -s * 0.5);
      g.lineTo(-s * 1.55, s * 0.5);
      g.closePath();
      g.fill();
      g.fillStyle = '#FFFFFF';
      g.beginPath();
      g.arc(s * 0.45, -s * 0.12, s * 0.16, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#1A1A1A';
      g.beginPath();
      g.arc(s * 0.5, -s * 0.12, s * 0.08, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
    g.globalAlpha = 1;
  }

  private drawTexts(now: number): void {
    const g = this.g;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (const t of this.texts) {
      const k = (now - t.start) / t.life;
      if (k < 0 || k >= 1) continue;
      const rise = easeOutCubic(k) * this.layout.cell * (t.strong ? 0.6 : 1.1);
      const pop = t.strong && !this.reducedMotion ? (k < 0.18 ? easeOutBack(k / 0.18, 2.5) : 1) : 1;
      g.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      g.font = `800 ${Math.round(t.size * pop)}px ${FONT}`;
      g.lineWidth = Math.max(3, t.size * 0.16);
      const night = this.palette.name === 'night';
      g.lineJoin = 'round';
      g.strokeStyle = t.strong
        ? night
          ? 'rgba(0,20,30,0.75)'
          : '#FFFFFF'
        : night
          ? 'rgba(0,0,0,0.55)'
          : 'rgba(59,50,41,0.6)';
      g.strokeText(t.text, t.x, t.y - rise);
      g.fillStyle = t.strong ? (night ? this.palette.waterHi : '#1F8FB5') : '#FFFFFF';
      g.fillText(t.text, t.x, t.y - rise);
    }
    g.globalAlpha = 1;
  }

  private drawHud(now: number): void {
    const g = this.g;
    const l = this.layout;
    const p = this.palette;
    const cx = l.w / 2;
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    const big = Math.round(Math.min(56, l.hud.h * 0.48));
    if (this.hudLabel) {
      g.fillStyle = p.textDim;
      g.font = `700 ${Math.round(big * 0.3)}px ${FONT}`;
      g.fillText(this.hudLabel.top, cx, l.hud.y + l.hud.h * 0.24);
      g.fillStyle = p.text;
      g.font = `800 ${big}px ${FONT}`;
      g.fillText(this.hudLabel.big, cx, l.hud.y + l.hud.h * 0.7);
      g.font = `700 ${Math.round(big * 0.28)}px ${FONT}`;
      g.fillStyle = p.water;
      g.fillText(this.hudLabel.sub, cx, l.hud.y + l.hud.h * 0.95);
      return;
    }
    g.fillStyle = p.text;
    g.font = `800 ${big}px ${FONT}`;
    g.fillText(String(Math.round(this.shownScore)), cx, l.hud.y + l.hud.h * 0.7);
    g.font = `700 ${Math.round(big * 0.3)}px ${FONT}`;
    g.fillStyle = p.textDim;
    const beat = this.score > this.best && this.best > 0;
    g.fillText(beat ? 'NEW BEST' : `BEST ${this.best}`, cx, l.hud.y + l.hud.h * 0.24);
    if (this.streak >= 2) {
      const k = clamp01((now - this.streakPulse) / 300);
      const sc = this.reducedMotion ? 1 : 1 + 0.25 * (1 - easeOutCubic(k));
      g.font = `800 ${Math.round(big * 0.34 * sc)}px ${FONT}`;
      g.fillStyle = p.water;
      const label = `≈ ×${this.streak}`;
      // tide dots: moves left before the streak breaks (fills back up on every capture)
      const w = g.measureText(label).width;
      const r = Math.max(2.5, big * 0.06);
      const dotsW = r * 3 + (STREAK_GRACE - 1) * r * 2.8;
      const x0 = cx - (w + dotsW) / 2;
      g.textAlign = 'left';
      g.fillText(label, x0, l.hud.y + l.hud.h * 0.95);
      g.textAlign = 'center';
      for (let i = 0; i < STREAK_GRACE; i++) {
        g.globalAlpha = i < STREAK_GRACE - this.dry ? 1 : 0.22;
        g.beginPath();
        g.arc(x0 + w + r * 3 + i * r * 2.8, l.hud.y + l.hud.h * 0.95 - big * 0.12, r, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
    }
  }

  private gc(now: number): void {
    if (this.dying.length && this.dying.every((d) => now - d.start > 300)) this.dying = [];
    this.lagoons = this.lagoons.filter((x) => now - x.start < MOTION.lagoonFill * 4);
    this.ripples = this.ripples.filter((x) => now - x.start < 700);
    this.texts = this.texts.filter((x) => now - x.start < x.life);
    this.placing = this.placing.filter((x) => now - x.start < MOTION.place);
    this.fish = this.fish.filter((x) => now - x.start < 900);
  }

  /** True when something is animating (lets the loop idle to save battery). */
  busy(now: number): boolean {
    return (
      this.drag !== null ||
      this.preview !== null ||
      this.particles.count > 0 ||
      this.dying.length > 0 ||
      this.lagoons.length > 0 ||
      this.ripples.length > 0 ||
      this.texts.length > 0 ||
      this.placing.length > 0 ||
      this.fish.length > 0 ||
      this.hint !== null ||
      this.selected !== null ||
      Math.abs(this.score - this.shownScore) > 0.5 ||
      now - this.shake.start < MOTION.shake ||
      this.tray.some((s) => now - s.dealStart < MOTION.dealIn || s.back !== null) ||
      this.land.some((t) => now - t < MOTION.place * 1.6) ||
      now - this.streakPulse < 300 ||
      (this.gameOverAt >= 0 && now - this.gameOverAt < 600)
    );
  }
}
