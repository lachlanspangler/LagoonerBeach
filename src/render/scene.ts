/**
 * Scene: the presentation model + Canvas2D drawing. It mirrors the logical board and holds only
 * animation state. It never decides rules — it's told what happened (see fx.ts).
 */
import { CELLS, N, xOf, yOf } from '../core/grid.ts';
import { pieceById, type Piece } from '../core/pieces.ts';
import type { TrayPiece } from '../core/dealer.ts';
import { computeLayout, hudStack, trayCellFor, type Insets, type Layout } from './layout.ts';
import { Kind, Particles } from './particles.ts';
import { SpriteCache } from './sprites.ts';
import { DAY, DISPLAY_STACK, FONT_STACK, GEOM, MOTION, fmt, type Palette } from './theme.ts';
import { Burst } from './burst.ts';
import { Celebrate, spring } from './celebrate.ts';

/** 0 → 1 with a small overshoot over a unit of time. */
const spring01 = (k: number): number => spring(k * 360, 360, 0.1);
import { clamp01, easeInCubic, easeInOutSine, easeOutBack, easeOutCubic, easeOutQuad, lerp } from './tween.ts';
import { SPECIES_BY_ID } from '../meta/creatures.ts';
import { drawCreature } from './creatures.ts';
import { drawTap } from '../ui/icons.ts';

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
  /** Points: lagoon-blue fill instead of white. */
  accent?: boolean;
  /** How far it drifts up over its life, in cells (default 0.7; callouts 0.25). */
  rise?: number;
}
export interface Fish {
  x: number;
  y: number;
  vx: number;
  vy: number;
  start: number;
  size: number;
  hue: string;
  /** The caught species (drawn with its own art); otherwise a generic fish. */
  species?: string;
  golden?: boolean;
  /** First time this species was ever caught: a gold ring. */
  isNew?: boolean;
  arrived?: boolean;
  /** "+N" coin chip standing in for N more creatures (at most ~3 creatures fly at once). */
  chip?: number;
  /** Seconds from the lagoon to touchdown in the water beside the board. */
  flight?: number;
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

/** Seconds a leaping creature stays on screen. */
/** Longest leap: flight (≤ 1.1 s) + nothing after (the splash is its own effect). */
export const FISH_LIFE = 1.15;
/** Leap gravity in cells/s² and the default flight time (fx.leap solves the arc with these). */
export const FISH_GRAVITY = 34;
export const FISH_FLIGHT = 0.8;

export const FONT = FONT_STACK;
/** Display voice (callouts, names, titles). Never for numbers: its digits are proportional. */
export const DISPLAY_FONT = DISPLAY_STACK;

export class Scene {
  palette: Palette = DAY;
  layout: Layout;
  dpr = 1;
  reducedMotion = false;
  /** A sheet or modal covers the board: purely ambient animation needn't keep the loop running. */
  covered = false;
  /** Large text setting: scales every piece of canvas text. */
  textScale = 1;
  readonly sprites: SpriteCache;
  readonly particles = new Particles(700);

  board = new Uint8Array(CELLS);
  land = new Float64Array(CELLS); // start time of landing bounce per cell
  /** Ring pebbles popping and scattering (ADR 0012). */
  readonly burst = new Burst();
  /** Words, +N, COMBO badge, NEW BEST banner, tide wash. */
  readonly celebrate = new Celebrate();
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
  hint: {
    cells: readonly number[];
    start: number;
    /** First-run demo: a ghost of this tray piece glides to the hinted spot, on loop. */
    demo?: { slot: number; ax: number; ay: number } | null;
  } | null = null;
  /** First run: one standing line in the strip ("Close a ring of blocks"); chips take the slot. */
  coach: string | null = null;
  /** Replaces the score HUD (puzzle mode); `chapter` is drawn as progress in the strip. */
  hudLabel: {
    top: string;
    big: string;
    sub: string;
    tier?: string;
    /** Chapter name line + 20 segments (0 open, 1 cleared, 2 this reef). */
    chapter?: { name: string; segs: readonly number[] };
  } | null = null;

  /** Tray slots whose piece fits nowhere on the current board (drawn faded). */
  misfit: boolean[] = [false, false, false];
  /** Chips (catches, milestones) queue strictly: one on screen, the next only after it's gone. */
  private chips: { text: string; life: number; start: number }[] = [];
  toast(text: string, now: number, life = 1500): void {
    const prev = this.chips[this.chips.length - 1];
    const free = Math.max(now, this.stripHold + 80);
    const start = prev ? Math.max(free, prev.start + prev.life + 80) : free;
    if (this.chips.length >= 4) return; // never build a backlog of stale news
    this.chips.push({ text, life, start });
  }

  clearChips(): void {
    this.chips = [];
    this.stripHold = -1e9;
  }

  /** Something else (a common discovery pop) owns the strip until `until`: chips wait for it. */
  stripHold = -1e9;
  holdStrip(until: number): void {
    this.stripHold = Math.max(this.stripHold, until);
    let t = until + 80;
    for (const c of this.chips)
      if (c.start < t) {
        c.start = t;
        t = c.start + c.life + 80;
      }
  }

  private drawChips(now: number): void {
    while (this.chips.length && now > this.chips[0]!.start + this.chips[0]!.life) this.chips.shift();
    const c = this.chips[0];
    if (!c || now < c.start) return;
    const k = (now - c.start) / c.life;
    const g = this.g;
    const l = this.layout;
    const a = k < 0.12 ? k / 0.12 : k > 0.82 ? (1 - k) / 0.18 : 1;
    const p = this.palette;
    const size = Math.round(Math.min(15, l.cell * 0.34) * this.textScale);
    g.font = `800 ${size}px ${FONT}`;
    const w = Math.min(l.w - 24, g.measureText(c.text).width + size * 2);
    const h = Math.round(size * 2.2);
    // chips own the strip between board and tray (never the HUD's COMBO slot, never the board)
    const cy = this.stripY();
    const s = this.reducedMotion ? 1 : 0.9 + 0.1 * spring01(Math.min(1, k / 0.14));
    const drop = this.reducedMotion ? 0 : (1 - easeOutCubic(Math.min(1, k / 0.12))) * 6;
    g.globalAlpha = a;
    g.save();
    g.translate(l.w / 2, cy + drop);
    g.scale(s, s);
    g.fillStyle = p.name === 'night' ? 'rgba(0,0,0,0.35)' : 'rgba(74,52,30,0.10)';
    g.beginPath();
    g.roundRect(-w / 2, -h / 2 + 3, w, h, h / 2);
    g.fill();
    g.fillStyle = p.surface;
    g.beginPath();
    g.roundRect(-w / 2, -h / 2, w, h, h / 2);
    g.fill();
    g.restore();
    g.fillStyle = p.accent;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(c.text, l.w / 2, cy + drop + 1, w - size);
    g.globalAlpha = 1;
  }

  /** The first-run line: quiet text in the strip (no pill), so a chip arriving reads as news. */
  private drawCoach(now: number): void {
    const text = this.coach;
    if (!text || now < this.stripHold || (this.chips.length > 0 && now >= this.chips[0]!.start)) return;
    const g = this.g;
    const l = this.layout;
    const size = Math.round(Math.min(18, l.cell * 0.4) * this.textScale);
    g.font = `800 ${size}px ${FONT}`;
    g.fillStyle = this.palette.text;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    // the demo ghost and its hand glide up through the strip: the line steps back while they pass
    const cy = this.stripY();
    const pose = this.demoPose(now);
    if (pose) {
      const top = pose.y - l.cell * 0.2;
      const bottom = pose.y + pose.p.h * pose.cell + l.cell * 1.3; // the hand hangs below the piece
      const gap = Math.max(top - (cy + size), cy - size - bottom, 0);
      g.globalAlpha = lerp(1, 0.12, pose.fade * (1 - clamp01(gap / (l.cell * 0.8))));
    }
    g.fillText(text, l.w / 2, cy, l.w - 24);
    g.globalAlpha = 1;
  }

  /** Vertical center of the strip between the board and the tray's pieces. */
  stripY(): number {
    const l = this.layout;
    return l.strip.y + Math.min(l.strip.h, l.cell * 1.6) / 2 + l.cell * 0.05;
  }

  /** Reef mode: chapter progress in the strip (20 segments, this reef marked). Chips take the slot. */
  private drawStrip(now: number): void {
    const ch = this.hudLabel?.chapter;
    if (!ch || now < this.stripHold || (this.chips.length > 0 && now >= this.chips[0]!.start)) return;
    const g = this.g;
    const l = this.layout;
    const p = this.palette;
    const cy = this.stripY();
    const W = Math.min(l.board.w * 0.62, 240);
    const x0 = l.w / 2 - W / 2;
    const gap = 3;
    const sw = (W - gap * (ch.segs.length - 1)) / ch.segs.length;
    const size = Math.round(Math.min(13, l.cell * 0.29) * this.textScale);
    g.font = `800 ${size}px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    g.fillStyle = p.textDim;
    g.fillText(ch.name, l.w / 2, cy - 5, l.w - 24);
    ch.segs.forEach((v, i) => {
      g.fillStyle = v === 1 ? (p.name === 'night' ? p.accent : p.water) : v === 2 ? p.accent : p.surfaceSunk;
      g.beginPath();
      g.roundRect(x0 + i * (sw + gap), cy + 3 - (v === 2 ? 1 : 0), sw, v === 2 ? 8 : 6, 3);
      g.fill();
    });
  }

  /** Where caught creatures swim off to (the menu button, where the journal lives). */
  journalTarget: { x: number; y: number } | null = null;
  onCollect: (() => void) | null = null;
  /** A creature dove back into the water (sound hook). */
  onSplash: ((isNew: boolean) => void) | null = null;
  splashes: { x: number; y: number; start: number; r: number }[] = [];

  /** Where the held piece was last drawn (release flight starts here, so nothing jumps). */
  lastDragDraw: { x: number; y: number } | null = null;
  /** Jackpot light sweep across the board. */
  sweep = -1e9;
  /** Score punch when a big moment's points land; `gold`: a peak (tier ≥ 3) tints it gold. */
  scorePunch = { at: -1e9, amp: 0, gold: false };
  /** Peak moments count the score up on a fixed clock (so the pulse lands with the last digit). */
  scoreRoll = { at: -1e9, ms: 0, from: 0, to: 0 };
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
    this.celebrate.sprites.dpr = dpr;
    this.celebrate.sprites.clear();
    this.panel = null;
  }

  /** Pre-render every pebble sprite the current layout can need, so first use never stalls. */
  warmSprites(): void {
    const sizes = [Math.round(this.layout.cell), Math.round(this.layout.trayCell)];
    for (let c = 1; c <= 6; c++)
      for (const s of sizes) {
        this.sprites.pebble(this.palette, c, s, 'normal');
        this.sprites.pebble(this.palette, c, s, 'lit');
      }
  }

  /** Bundled fonts arrived: re-render cached display text. */
  fontsReady(): void {
    this.celebrate.sprites.clear();
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
  /** The hand as dealt (piece ids): its pieces share one tray cell size (`trayCell`). */
  hand: readonly string[] = [];

  /**
   * Cell size of a piece in the tray: one size for the whole hand, the largest every piece of it
   * fits at (a 5-long piece used to sit visibly smaller than its neighbours). Stable until the next
   * deal, so placing the long piece doesn't make the others jump.
   */
  trayCell(p: Piece): number {
    let c = trayCellFor(this.layout, p);
    for (const id of this.hand) c = Math.min(c, trayCellFor(this.layout, pieceById(id)));
    return c;
  }

  trayPieceOrigin(slot: number, p: Piece): [number, number] {
    const s = this.layout.slots[slot]!;
    const c = this.trayCell(p);
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
    const rk = (now - this.scoreRoll.at) / this.scoreRoll.ms;
    if (rk >= 0 && rk < 1 && this.score === this.scoreRoll.to)
      this.shownScore = Math.round(lerp(this.scoreRoll.from, this.scoreRoll.to, easeOutCubic(rk)));

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
    this.drawGlow(now);
    this.drawBlocks(now);
    this.drawGhost();
    this.drawPlacing(now);
    const ps = Math.round(l.cell);
    // the scatter stays around the board: never over the HUD or into the tray
    g.save();
    g.beginPath();
    const top = Math.max(l.hud.y + l.hud.h, l.board.y - l.cell * 0.7);
    g.rect(l.board.x - l.cell * 0.7, top, l.board.w + l.cell * 1.4, l.board.y + l.board.h + l.cell * 0.4 - top);
    g.clip();
    this.burst.draw(
      g,
      now,
      l.cell,
      (c) => this.sprites.pebble(p, c, ps, 'lit'),
      (c) => this.sprites.pebble(p, c, ps, 'normal'),
    );
    g.restore();
    this.drawRipples(now);
    this.drawSweep(now);
    g.restore();
    this.drawPointsPeek();

    this.drawCoach(now);
    this.drawHint(now);
    this.drawTray(now);
    this.drawDrag();
    this.drawFish(now);
    this.drawSplashes(now);
    this.particles.draw(g, this.sprites.look.colors, p.foam);
    this.celebrate.drawBoard(g, now, l, p, this.reducedMotion);
    this.drawTexts(now);
    this.drawHud(now);
    this.drawStrip(now);
    this.drawChips(now);
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
      // a top highlight: the board reads as a lit tray (night) / a wet-sand rim (day)
      g.save();
      g.clip();
      g.strokeStyle = p.boardHi;
      g.lineWidth = 2;
      g.beginPath();
      g.roundRect(1, 1, W - 2, W + 8, W * GEOM.boardRadius);
      g.stroke();
      g.restore();
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

  /**
   * One water cell: a soft vertical gradient (light surface → deeper water) plus a single diagonal
   * sheen that sweeps across the whole board, so neighboring cells read as one body of water.
   */
  private drawWaterCell(i: number, alpha: number, now: number): void {
    const g = this.g;
    const p = this.palette;
    const [x, y, s] = this.cellRect(i);
    const gut = s * GEOM.gutter;
    const grad = g.createLinearGradient(x, y + gut, x, y + s - gut);
    grad.addColorStop(0, p.waterHi);
    grad.addColorStop(0.55, p.water);
    grad.addColorStop(1, p.water);
    g.globalAlpha = alpha;
    g.fillStyle = grad;
    g.beginPath();
    g.roundRect(x + gut, y + gut, s - gut * 2, s - gut * 2, s * GEOM.cellRadius);
    g.fill();
    // sheen: brightness from the distance between this cell's diagonal and a slowly moving line
    const b = this.layout.board;
    const span = b.w + b.h;
    const sweep = ((now / 1400) % 1.6) * span - span * 0.3;
    const d = Math.abs(x - b.x + (y - b.y) - sweep) / (s * 1.6);
    if (d < 1) {
      g.globalAlpha = alpha * 0.35 * (1 - d) * (1 - d);
      g.fillStyle = '#FFFFFF';
      g.beginPath();
      g.roundRect(x + gut, y + gut, s - gut * 2, s - gut * 2, s * GEOM.cellRadius);
      g.fill();
    }
    g.globalAlpha = 1;
  }

  private drawPreviewWater(now: number): void {
    const pv = this.preview;
    if (!pv || pv.pocket.size === 0) return;
    const a = 0.72 + 0.12 * Math.sin(now / 160);
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
    const t = `+${fmt(pv.points)}`;
    g.strokeText(t, sx / pv.pocket.size, sy / pv.pocket.size);
    g.fillStyle = this.palette.name === 'night' ? this.palette.waterHi : this.palette.accent;
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

  /** Night: bioluminescent halos under the pebbles and the odd plankton glint in open water. */
  private drawGlow(now: number): void {
    if (this.palette.name !== 'night') return;
    const g = this.g;
    const l = this.layout;
    const size = Math.round(l.cell);
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.42;
    for (let i = 0; i < CELLS; i++) {
      const c = this.board[i]!;
      if (!c || now < this.land[i]!) continue;
      const [x, y] = this.cellCenter(i);
      g.drawImage(this.sprites.glow(c, size), x - size, y - size, size * 2, size * 2);
    }
    if (!this.reducedMotion) {
      // plankton: a few slow glints, positions hashed from time so no state is needed
      const slot = Math.floor(now / 900);
      for (let k = 0; k < 5; k++) {
        const h = Math.imul(slot * 7 + k, 2654435761) >>> 0;
        const i = h % CELLS;
        if (this.board[i]) continue;
        const ph = ((now / 900) % 1) * Math.PI;
        const [x, y] = this.cellCenter(i);
        // a soft glowing mote (a hard dot read as dead pixels)
        const px = x + ((h >> 8) % 11) - 5;
        const py = y + ((h >> 12) % 11) - 5;
        const r = l.cell * 0.16;
        const gr = g.createRadialGradient(px, py, 0, px, py, r);
        gr.addColorStop(0, 'rgba(190,250,255,0.9)');
        gr.addColorStop(0.35, 'rgba(120,230,250,0.35)');
        gr.addColorStop(1, 'rgba(120,230,250,0)');
        g.globalAlpha = 0.65 * Math.sin(ph);
        g.fillStyle = gr;
        g.fillRect(px - r, py - r, r * 2, r * 2);
      }
    }
    g.restore();
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

  /**
   * Peaks (tier ≥ 3): one soft band of warm gold light sweeps diagonally across the board (≈650 ms).
   * It moves (never a flash): the band is ~30% of the board wide and ≤ 0.3 alpha, so the mean board
   * luminance changes by a few % per frame at most (ADR 0012 §8, celebrate.spec).
   */
  private drawSweep(now: number): void {
    const t = (now - this.sweep) / 650;
    if (t < 0 || t >= 1 || this.reducedMotion) return;
    const g = this.g;
    const b = this.layout.board;
    g.save();
    g.beginPath();
    g.roundRect(b.x, b.y, b.w, b.h, b.w * GEOM.boardRadius);
    g.clip();
    const pos = b.x - b.w * 0.6 + b.w * 2.2 * easeInOutSine(t);
    const gr = g.createLinearGradient(pos - b.w * 0.2, b.y, pos + b.w * 0.2, b.y + b.h * 0.25);
    const night = this.palette.name === 'night';
    gr.addColorStop(0, 'rgba(255,214,120,0)');
    gr.addColorStop(0.35, night ? 'rgba(245,196,81,0.10)' : 'rgba(255,222,140,0.16)');
    gr.addColorStop(0.5, night ? 'rgba(255,220,130,0.24)' : 'rgba(255,240,190,0.34)');
    gr.addColorStop(0.65, night ? 'rgba(245,196,81,0.10)' : 'rgba(255,222,140,0.16)');
    gr.addColorStop(1, 'rgba(255,214,120,0)');
    // additive light only on the dark board; on sand it would blow out to white
    g.globalCompositeOperation = night ? 'lighter' : 'source-over';
    g.fillStyle = gr;
    g.fillRect(b.x, b.y, b.w, b.h);
    g.restore();
  }

  private drawRipples(now: number): void {
    const g = this.g;
    if (!this.ripples.length) return;
    const b = this.layout.board;
    g.save();
    g.beginPath();
    g.roundRect(b.x, b.y, b.w, b.h, b.w * GEOM.boardRadius);
    g.clip();
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
    g.restore();
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
        const cell = lerp(l.cell, this.trayCell(p), e);
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
        this.g.strokeStyle = this.palette.accent;
        this.g.lineWidth = 3;
        this.g.beginPath();
        this.g.roundRect(sl.cx - sl.w * 0.42, sl.cy - sl.h * 0.42, sl.w * 0.84, sl.h * 0.84, l.cell * 0.4);
        this.g.stroke();
        y -= l.cell * 0.15;
      }
      this.drawPieceAt(p, slot.t.color, x, y, this.trayCell(p), a * (dimmed ? 0.45 : 1));
    });
  }

  private drawDrag(): void {
    const d = this.drag;
    if (!d) return;
    const slot = this.tray[d.slot];
    if (!slot?.t) return;
    const l = this.layout;
    const p = pieceById(slot.t.pieceId);
    const cell = lerp(this.trayCell(p), l.cell, easeOutCubic(d.grow));
    // magnet: once it has a legal spot, the held piece leans ~20% toward it so snapping feels sticky
    const sn = this.preview && d.grow >= 1 ? this.preview : null;
    const dx0 = sn ? lerp(d.x, l.board.x + sn.ax * l.cell, 0.2) : d.x;
    const dy0 = sn ? lerp(d.y, l.board.y + sn.ay * l.cell, 0.2) : d.y;
    this.lastDragDraw = { x: dx0, y: dy0 };
    // soft lifted shadow
    const g = this.g;
    g.globalAlpha = 0.18;
    g.fillStyle = '#000';
    for (const [dx, dy] of p.cells) {
      g.beginPath();
      g.roundRect(dx0 + dx * cell + cell * 0.12, dy0 + dy * cell + cell * 0.3, cell * 0.8, cell * 0.8, cell * 0.25);
      g.fill();
    }
    g.globalAlpha = 1;
    // cells of the held piece that will pop on release wear the same "lit" outline as the ring
    const pv = this.preview;
    const lit = pv && pv.ring.size ? (dx: number, dy: number) => pv.ring.has((pv.ay + dy) * N + pv.ax + dx) : null;
    const normal = this.sprites.pebble(this.palette, slot.t.color, Math.round(cell));
    const bright = lit ? this.sprites.pebble(this.palette, slot.t.color, Math.round(cell), 'lit') : normal;
    for (const [dx, dy] of p.cells)
      g.drawImage(lit?.(dx, dy) ? bright : normal, dx0 + dx * cell, dy0 + dy * cell, cell, cell);
  }

  /** Where the first-run demo ghost is now (null when it isn't showing). */
  private demoPose(now: number) {
    const h = this.hint;
    const d = h?.demo;
    const t = d ? this.tray[d.slot]?.t : null;
    if (!h || !d || !t || this.drag || this.reducedMotion) return null;
    const k = (now - h.start) / 1000;
    const p = pieceById(t.pieceId);
    const l = this.layout;
    const cyc = (k % 2.2) / 2.2;
    if (cyc > 0.86) return null;
    const travel = easeInOutSine(clamp01((cyc - 0.12) / 0.5));
    const [ox, oy] = this.trayPieceOrigin(d.slot, p);
    const tx = l.board.x + d.ax * l.cell;
    const ty = l.board.y + d.ay * l.cell;
    const cell = lerp(this.trayCell(p), l.cell, travel);
    const x = lerp(ox, tx, travel);
    const y = lerp(oy, ty, travel);
    const fade = cyc < 0.12 ? cyc / 0.12 : cyc > 0.74 ? 1 - (cyc - 0.74) / 0.12 : 1;
    return { p, x, y, cell, fade, travel, color: t.color };
  }

  private drawHint(now: number): void {
    const h = this.hint;
    // out of the way while the player is holding a piece
    if (!h || this.drag) return;
    const g = this.g;
    const k = (now - h.start) / 1000;
    // dashed lagoon-blue outline, pulsing clearly (was a faint 1.1:1 outline)
    const a = this.reducedMotion ? 0.85 : 0.55 + 0.4 * (0.5 + 0.5 * Math.sin(k * Math.PI * 2));
    g.strokeStyle = this.palette.name === 'night' ? this.palette.waterHi : this.palette.accent;
    g.lineWidth = Math.max(2, this.layout.cell * 0.06);
    g.setLineDash([this.layout.cell * 0.14, this.layout.cell * 0.1]);
    g.lineDashOffset = this.reducedMotion ? 0 : -k * this.layout.cell * 0.5;
    g.globalAlpha = a;
    for (const c of h.cells) {
      const [x, y, s] = this.cellRect(c, 0.84);
      g.beginPath();
      g.roundRect(x, y, s, s, s * GEOM.cellRadius);
      g.stroke();
    }
    g.setLineDash([]);
    g.globalAlpha = 1;
    // demo: a ghost of the piece glides from the tray to the spot, with a fingertip
    const pose = this.demoPose(now);
    if (!pose) return;
    const { p, x, y, cell, fade, travel, color } = pose;
    const l = this.layout;
    this.drawPieceAt(p, color, x, y, cell, 0.5 * fade);
    // a pointing hand (the Tidemark "tap" glyph), its fingertip on the first cell, as if holding it
    const [fx, fy] = p.cells[0]!;
    drawTap(
      g,
      x + (fx + 0.5) * cell,
      y + (fy + 0.5) * cell + l.lift * travel * 0.9,
      l.cell * 1.15,
      this.palette.surface,
      this.palette.text,
      0.92 * fade,
    );
    g.globalAlpha = 1;
  }

  /** Ballistic little fish leaping out of a lagoon (visual only). */
  /** Two water rings where a creature dove back in (outside the board clip, so beside it too). */
  private drawSplashes(now: number): void {
    if (!this.splashes.length) return;
    const g = this.g;
    const p = this.palette;
    this.splashes = this.splashes.filter((sp) => now - sp.start < 620);
    g.save();
    g.lineWidth = 2;
    for (const sp of this.splashes) {
      const k = (now - sp.start) / 620;
      for (const [d, w] of [
        [0, 1],
        [0.18, 0.7],
      ] as const) {
        const u = Math.max(0, (k - d) / (1 - d));
        if (u <= 0) continue;
        g.globalAlpha = (1 - u) * 0.9 * w;
        g.strokeStyle = p.water;
        g.beginPath();
        g.ellipse(sp.x, sp.y, sp.r * (0.4 + u * 1.3), sp.r * (0.16 + u * 0.5), 0, 0, Math.PI * 2);
        g.stroke();
      }
      // a crown of water drops thrown up by the dive (deterministic angles; gravity pulls them back)
      if (k < 0.7) {
        const kk = k / 0.7;
        g.fillStyle = p.water;
        g.globalAlpha = 1 - kk;
        for (let i = 0; i < 7; i++) {
          const a = -Math.PI / 2 + (i - 3) * 0.38;
          const v = sp.r * (2.4 + (i % 3) * 0.5);
          const dx = Math.cos(a) * v * kk;
          const dy = Math.sin(a) * v * kk + sp.r * 5.5 * kk * kk;
          g.beginPath();
          g.arc(sp.x + dx, sp.y + dy, Math.max(1.5, sp.r * 0.13 * (1 - kk * 0.5)), 0, Math.PI * 2);
          g.fill();
        }
      }
    }
    g.restore();
  }

  private drawFish(now: number): void {
    const g = this.g;
    for (const f of this.fish) {
      const t = (now - f.start) / 1000;
      if (t < 0 || t > FISH_LIFE) continue;
      // one ballistic arc out of the lagoon and a dive back into the water beside the board
      // (fx.leap solves vx/vy so the arc lands at (tx, ty) after `flight` seconds), then a splash
      const grav = this.layout.cell * FISH_GRAVITY;
      const T = f.flight ?? FISH_FLIGHT;
      const tt = Math.min(t, T);
      const x = f.x + f.vx * tt;
      const y = f.y + f.vy * tt + 0.5 * grav * tt * tt;
      const ang = Math.atan2(f.vy + grav * tt, f.vx);
      // entering the water: shrink and fade over the last 0.12 s of the arc, gone at touchdown
      const dive = Math.max(0, (t - (T - 0.12)) / 0.12);
      const scale = 1 - 0.45 * Math.min(1, dive);
      const fade = t >= T ? 0 : 1 - 0.6 * Math.min(1, dive);
      if (t >= T && !f.arrived) {
        f.arrived = true;
        this.splashes.push({ x, y, start: now, r: f.size * (f.isNew ? 1.5 : 1.15) });
        this.particles.burst(
          f.isNew ? 6 : 3,
          x,
          y,
          Kind.Foam,
          0,
          this.layout.cell * 1.4,
          f.size * 0.26,
          520,
          this.rand,
        );
        this.onSplash?.(!!f.isNew);
        if (f.isNew) this.onCollect?.(); // a brand-new species: the journal button glows once
      }
      if (fade <= 0) continue;
      const T1 = T * 0.5; // the rising half of the arc (catch pose / surprised face)
      if (f.chip) {
        // a small gold coin with "+N"
        const r = f.size * 0.62 * Math.max(0.5, scale);
        g.save();
        g.globalAlpha = fade;
        g.fillStyle = '#F2C14E';
        g.strokeStyle = '#B9821F';
        g.lineWidth = 2;
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        g.fillStyle = '#4A3300';
        // fixed font size scaled by transform (a per-frame size re-rasterises the glyphs: 13 ms
        // of cold frames in the biggest moment at 4× throttle)
        const r0 = Math.max(6, Math.round(f.size * 0.62));
        g.font = `900 ${r0}px ${FONT_STACK}`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.translate(x, y + 1);
        g.scale(r / r0, r / r0);
        g.fillText(`+${f.chip}`, 0, 0);
        g.restore();
        continue;
      }
      const sp = f.species ? SPECIES_BY_ID.get(f.species) : undefined;
      if (sp) {
        if (f.isNew) {
          g.globalAlpha = 0.6 * fade;
          g.strokeStyle = '#FFD24A';
          g.lineWidth = 3;
          g.beginPath();
          g.arc(x, y, f.size * 0.8 * scale + Math.sin(t * 18) * 2, 0, Math.PI * 2);
          g.stroke();
        }
        g.globalAlpha = fade;
        const facing = Math.cos(ang) < 0;
        // ADR 0011: size-class leap scale, faces its travel, catch hook while leaping, happy (surprised when new)
        drawCreature(g, sp, x, y, f.size * 1.6 * scale, facing ? ang - Math.PI : ang, {
          golden: f.golden,
          fit: 'leap',
          flip: facing,
          night: this.palette.name === 'night',
          t,
          expression: f.isNew && t < T1 ? 'surprised' : 'happy',
          action: t < T1 && !f.isNew ? { kind: 'catch', u: t / T1 } : undefined,
        });
        g.globalAlpha = 1;
        continue;
      }
      g.save();
      g.translate(x, y);
      g.rotate(ang);
      g.globalAlpha = fade;
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
      const rise = easeOutCubic(k) * this.layout.cell * (t.rise ?? (t.strong ? 0.25 : 0.7));
      const pop = t.strong && !this.reducedMotion ? (k < 0.18 ? easeOutBack(k / 0.18, 2.5) : 1) : 1;
      g.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      g.font = `800 ${Math.round(t.size * pop * this.textScale)}px ${FONT}`;
      g.lineWidth = Math.max(3, t.size * 0.16);
      const night = this.palette.name === 'night';
      g.lineJoin = 'round';
      // callouts and points share one look: deep lagoon ink with a light halo (day), glow ink (night)
      const ink = t.strong || t.accent;
      g.strokeStyle = ink
        ? night
          ? 'rgba(0,20,30,0.8)'
          : 'rgba(255,255,255,0.95)'
        : night
          ? 'rgba(0,0,0,0.55)'
          : 'rgba(59,50,41,0.6)';
      g.strokeText(t.text, t.x, t.y - rise);
      g.fillStyle = ink ? (night ? this.palette.waterHi : this.palette.accent) : '#FFFFFF';
      g.fillText(t.text, t.x, t.y - rise);
    }
    g.globalAlpha = 1;
  }

  /** Caps label with real tracking where canvas supports it (Baseline 2025), else plain. */
  private label(text: string, x: number, y: number, px: number, color: string, maxW?: number): void {
    const g = this.g as CanvasRenderingContext2D & { letterSpacing?: string };
    g.font = `800 ${px}px ${FONT}`;
    g.fillStyle = color;
    const hasLs = 'letterSpacing' in g;
    if (hasLs) g.letterSpacing = `${(px * 0.08).toFixed(2)}px`;
    // tracking adds space after the last glyph too: nudge so the label stays centered
    g.fillText(text, x + (hasLs ? (px * 0.08) / 2 : 0), y, maxW);
    if (hasLs) g.letterSpacing = '0px';
  }

  /** "Daily" in the HUD's best line (replaces the old floating cyan mode tag). */
  modeTag = '';

  private drawHud(now: number): void {
    const g = this.g;
    const l = this.layout;
    const p = this.palette;
    const cx = l.w / 2;
    const night = p.name === 'night';
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    // score.hud: Nunito 900, 52 px on a 390-pt phone (tabular digits: the count-up never jitters);
    // the stack is laid out bottom-up so Larger text never runs the best line into the badge
    const hs = hudStack(l, this.textScale);
    const { big, lab } = hs;
    const room = l.w - 2 * 70; // clear of the 44 px corner buttons
    if (this.hudLabel) {
      const hl = this.hudLabel;
      // "Reef 28" in the display face, the tier (and the reef's mark) as a quiet chip under it
      const title = Math.round(Math.min(34 * hs.k, big * 0.7));
      g.font = `900 ${title}px ${DISPLAY_FONT}`;
      g.fillStyle = p.text;
      g.fillText(hl.big, cx, hs.scoreY - big * 0.06, room);
      if (hl.sub) {
        const dotC: Record<string, string> = { calm: p.success, tricky: p.water, deep: '#3D6FD0', abyss: '#7A55B0' };
        const fs = Math.round(Math.min(13 * hs.k, big * 0.27) * Math.min(1.2, this.textScale));
        g.font = `800 ${fs}px ${FONT}`;
        const tw = Math.min(room, g.measureText(hl.sub).width);
        const pw = tw + fs * 2.6;
        const ph = Math.round(fs * 2.1);
        const py = Math.min(hs.scoreY + fs * 1.9, l.board.y - fs * 1.3);
        g.fillStyle = p.name === 'night' ? '#1B3150' : p.surfaceSunk; // raised at night (sunk vanished)
        g.beginPath();
        g.roundRect(cx - pw / 2, py - ph / 2, pw, ph, ph / 2);
        g.fill();
        g.fillStyle = dotC[hl.tier ?? ''] ?? p.accent;
        g.beginPath();
        g.arc(cx - pw / 2 + fs * 1.05, py, fs * 0.3, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = p.textDim;
        g.textBaseline = 'middle';
        g.fillText(hl.sub, cx + fs * 0.45, py + 1, room);
        g.textBaseline = 'alphabetic';
      }
      // Reefs have no score: no COMBO badge either
      this.celebrate.drawHud(g, now, l, p, this.reducedMotion, this.textScale, true, hs.badgeY);
      return;
    }
    g.fillStyle = p.text;
    // big moments punch the score as their points land (tier ≥ 2 only; calm moves don't)
    const pk = (now - this.scorePunch.at) / 360;
    const punch = pk >= 0 && pk < 1 && !this.reducedMotion ? 1 + this.scorePunch.amp * (1 - spring01(pk)) : 1;
    // a peak's points land in gold for a beat
    if (this.scorePunch.gold && pk >= 0 && pk < 1.6) g.fillStyle = night ? p.gold : p.goldInk;
    const base = hs.scoreY;
    // one font size, scaled by transform: a per-frame font size re-rasterises every glyph (perf)
    g.font = `900 ${Math.round(big)}px ${FONT}`;
    const ls = g as CanvasRenderingContext2D & { letterSpacing?: string };
    if ('letterSpacing' in ls) ls.letterSpacing = `${(-big * 0.02).toFixed(2)}px`;
    const sy = base + (punch - 1) * big * 0.3;
    if (punch !== 1) {
      g.save();
      g.translate(cx, sy);
      g.scale(punch, punch);
      g.fillText(fmt(this.shownScore), 0, 0);
      g.restore();
    } else g.fillText(fmt(this.shownScore), cx, sy);
    if ('letterSpacing' in ls) ls.letterSpacing = '0px';
    // best second, as on the results card; hidden until there is one (first run)
    const beat = (this.score > this.best && this.best > 0) || this.celebrate.bestShown;
    const tag = this.modeTag ? `${this.modeTag} · ` : '';
    const text = beat ? `${tag}NEW BEST` : this.best > 0 ? `${tag}BEST ${fmt(this.best)}` : this.modeTag;
    if (text) this.label(text.toUpperCase(), cx, hs.bestY, lab, beat ? (night ? p.gold : p.goldInk) : p.textDim, room);
    // chips live in the strip: the COMBO badge always keeps its slot under the score
    this.celebrate.drawHud(g, now, l, p, this.reducedMotion, this.textScale, false, hs.badgeY);
  }

  private gc(now: number): void {
    this.burst.gc(now);
    this.lagoons = this.lagoons.filter((x) => now - x.start < MOTION.lagoonFill * 4);
    this.ripples = this.ripples.filter((x) => now - x.start < 700);
    this.texts = this.texts.filter((x) => now - x.start < x.life);
    this.placing = this.placing.filter((x) => now - x.start < MOTION.place);
    this.fish = this.fish.filter((x) => now - x.start < FISH_LIFE * 1000);
  }

  /** True when something is animating (lets the loop idle to save battery). */
  busy(now: number): boolean {
    return (
      this.drag !== null ||
      this.preview !== null ||
      this.particles.count > 0 ||
      this.burst.active(now) ||
      this.celebrate.busy(now, !this.reducedMotion && !this.covered) ||
      this.lagoons.length > 0 ||
      this.ripples.length > 0 ||
      this.texts.length > 0 ||
      this.chips.length > 0 ||
      this.placing.length > 0 ||
      this.fish.length > 0 ||
      this.hint !== null ||
      this.selected !== null ||
      (this.palette.name === 'night' && !this.reducedMotion) ||
      Math.abs(this.score - this.shownScore) > 0.5 ||
      now - this.shake.start < MOTION.shake ||
      this.tray.some((s) => now - s.dealStart < MOTION.dealIn || s.back !== null) ||
      this.land.some((t) => now - t < MOTION.place * 1.6) ||
      now - this.streakPulse < 300 ||
      now - this.sweep < 650 ||
      now - this.scorePunch.at < 580 ||
      now - this.scoreRoll.at < this.scoreRoll.ms ||
      (this.gameOverAt >= 0 && now - this.gameOverAt < 600)
    );
  }
}
