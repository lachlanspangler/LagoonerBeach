/**
 * Celebration layer (ADR 0012): the praise word, the +N, the COMBO ×N badge with its grace
 * shells, the mid-game NEW BEST banner and the Spotless tide wash.
 *
 * Text is 3-layer display type (UI_DESIGN §7.1): soft shadow, dark round outline, vertical gradient
 * fill. Words in DISPLAY_FONT (Fraunces), digits/×/+ always in FONT (Nunito, tabular). Each string is
 * rendered once to an offscreen canvas and then drawn as one image (cheap per frame).
 *
 * Slots (never more than one of each): one word + one number on the board, one badge in the HUD.
 * All motion is a closed-form function of time (springs included), so frozen clocks are exact.
 */
import type { Layout } from './layout.ts';
import { comboLevel, comboStyle, LIMITS, type ComboLevel, type Tier, type WordStyle } from './moments.ts';
import { clamp01, easeInCubic, easeInOutSine, easeOutCubic, lerp } from './tween.ts';
import { DISPLAY_STACK as FONT_DISPLAY, FONT_STACK as FONT_UI, type Palette } from './theme.ts';
import { STREAK_GRACE } from '../core/scoring.ts';
import { drawShell } from '../ui/icons.ts';

/**
 * 'flat': clean Nunito heavy caps in one ink (the COMBO badge below ×10: outlined display type at
 * ~14 px reads muddy on Day). Same ink as the HUD accent in each theme.
 */
export type TextStyle = WordStyle | 'points' | 'flat';
const FLAT_INK = { day: '#16588A', night: '#6FD3EC' } as const;

const FILL: Record<Exclude<TextStyle, 'flat'>, readonly [string, string, string]> = {
  warm: ['#FFE08A', '#F2B93B', '#F2795B'],
  water: ['#E8FCFF', '#6FD3EC', '#2B8FC0'],
  gold: ['#FFF4C2', '#F2C14E', '#B9821F'],
  points: ['#F2FDFF', '#8EE3F5', '#3BA9D6'],
};

/**
 * Underdamped spring step response 0 → 1, closed form. `overshoot` is the peak above 1 (0.08 =
 * peaks at 1.08); `ms` is roughly the time to settle. Deterministic for any t.
 */
export function spring(tMs: number, ms: number, overshoot: number): number {
  if (tMs <= 0) return 0;
  const os = Math.max(1e-4, Math.min(0.5, overshoot));
  const lnO = Math.log(os);
  const zeta = -lnO / Math.sqrt(Math.PI * Math.PI + lnO * lnO);
  // settle (2%) ≈ 4 / (ζ ω)
  const w = 4 / (zeta * (ms / 1000));
  const wd = w * Math.sqrt(1 - zeta * zeta);
  const t = tMs / 1000;
  const e = Math.exp(-zeta * w * t);
  return 1 - e * (Math.cos(wd * t) + ((zeta * w) / wd) * Math.sin(wd * t));
}

interface Sprite {
  c: HTMLCanvasElement | OffscreenCanvas | ImageBitmap;
  w: number;
  h: number;
}

/** Split into runs: digits, ×, + and separators use the UI font (numbers are always Nunito). */
function runs(text: string): { t: string; num: boolean }[] {
  const out: { t: string; num: boolean }[] = [];
  for (const part of text.split(/([0-9×+,.]+)/)) if (part) out.push({ t: part, num: /^[0-9×+,.]+$/.test(part) });
  return out;
}

export class TextSprites {
  private cache = new Map<string, Sprite>();
  constructor(public dpr = 1) {}

  clear(): void {
    this.cache.clear();
  }

  /** Text height `px` (CSS px), style, theme. Weight 900 by default. */
  get(text: string, px: number, style: TextStyle, night: boolean, weight = 900): Sprite {
    const size = Math.max(8, Math.round(px));
    const key = `${text}|${size}|${style}|${night ? 1 : 0}|${weight}|${this.dpr}`;
    let s = this.cache.get(key);
    if (s) {
      // keep recently used entries (LRU by re-insertion)
      this.cache.delete(key);
      this.cache.set(key, s);
      return s;
    }
    s = this.render(text, size, style, night, weight);
    this.cache.set(key, s);
    if (this.cache.size > 96) this.cache.delete(this.cache.keys().next().value!);
    return s;
  }

  private render(text: string, size: number, style: TextStyle, night: boolean, weight: number): Sprite {
    if (style === 'flat') return this.renderFlat(text, size, night);
    const parts = runs(text);
    const fontOf = (num: boolean) =>
      num ? `900 ${Math.round(size * 0.94)}px ${FONT_UI}` : `${weight} ${size}px ${FONT_DISPLAY}`;
    const probe = mk(4, 4);
    const pg = probe.getContext('2d') as CanvasRenderingContext2D;
    let w = 0;
    const widths = parts.map((p) => {
      pg.font = fontOf(p.num);
      const m = pg.measureText(p.t).width;
      w += m;
      return m;
    });
    const stroke = size * 0.16;
    const pad = Math.ceil(stroke + size * 0.12);
    const W = Math.ceil(w + pad * 2);
    const H = Math.ceil(size * 1.3 + pad * 2);
    const c = mk(Math.ceil(W * this.dpr), Math.ceil(H * this.dpr));
    const g = c.getContext('2d') as CanvasRenderingContext2D;
    g.scale(this.dpr, this.dpr);
    g.textBaseline = 'middle';
    g.textAlign = 'left';
    g.lineJoin = 'round';
    const cy = H / 2 + size * 0.04;
    const pass = (fn: (x: number, p: { t: string; num: boolean }) => void) => {
      let x = pad;
      parts.forEach((p, i) => {
        g.font = fontOf(p.num);
        fn(x, p);
        x += widths[i]!;
      });
    };
    // 1 shadow
    g.fillStyle = night ? 'rgba(0,0,0,0.5)' : 'rgba(43,35,28,0.25)';
    g.strokeStyle = g.fillStyle;
    g.lineWidth = stroke;
    pass((x, p) => {
      g.strokeText(p.t, x, cy + size * 0.07);
      g.fillText(p.t, x, cy + size * 0.07);
    });
    // 2 dark outline (centered stroke: half shows outside the glyph)
    g.strokeStyle = night ? '#04212D' : '#2B231C';
    g.lineWidth = stroke;
    pass((x, p) => g.strokeText(p.t, x, cy));
    // 3 vertical gradient fill
    const [a, b, d] = FILL[style];
    const gr = g.createLinearGradient(0, cy - size * 0.5, 0, cy + size * 0.5);
    gr.addColorStop(0, a);
    gr.addColorStop(0.5, b);
    gr.addColorStop(1, d);
    g.fillStyle = gr;
    pass((x, p) => g.fillText(p.t, x, cy));
    // 4 thin top highlight on big display text
    if (size >= 34) {
      g.save();
      g.beginPath();
      g.rect(0, 0, W, cy - size * 0.1);
      g.clip();
      g.strokeStyle = 'rgba(255,255,255,0.55)';
      g.lineWidth = Math.max(1, size * 0.03);
      pass((x, p) => g.strokeText(p.t, x, cy));
      g.restore();
    }
    // an ImageBitmap draws without a first-use snapshot of the canvas (that cost ~19 ms once, on
    // the jackpot frame, at 4× throttle)
    const bmp = 'transferToImageBitmap' in c ? (c as OffscreenCanvas).transferToImageBitmap() : c;
    return { c: bmp, w: W, h: H };
  }

  /** One-ink Nunito heavy caps with a little tracking (no outline, no gradient). */
  private renderFlat(text: string, size: number, night: boolean): Sprite {
    const font = `900 ${size}px ${FONT_UI}`;
    const track = size * 0.06;
    const probe = mk(4, 4).getContext('2d') as CanvasRenderingContext2D;
    probe.font = font;
    const chars = [...text];
    const widths = chars.map((ch) => probe.measureText(ch).width);
    const w = widths.reduce((a, b) => a + b, 0) + track * (chars.length - 1);
    const pad = 2;
    const W = Math.ceil(w + pad * 2);
    const H = Math.ceil(size * 1.25 + pad * 2);
    const c = mk(Math.ceil(W * this.dpr), Math.ceil(H * this.dpr));
    const g = c.getContext('2d') as CanvasRenderingContext2D;
    g.scale(this.dpr, this.dpr);
    g.font = font;
    g.textBaseline = 'middle';
    g.fillStyle = night ? FLAT_INK.night : FLAT_INK.day;
    let x = pad;
    chars.forEach((ch, i) => {
      g.fillText(ch, x, H / 2 + size * 0.04);
      x += widths[i]! + track;
    });
    const bmp = 'transferToImageBitmap' in c ? (c as OffscreenCanvas).transferToImageBitmap() : c;
    return { c: bmp, w: W, h: H };
  }
}

function mk(w: number, h: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(Math.max(1, w), Math.max(1, h));
  const c = document.createElement('canvas');
  c.width = Math.max(1, w);
  c.height = Math.max(1, h);
  return c;
}

// ------------------------------------------------------------------------------------ state

interface WordShow {
  text: string;
  style: WordStyle;
  tier: Tier;
  x: number;
  y: number;
  /** Text height in px. */
  size: number;
  start: number;
  life: number;
  /** Hurried out (the player picked up the next piece): a fast fade from here. */
  fadeAt?: number;
}
interface NumShow {
  text: string;
  x: number;
  y: number;
  size: number;
  start: number;
  life: number;
  /** Default 'points' (the +N); a subtitle line can use a word style. */
  style?: TextStyle;
  fadeAt?: number;
}

/** How fast a hurried word/number leaves (ms). */
export const HURRY_MS = 120;

/**
 * Peak words (tier 3–4) land with ONE overshoot pop instead of a spring: up past full size, then
 * settle, no wobble. Returns the scale factor at k ms (from → peak at 150 ms → 1 at 360 ms).
 */
export function peakPop(k: number, from: number, peak: number): number {
  if (k <= 0) return from;
  if (k < 150) return lerp(from, peak, easeOutCubic(k / 150));
  if (k < 360) return lerp(peak, 1, easeInOutSine((k - 150) / 210));
  return 1;
}
/** The pop's peak by tier (Unbelievable/Amazing pop harder than Atoll). */
export const PEAK_POP = [1, 1, 1, 1.14, 1.2];

/** Word size by tier, as a share of a board cell. */
export const WORD_SIZE = [0, 0.56, 0.72, 1.05, 1.25];
/** How far below the word's starting scale the spring begins, per tier. */
const WORD_FROM = [1, 0.7, 0.6, 0.45, 0.3];
const WORD_OVERSHOOT = [0, 0.04, 0.06, 0.08, 0.08];
/** Lifetime of a word by tier (ms); clamped by the caller to the 1.3 s settle budget. */
export const WORD_LIFE = [650, 700, 850, 950, 1050];

export interface StackPlace {
  x: number;
  /** Center of the word line; the number sits under it. */
  y: number;
}

/**
 * Where a word + number go for a lagoon: above its bounding box (never on the water), else below,
 * else the roomier side, clamped inside the board.
 */
export function placeStack(
  l: Layout,
  cells: readonly number[],
  wordH: number,
  numH: number,
  wordW: number,
  /** A word (not a pinch's lone +N): sit half a cell higher when there's room. */
  lifted = false,
): StackPlace {
  let x0 = 9;
  let x1 = -1;
  let y0 = 9;
  let y1 = -1;
  for (const c of cells) {
    const x = c % 8;
    const y = (c - x) / 8;
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  const b = l.board;
  const top = b.y + y0 * l.cell;
  const bot = b.y + (y1 + 1) * l.cell;
  const H = wordH + numH;
  const gap = l.cell * 0.12;
  const minY = b.y - l.cell * 0.1;
  const maxY = b.y + b.h + l.cell * 0.15;
  let stackTop: number;
  // half a cell higher when there's room: the ring's top row (still bursting) stays readable
  const lift = lifted ? l.cell * 0.5 : 0;
  if (top - gap - lift - H >= minY) stackTop = top - gap - lift - H;
  else if (top - gap - H >= minY) stackTop = top - gap - H;
  else if (bot + gap + H <= maxY) stackTop = bot + gap;
  else stackTop = top - minY > maxY - bot ? minY : maxY - H;
  const cx = b.x + ((x0 + x1 + 1) / 2) * l.cell;
  const half = Math.min(wordW, b.w) / 2;
  return { x: Math.max(b.x + half, Math.min(b.x + b.w - half, cx)), y: stackTop + wordH / 2 };
}

export class Celebrate {
  readonly sprites = new TextSprites(1);
  word: WordShow | null = null;
  num: NumShow | null = null;
  /** COMBO badge state. */
  combo = { n: 0, dry: 0, bumpAt: -1e9, prevN: 0, levelAt: -1e9, breakAt: -1e9, brokeN: 0, dryAt: -1e9 };
  /** Mid-game NEW BEST banner start (once per game), and whether the HUD now says NEW BEST. */
  bestAt = -1e9;
  bestShown = false;
  /** Full-board tide wash. */
  washAt = -1e9;

  reset(streak: number, dry: number): void {
    this.word = null;
    this.num = null;
    this.combo = { n: streak, dry, bumpAt: -1e9, prevN: streak, levelAt: -1e9, breakAt: -1e9, brokeN: 0, dryAt: -1e9 };
    this.bestAt = -1e9;
    this.bestShown = false;
    this.washAt = -1e9;
  }

  /** Size of a rendered word sprite (CSS px), e.g. to place it before showing it. */
  measure(text: string, px: number, style: TextStyle, night: boolean): { w: number; h: number } {
    const s = this.sprites.get(text, px, style, night);
    return { w: s.w, h: s.h };
  }

  /**
   * Render the sprites a coming moment will need while the browser is idle (between release and
   * the word landing), so the jackpot frame doesn't pay for 3-pass text rendering.
   */
  prewarm(items: readonly (readonly [string, number, TextStyle, number?])[], night: boolean): void {
    // one sprite per task, starting right after the current frame: an idle callback can arrive after
    // the word has already landed under load (the cold jackpot frame then paid 10–20 ms)
    items.forEach(([t, px, st, w], i) => setTimeout(() => this.sprites.get(t, px, st, night, w ?? 900), i * 4));
  }

  /** The COMBO badge's text sizes for a combo of n (for prewarm). */
  comboSprites(n: number, l: Layout, ts: number): [string, number, TextStyle, number][] {
    const b = badgeType(n, l, ts);
    return [
      ['COMBO', b.labelPx, b.style, b.weight],
      [`×${n}`, b.numPx, b.style, 900],
    ];
  }

  showWord(w: Omit<WordShow, 'size'> & { size?: number }, l: Layout, textScale: number): void {
    this.word = { ...w, size: (w.size ?? WORD_SIZE[w.tier]! * l.cell) * textScale };
  }

  showNumber(n: NumShow): void {
    this.num = n;
  }

  /**
   * Fast play: the player picked up the next piece (or committed the next move) → the previous
   * word and number leave quickly instead of stacking over a board they no longer describe.
   */
  hurry(now: number): void {
    for (const s of [this.word, this.num]) if (s && now >= s.start && s.fadeAt === undefined) s.fadeAt = now;
    // shown but not started yet: drop it
    if (this.word && now < this.word.start) this.word = null;
    if (this.num && now < this.num.start) this.num = null;
  }

  /** Combo went up at `t` (the number ticks with a punch; level-ups flare). */
  comboUp(n: number, t: number): void {
    const c = this.combo;
    if (comboLevel(n) > comboLevel(c.n) && n >= 5) c.levelAt = t;
    c.prevN = c.n;
    c.n = n;
    c.dry = 0;
    c.bumpAt = t;
  }

  comboDry(dry: number, t: number): void {
    this.combo.dry = dry;
    this.combo.dryAt = t;
  }

  /** Gentle deflate (no red, no text): the badge sinks and fades. */
  comboBreak(t: number): void {
    const c = this.combo;
    if (c.n >= 2) {
      c.brokeN = c.n;
      c.breakAt = t;
    }
    c.prevN = c.n;
    c.n = 0;
    c.dry = 0;
  }

  /**
   * Something on the board is animating. `ambient` = the breathing last grace shell may keep the
   * loop running (it only moves with motion on and the board in view: never under reduced motion
   * or behind an open sheet, which would redraw at 60 fps for nothing).
   */
  busy(now: number, ambient = true): boolean {
    const c = this.combo;
    return (
      (this.word !== null && now < this.word.start + this.word.life) ||
      (this.num !== null && now < this.num.start + this.num.life) ||
      now - c.bumpAt < 600 ||
      now - c.levelAt < 900 ||
      now - c.breakAt < 450 ||
      now - c.dryAt < 400 ||
      now - this.bestAt < BEST_LIFE ||
      now - this.washAt < WASH_MS ||
      (ambient && c.n >= 2 && c.dry === STREAK_GRACE - 1)
    );
  }

  // -------------------------------------------------------------------------------- drawing

  /** Board-level: the wash (under), then the word and the number. */
  drawBoard(g: CanvasRenderingContext2D, now: number, l: Layout, p: Palette, rm: boolean): void {
    this.drawWash(g, now, l, p, rm);
    const night = p.name === 'night';
    const w = this.word;
    if (w) {
      const k = now - w.start;
      const hurried = w.fadeAt !== undefined ? clamp01((now - w.fadeAt) / HURRY_MS) : 0;
      if (k >= w.life || hurried >= 1) this.word = null;
      else if (k >= 0) {
        const spr = this.sprites.get(w.text, w.size, w.style, night);
        const out = Math.max(hurried, clamp01((k - (w.life - 220)) / 220));
        let scale = 1;
        let rot = 0;
        let rise = 0;
        let alpha = rm ? Math.min(1, k / 120) : Math.min(1, k / 70);
        if (!rm) {
          if (w.tier >= 3) {
            // one overshoot pop, and a small settle of the tilt
            scale = peakPop(k, WORD_FROM[w.tier]!, PEAK_POP[w.tier]!) * (1 + 0.04 * easeOutCubic(out));
            rot = ((1 - clamp01(k / 360)) * -4 * Math.PI) / 180;
          } else {
            const s = spring(k, 340, WORD_OVERSHOOT[w.tier]!);
            scale = lerp(WORD_FROM[w.tier]!, 1, s) * (1 + 0.04 * easeOutCubic(out));
          }
          rise = easeInCubic(out) * l.cell * 0.25;
        }
        alpha *= 1 - out;
        // never wider than the board
        const fit = Math.min(1, (l.board.w * 0.94) / (spr.w * 1));
        // tier 4: a soft warm glow pools behind the word (fades in, never a flash)
        if (w.tier >= 4) {
          const ga = 0.5 * Math.min(1, k / 220) * alpha;
          const rx = Math.min(l.board.w * 0.5, spr.w * fit * 0.62);
          const gr = g.createRadialGradient(w.x, w.y - rise, 0, w.x, w.y - rise, rx);
          gr.addColorStop(0, night ? 'rgba(245,196,81,0.55)' : 'rgba(255,236,170,0.9)');
          gr.addColorStop(1, 'rgba(255,236,170,0)');
          g.globalAlpha = ga;
          g.fillStyle = gr;
          g.save();
          g.translate(w.x, w.y - rise);
          g.scale(1, 0.42);
          g.translate(-w.x, -(w.y - rise));
          g.beginPath();
          g.arc(w.x, w.y - rise, rx, 0, Math.PI * 2);
          g.fill();
          g.restore();
          g.globalAlpha = 1;
        }
        this.blit(g, spr, w.x, w.y - rise, scale * fit, rot, alpha);
      }
    }
    const n = this.num;
    if (n) {
      const k = now - n.start;
      const hurried = n.fadeAt !== undefined ? clamp01((now - n.fadeAt) / HURRY_MS) : 0;
      if (k >= n.life || hurried >= 1) this.num = null;
      else if (k >= 0) {
        const spr = this.sprites.get(n.text, n.size, n.style ?? 'points', night);
        const out = Math.max(hurried, clamp01((k - (n.life - 200)) / 200));
        const s = rm ? 1 : lerp(0.7, 1, spring(k, 260, 0.06));
        const rise = rm ? 0 : easeOutCubic(k / n.life) * l.cell * 0.3;
        this.blit(g, spr, n.x, n.y - rise, s, 0, Math.min(1, k / 60) * (1 - out));
      }
    }
  }

  private blit(
    g: CanvasRenderingContext2D,
    spr: Sprite,
    x: number,
    y: number,
    scale: number,
    rot: number,
    alpha: number,
  ): void {
    if (alpha <= 0.004) return;
    g.globalAlpha = alpha;
    if (rot === 0) g.drawImage(spr.c, x - (spr.w * scale) / 2, y - (spr.h * scale) / 2, spr.w * scale, spr.h * scale);
    else {
      g.save();
      g.translate(x, y);
      g.rotate(rot);
      g.drawImage(spr.c, (-spr.w * scale) / 2, (-spr.h * scale) / 2, spr.w * scale, spr.h * scale);
      g.restore();
    }
    g.globalAlpha = 1;
  }

  /** Tide wash: one band of water rolls across the whole board, foam on its leading edge. */
  private drawWash(g: CanvasRenderingContext2D, now: number, l: Layout, p: Palette, rm: boolean): void {
    const k = (now - this.washAt) / WASH_MS;
    if (k < 0 || k >= 1) return;
    const b = l.board;
    g.save();
    g.beginPath();
    g.roundRect(b.x, b.y, b.w, b.h, b.w * 0.05);
    g.clip();
    const night = p.name === 'night';
    if (rm) {
      // a plain crossfade (no motion)
      g.globalAlpha = 0.16 * Math.sin(Math.PI * k);
      g.fillStyle = p.water;
      g.fillRect(b.x, b.y, b.w, b.h);
      g.restore();
      g.globalAlpha = 1;
      return;
    }
    const e = easeInOutSine(k);
    const front = b.x - b.w * 0.35 + b.w * 1.7 * e;
    const band = b.w * 0.55;
    const gr = g.createLinearGradient(front - band, 0, front, 0);
    gr.addColorStop(0, 'rgba(92,200,224,0)');
    gr.addColorStop(0.7, night ? 'rgba(47,184,216,0.26)' : 'rgba(92,200,224,0.30)');
    gr.addColorStop(1, night ? 'rgba(155,240,255,0.34)' : 'rgba(191,241,250,0.42)');
    g.fillStyle = gr;
    // a gently wavy leading edge
    g.beginPath();
    g.moveTo(front - band, b.y);
    const steps = 8;
    for (let i = 0; i <= steps; i++) {
      const y = b.y + (b.h * i) / steps;
      g.lineTo(front + Math.sin(i * 1.3 + k * 9) * l.cell * 0.18, y);
    }
    g.lineTo(front - band, b.y + b.h);
    g.closePath();
    g.fill();
    // foam line
    g.strokeStyle = p.foam;
    g.globalAlpha = 0.55 * (1 - k * 0.6);
    g.lineWidth = Math.max(2, l.cell * 0.07);
    g.beginPath();
    for (let i = 0; i <= steps; i++) {
      const y = b.y + (b.h * i) / steps;
      const x = front + Math.sin(i * 1.3 + k * 9) * l.cell * 0.18;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
    g.restore();
    g.globalAlpha = 1;
  }

  /**
   * HUD-level: COMBO ×N badge with grace shells, or the NEW BEST banner while it's up. The slot is
   * the badge's alone (chips moved to the strip between board and tray); `hide` stays for callers
   * that need the slot empty.
   */
  drawHud(
    g: CanvasRenderingContext2D,
    now: number,
    l: Layout,
    p: Palette,
    rm: boolean,
    ts: number,
    hide: boolean,
    badgeY?: number,
  ): void {
    const cy = badgeY ?? l.hud.y + l.hud.h * 0.9;
    const night = p.name === 'night';
    const bk = (now - this.bestAt) / BEST_LIFE;
    const bannerUp = bk >= 0 && bk < 1;
    if (bannerUp) this.drawBest(g, now, bk, l, cy, night, rm, ts);
    if (hide) return;
    const c = this.combo;
    // the badge steps aside while the banner owns the slot
    const bannerFade = bannerUp ? (bk < 0.08 ? 1 - bk / 0.08 : bk > 0.9 ? (bk - 0.9) / 0.1 : 0) : 1;
    // deflate after a break
    const dk = (now - c.breakAt) / 420;
    let n = c.n;
    let alpha = bannerFade;
    let scale = 1;
    let drop = 0;
    if (c.n < 2) {
      if (dk >= 0 && dk < 1 && c.brokeN >= 2) {
        n = c.brokeN;
        alpha *= 1 - easeInCubic(dk);
        scale = rm ? 1 : lerp(1, 0.7, easeOutCubic(dk));
        drop = rm ? 0 : dk * l.cell * 0.12;
      } else return;
    }
    if (alpha <= 0.01) return;
    const level = comboLevel(n) as ComboLevel;
    const st = comboStyle(level);
    const bt0 = badgeType(n, l, ts);
    const size = bt0.size;
    const label = this.sprites.get('COMBO', bt0.labelPx, bt0.style, night, bt0.weight);
    const num = this.sprites.get(`×${n}`, bt0.numPx, bt0.style, night);
    // the number ticks up with a punch; level-ups punch harder
    const bt = now - c.bumpAt;
    const punch = rm || c.n < 2 ? 1 : 1 + (now - c.levelAt < 600 ? 0.55 : 0.35) * (1 - spring(bt, 380, 0.12));
    // outlined sprites carry padding for the stroke (they overlap); flat ones sit a gap apart
    const overlapW = bt0.flat ? label.w + num.w + size * 0.18 : label.w + num.w - size * 0.36;
    const pipR = Math.max(3, size * 0.17);
    const pipsW = pipR * 2 * STREAK_GRACE + pipR * 0.8 * (STREAK_GRACE - 1);
    const total = overlapW + pipR * 2 + pipsW;
    const x0 = l.w / 2 - (total * scale) / 2;
    const y = cy + drop;
    // level glow: a soft halo behind the badge (×10+), a ring flare on level-up
    if (st.glow && !rm) {
      const lk = clamp01((now - c.levelAt) / 900);
      g.globalAlpha = alpha * (0.22 + (lk < 1 ? 0.35 * (1 - lk) : 0));
      g.fillStyle = st.style === 'gold' ? '#F5C451' : '#F2B93B';
      g.beginPath();
      g.ellipse(x0 + overlapW / 2, y, overlapW * 0.62 * (1 + (lk < 1 ? 0.25 * lk : 0)), size * 0.75, 0, 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = 1;
    } else if (!rm && now - c.levelAt < 900) {
      const lk = (now - c.levelAt) / 900;
      // level-up: a soft glow swells behind the badge (a stroked ring read as a stray line)
      g.globalAlpha = alpha * 0.22 * (1 - lk) * Math.min(1, lk * 6);
      g.fillStyle = p.water;
      g.beginPath();
      g.ellipse(x0 + overlapW / 2, y, overlapW * (0.55 + lk * 0.25), size * (0.75 + lk * 0.3), 0, 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = 1;
    }
    // ×10 and ×20 step up visibly: a ring bursts off the badge with a few sparks (once, ≤ 600 ms)
    const rk = (now - c.levelAt) / 600;
    if (level >= 3 && !rm && rk >= 0 && rk < 1) {
      const e = easeOutCubic(rk);
      const col = level >= 4 ? '#F5C451' : '#F2955B';
      const bx = x0 + overlapW / 2;
      g.globalAlpha = alpha * (1 - rk) * 0.9;
      g.strokeStyle = col;
      g.lineWidth = Math.max(1.5, size * 0.12 * (1 - rk));
      g.beginPath();
      g.ellipse(bx, y, overlapW * (0.5 + 0.35 * e), size * (0.7 + 0.9 * e), 0, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = col;
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + 0.2;
        const d = 0.55 + 0.55 * e;
        g.beginPath();
        g.arc(
          bx + Math.cos(a) * overlapW * d,
          y + Math.sin(a) * size * (0.9 + 1.2 * e),
          Math.max(1, size * 0.09 * (1 - rk)),
          0,
          Math.PI * 2,
        );
        g.fill();
      }
      g.globalAlpha = 1;
    }
    this.blit(g, label, x0 + (label.w * scale) / 2, y + (bt0.flat ? size * 0.02 : size * 0.05), scale, 0, alpha);
    const nx = x0 + (overlapW - num.w) * scale + (num.w * scale) / 2;
    // the previous number lifts away as the new one lands
    if (!rm && bt >= 0 && bt < 160 && c.prevN >= 2 && c.prevN !== n) {
      const pb = badgeType(c.prevN, l, ts);
      const prev = this.sprites.get(`×${c.prevN}`, pb.numPx, pb.style, night);
      this.blit(g, prev, nx, y - (bt / 160) * size * 0.5, scale, 0, alpha * (1 - bt / 160));
    }
    this.blit(g, num, nx, y, scale * punch, 0, alpha * (rm ? 1 : Math.min(1, Math.max(0, bt) / 60 + 0.2)));
    // grace shells: lit = safe, dim = used; the last one breathes when it's all that's left
    const px0 = x0 + overlapW * scale + pipR * 0.6;
    const lit = Math.max(0, STREAK_GRACE - c.dry);
    for (let i = 0; i < STREAK_GRACE; i++) {
      const on = c.n >= 2 && i < lit;
      const x = px0 + pipR + i * pipR * 2.8;
      const dimming = !on && i === lit && now - c.dryAt < 400 && !rm;
      let r = pipR;
      if (dimming) r *= 1 + 0.4 * (1 - (now - c.dryAt) / 400);
      if (on && lit === 1 && !rm) r *= 1 + 0.12 * Math.sin(now / 160);
      g.globalAlpha = alpha * (on ? 1 : 0.32);
      drawShell(g, x, y + size * 0.02, r * 1.05, on ? (night ? p.waterHi : p.accent) : p.textDim, on);
    }
    g.globalAlpha = 1;
  }

  private drawBest(
    g: CanvasRenderingContext2D,
    now: number,
    k: number,
    l: Layout,
    cy: number,
    night: boolean,
    rm: boolean,
    ts: number,
  ): void {
    const t = (now - this.bestAt) as number;
    const size = l.cell * 0.46 * Math.min(1.15, ts);
    const spr = this.sprites.get('NEW BEST!', size, 'gold', night);
    const inS = rm ? 1 : lerp(0.5, 1, spring(t, 420, 0.08));
    const out = clamp01((k - 0.86) / 0.14);
    const alpha = (rm ? Math.min(1, t / 150) : Math.min(1, t / 80)) * (1 - out);
    const w = spr.w * inS;
    const h = size * 1.35 * inS;
    // ribbon behind the text, with notched ends
    g.globalAlpha = alpha;
    g.fillStyle = night ? '#3A2E10' : '#FFF1CC';
    ribbon(g, l.w / 2, cy, w * 0.98, h);
    g.fill();
    g.strokeStyle = night ? '#F5C451' : '#E2B24A';
    g.lineWidth = 1.5;
    g.stroke();
    // one glint sweeps across the ribbon
    if (!rm && t < 900) {
      g.save();
      ribbon(g, l.w / 2, cy, w * 0.98, h);
      g.clip();
      const gx = l.w / 2 - w / 2 + (w + h) * easeInOutSine(t / 900) - h / 2;
      const gr = g.createLinearGradient(gx - h, 0, gx + h, 0);
      gr.addColorStop(0, 'rgba(255,255,255,0)');
      gr.addColorStop(0.5, 'rgba(255,255,255,0.65)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(gx - h, cy - h, h * 2, h * 2);
      g.restore();
    }
    this.blit(g, spr, l.w / 2, cy, inS, 0, alpha);
    g.globalAlpha = 1;
  }
}

/**
 * The COMBO badge's type: clean Nunito heavy caps in one ink below ×10 (both themes), the outlined
 * display treatment from ×10 up (warm, then gold at ×20) — the step is a visible change of kind.
 */
export function badgeType(
  n: number,
  l: Layout,
  ts: number,
): { flat: boolean; size: number; labelPx: number; numPx: number; style: TextStyle; weight: number } {
  const st = comboStyle(comboLevel(n));
  const size = l.cell * st.size * Math.min(1.15, ts);
  if (n < 10) return { flat: true, size, labelPx: size * 0.66, numPx: size * 0.9, style: 'flat', weight: 900 };
  return { flat: false, size, labelPx: size * 0.78, numPx: size, style: st.style, weight: st.weight };
}

/** Mid-game NEW BEST banner: drop in, hold, fade (ms). */
export const BEST_LIFE = 1700;
/** Spotless tide wash (ms). */
export const WASH_MS = 700;

function ribbon(g: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number): void {
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const n = h * 0.32;
  g.beginPath();
  g.moveTo(x0 - n, cy - h / 2);
  g.lineTo(x1 + n, cy - h / 2);
  g.lineTo(x1, cy);
  g.lineTo(x1 + n, cy + h / 2);
  g.lineTo(x0 - n, cy + h / 2);
  g.lineTo(x0, cy);
  g.closePath();
}

export { LIMITS };
