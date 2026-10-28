/**
 * The title screen's living scene (ADR 0015), a lazy chunk: the static title (index.html) is already
 * on screen and playable; this canvas fades in behind it a moment later.
 *
 * The game's own idea drawn large: a closed ring of blocks (the same sprites as the board) standing
 * in the sea, with calm lagoon water inside it and a fish turning slow circles. Static layers are
 * drawn once to offscreen canvases; a frame is two blits, a few shimmer arcs and the fish (30 fps
 * cap, stopped when hidden or when the title closes).
 */
import type { Palette } from '../render/theme.ts';
import { VARIANTS, type SpriteCache } from '../render/sprites.ts';

/** The ring of blocks: X = a block (the digit picks its colour), . = sea, o = lagoon water. */
const RING = ['..1223..', '.15oo64.', '34oooo51', '6ooooo2.', '.21oo33.', '..6545..'];

/** Sky and sea stops; the wordmark, tagline and pills sit on them (tests/unit/contrast.test.ts). */
export const TITLE_COLORS = {
  day: { sky: ['#fbf6ee', '#f3e7d5'], sea: ['#7fd3e6', '#4fb5d3', '#3a98bd'] },
  night: { sky: ['#08111b', '#0e2032'], sea: ['#123a52', '#0d2c42', '#0a2233'] },
} as const;

export class TitleScene {
  private el = document.getElementById('title')!;
  private cv = document.getElementById('title-bg') as HTMLCanvasElement;
  private play = document.getElementById('t-play') as HTMLButtonElement;
  private base: HTMLCanvasElement | null = null;
  private ring: HTMLCanvasElement | null = null;
  private raf = 0;
  private last = 0;
  private t0 = performance.now();
  private w = 0;
  private h = 0;
  private dpr = 1;
  /** The lagoon interior in CSS px (fish and shimmer live inside it). */
  private lag = { x: 0, y: 0, w: 0, h: 0, cell: 0 };
  /** Where the open sea starts (CSS px from the top). */
  private shore = 0;
  private stopped = false;

  constructor(
    private sprites: SpriteCache,
    private palette: () => Palette,
    private reduced: () => boolean,
  ) {
    // the scene waits for the fonts' layout (the lockup's size decides where the sea starts)
    void document.fonts?.ready.then(() => this.resize());
    addEventListener('resize', this.onResize);
    document.addEventListener('visibilitychange', this.onVis);
    this.resize();
  }

  /** Theme or size changed: rebuild the static layers. */
  refresh(): void {
    if (this.stopped) return;
    this.base = this.ring = null;
    this.resize();
  }

  stop(): void {
    this.stopped = true;
    cancelAnimationFrame(this.raf);
    removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onVis);
    // let go of the layers (two full-screen canvases at dpr 2) once the title fades
    setTimeout(() => {
      this.base = this.ring = null;
      this.cv.width = this.cv.height = 0;
    }, 800);
  }

  private onResize = () => this.refresh();
  private onVis = () => {
    cancelAnimationFrame(this.raf);
    if (!document.hidden && !this.stopped && !this.reduced()) this.raf = requestAnimationFrame(this.frame);
  };

  private resize(): void {
    if (this.stopped) return;
    const r = this.el.getBoundingClientRect();
    this.w = r.width;
    this.h = r.height;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.cv.width = Math.round(this.w * this.dpr);
    this.cv.height = Math.round(this.h * this.dpr);
    // the sea starts just under Play; the atoll sits centred in what's left above the footer
    const pr = this.play.getBoundingClientRect();
    const fr = this.el.querySelector('.t-foot')!.getBoundingClientRect();
    this.shore = Math.min(this.h - 140, pr.bottom - r.top + Math.max(28, (fr.top - pr.bottom) * 0.12));
    const room = fr.top - r.top - this.shore - 20;
    // phones: up to 46 px blocks; tablets grow the vignette to ~60% of the width
    const lockW = this.el.querySelector('.title-word')!.getBoundingClientRect().width;
    const cap = this.w >= 700 ? Math.floor(Math.min(this.w * 0.6, this.h * 0.46, lockW * 0.75) / 8) : 46;
    // 6 rows + the reef flat's rim + at least 12 px of open water under the shoreline
    const cell = Math.max(20, Math.min(cap, Math.floor(Math.min((this.w - 32) / 8, (room - 12) / 6.6))));
    const gw = 8 * cell;
    const gh = 6 * cell;
    const gx = Math.round((this.w - gw) / 2);
    // centred in the sea, never closer than 16 px (plus the reef flat's rim) to the pills
    const gy = Math.round(
      this.shore + Math.max(12 + cell * 0.2, Math.min((room - gh) / 2 + cell * 0.25, room - gh - cell * 0.2)),
    );
    this.lag = { x: gx, y: gy, w: gw, h: gh, cell };
    this.base = this.drawBase();
    this.ring = this.drawRing();
    this.draw(performance.now());
    this.cv.classList.add('on');
    cancelAnimationFrame(this.raf);
    if (!this.reduced() && !document.hidden) this.raf = requestAnimationFrame(this.frame);
  }

  private layer(): [HTMLCanvasElement, CanvasRenderingContext2D] {
    const c = document.createElement('canvas');
    c.width = this.cv.width;
    c.height = this.cv.height;
    const g = c.getContext('2d')!;
    g.scale(this.dpr, this.dpr);
    return [c, g];
  }

  /** Sky (or night), sun or moon, the shoreline and the sea; the lagoon water inside the ring. */
  private drawBase(): HTMLCanvasElement {
    const [c, g] = this.layer();
    const p = this.palette();
    const night = p.name === 'night';
    const { w, h, shore } = this;
    const sky = g.createLinearGradient(0, 0, 0, shore);
    const k = TITLE_COLORS[night ? 'night' : 'day'];
    sky.addColorStop(0, k.sky[0]);
    sky.addColorStop(1, k.sky[1]);
    g.fillStyle = sky;
    g.fillRect(0, 0, w, shore + 40);
    if (night) {
      // a few stars and a crescent moon (fixed positions: a seeded scatter, not random per load)
      let s = 7;
      const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
      g.fillStyle = '#eef3f6';
      const top = this.el.getBoundingClientRect().top;
      const keepOut = [...this.el.querySelectorAll('.t-lock, .t-play')].map((e) => e.getBoundingClientRect());
      const clear = (x: number, y: number) =>
        keepOut.every((b) => x < b.left - 12 || x > b.right + 12 || y < b.top - top - 12 || y > b.bottom - top + 12);
      for (let i = 0, n = 0; i < 80 && n < 26; i++) {
        const a = 0.25 + rnd() * 0.55;
        const x = rnd() * w;
        const y = rnd() * shore * 0.9;
        const r = 0.6 + rnd() * 1.1;
        if (!clear(x, y)) continue;
        n++;
        g.globalAlpha = a;
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      const mx = w * 0.82;
      const my = this.lightY(64, h * 0.1);
      const halo = g.createRadialGradient(mx, my, 16, mx, my, 40);
      halo.addColorStop(0, 'rgba(244,236,214,0.12)');
      halo.addColorStop(1, 'rgba(244,236,214,0)');
      g.fillStyle = halo;
      g.fillRect(mx - 40, my - 40, 80, 80);
      // the crescent is cut out of the disc (not painted over it), so the halo shows through
      const [mc, mg] = this.layer();
      mg.fillStyle = '#f4ecd6';
      mg.beginPath();
      mg.arc(mx, my, 17, 0, Math.PI * 2);
      mg.fill();
      mg.globalCompositeOperation = 'destination-out';
      mg.beginPath();
      mg.arc(mx + 7, my - 5, 15, 0, Math.PI * 2);
      mg.fill();
      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.drawImage(mc, 0, 0);
      g.restore();
    } else {
      const sx = w * 0.8;
      const sy = this.lightY(70, h * 0.11);
      const sun = g.createRadialGradient(sx, sy, 22, sx, sy, 34);
      sun.addColorStop(0, 'rgba(247,214,140,0.22)');
      sun.addColorStop(1, 'rgba(247,214,140,0)');
      g.fillStyle = sun;
      g.fillRect(sx - 34, sy - 34, 68, 68);
      g.fillStyle = '#f5d17f';
      g.beginPath();
      g.arc(sx, sy, 22, 0, Math.PI * 2);
      g.fill();
    }
    // the sea: a soft wet-sand band, then water deepening toward the bottom
    const wet = night ? 'rgba(111,211,236,0.10)' : 'rgba(92,200,224,0.20)';
    g.fillStyle = wet;
    this.shoreline(g, shore - 7, 6);
    const sea = g.createLinearGradient(0, shore, 0, h);
    sea.addColorStop(0, k.sea[0]);
    sea.addColorStop(0.55, k.sea[1]);
    sea.addColorStop(1, k.sea[2]);
    g.fillStyle = sea;
    this.shoreline(g, shore, 5);
    // foam on the shoreline
    g.strokeStyle = night ? 'rgba(238,243,246,0.28)' : 'rgba(255,255,255,0.85)';
    g.lineWidth = 2;
    g.beginPath();
    for (let x = -8; x <= w + 8; x += 4) {
      const y = shore + Math.sin(x / 38) * 5 + Math.sin(x / 13) * 1.2;
      if (x === -8) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
    // the atoll: a sandy reef flat under the ring (soft shadow on the sea floor, a pale wet edge),
    // then the lagoon inside it: brighter, shallower water with a sandy glow at its heart
    const { x, y, cell } = this.lag;
    const cells = (want: (ch: string) => boolean) =>
      RING.flatMap((row, j) => [...row].flatMap((ch, i) => (want(ch) ? [[x + i * cell, y + j * cell] as const] : [])));
    const solid = cells((ch) => ch !== '.');
    const blob = (pad: number, r: number) => {
      g.beginPath();
      for (const [cx0, cy0] of solid) g.roundRect(cx0 - pad, cy0 - pad, cell + 2 * pad, cell + 2 * pad, r);
      g.fill();
    };
    g.save();
    g.shadowColor = night ? 'rgba(0,0,0,0.4)' : 'rgba(18,84,116,0.28)';
    g.shadowBlur = cell * 0.5;
    g.shadowOffsetY = cell * 0.16;
    g.fillStyle = night ? '#1f3a48' : '#bfe6ee';
    blob(cell * 0.2, cell * 0.42);
    g.restore();
    g.fillStyle = night ? '#3a5566' : '#f0dcb8';
    blob(cell * 0.08, cell * 0.34);
    const cx = x + this.lag.w / 2;
    const cy = y + this.lag.h / 2;
    const lagoon = g.createRadialGradient(cx, cy - cell * 0.3, cell * 0.2, cx, cy, cell * 2.6);
    lagoon.addColorStop(0, night ? '#2f8aa0' : '#d4f6f8');
    lagoon.addColorStop(0.55, night ? '#21677f' : '#9fe6f0');
    lagoon.addColorStop(1, night ? '#1a5168' : '#74d3e7');
    g.fillStyle = lagoon;
    g.beginPath();
    for (const [lx, ly] of cells((ch) => ch === 'o')) g.rect(lx - 0.5, ly - 0.5, cell + 1, cell + 1);
    g.fill();
    // sand ripples on the lagoon floor
    g.strokeStyle = night ? 'rgba(160,230,245,0.12)' : 'rgba(120,170,170,0.18)';
    g.lineWidth = 1.2;
    for (let k = 0; k < 3; k++) {
      const ry = cy + cell * (0.55 + k * 0.32);
      g.beginPath();
      g.moveTo(cx - cell * (1.3 - k * 0.2), ry);
      g.quadraticCurveTo(cx, ry - cell * 0.16, cx + cell * (1.1 - k * 0.2), ry);
      g.stroke();
    }
    return c;
  }

  /** The sun's/moon's height: high in the sky, and always clear of the wordmark (tall screens). */
  private lightY(min: number, want: number): number {
    const lock = this.el.querySelector('.t-lock')!.getBoundingClientRect();
    const top = lock.top - this.el.getBoundingClientRect().top;
    return Math.max(36, Math.min(Math.max(min, want), top - 48));
  }

  private shoreline(g: CanvasRenderingContext2D, y0: number, amp: number): void {
    const { w, h } = this;
    const yAt = (x: number) => y0 + Math.sin(x / 38) * amp + Math.sin(x / 13) * 1.2;
    g.beginPath();
    g.moveTo(-8, h);
    for (let x = -8; x < w + 8; x += 4) g.lineTo(x, yAt(x));
    g.lineTo(w + 8, yAt(w + 8));
    g.lineTo(w + 8, h);
    g.closePath();
    g.fill();
  }

  /** The ring itself: the board's own block sprites. */
  private drawRing(): HTMLCanvasElement {
    const [c, g] = this.layer();
    const p = this.palette();
    const { x, y, cell } = this.lag;
    RING.forEach((row, j) =>
      [...row].forEach((ch, i) => {
        if (!/\d/.test(ch)) return;
        g.drawImage(
          this.sprites.build(p, Number(ch), cell, 'normal', (i * 3 + j) % VARIANTS),
          x + i * cell,
          y + j * cell,
          cell,
          cell,
        );
      }),
    );
    return c;
  }

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);
    if (now - this.last < 32) return; // 30 fps is plenty for water
    this.last = now;
    this.draw(now);
  };

  private draw(now: number): void {
    if (!this.base || !this.ring) return;
    const g = this.cv.getContext('2d')!;
    const t = this.reduced() ? 0 : (now - this.t0) / 1000;
    const night = this.palette().name === 'night';
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(this.base, 0, 0);
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const { x, y, w: lw, h: lh, cell } = this.lag;
    // sea shimmer: short arcs drifting and breathing
    g.lineCap = 'round';
    g.lineWidth = 1.6;
    for (let i = 0; i < 12; i++) {
      const sx = ((i * 97.3 + t * (6 + (i % 3) * 1.5)) % (this.w + 60)) - 30;
      const sy = this.shore + 24 + ((i * 53.7) % Math.max(40, this.h - this.shore - 70));
      if (sy > y - 6 && sy < y + lh + 6 && sx > x - 10 && sx < x + lw + 10) continue; // not over the atoll
      g.strokeStyle = night
        ? `rgba(160,230,245,${0.14 + 0.1 * Math.sin(t * 1.9 + i)})`
        : `rgba(255,255,255,${0.4 + 0.18 * Math.sin(t * 1.9 + i)})`;
      g.beginPath();
      g.moveTo(sx, sy);
      g.quadraticCurveTo(sx + 9, sy - 3, sx + 18, sy);
      g.stroke();
    }
    // the fish turns slow lazy-eights inside the lagoon
    const cx = x + lw / 2;
    const cy = y + lh / 2 + cell * 0.1;
    const a = t * 0.45;
    const fx = cx + Math.sin(a) * cell * 1.55;
    const fy = cy + Math.sin(a * 2) * cell * 0.42;
    const dx = Math.cos(a) * 1.55;
    const dy = Math.cos(a * 2) * 0.84;
    const ang = Math.atan2(dy, dx);
    const s = cell * 0.36;
    g.save();
    g.translate(fx, fy);
    g.rotate(ang);
    const wag = Math.sin(t * 7) * 0.25;
    g.fillStyle = night ? 'rgba(4,20,30,0.35)' : 'rgba(30,110,140,0.22)';
    g.beginPath();
    g.ellipse(2, s * 0.5, s, s * 0.42, 0, 0, Math.PI * 2);
    g.fill(); // its shadow on the lagoon floor
    g.fillStyle = night ? '#ffb39c' : '#f2795b';
    g.beginPath();
    g.ellipse(0, 0, s, s * 0.46, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.moveTo(-s * 0.8, 0);
    g.lineTo(-s * 1.55, -s * (0.48 + wag));
    g.lineTo(-s * 1.55, s * (0.48 - wag));
    g.closePath();
    g.fill();
    g.fillStyle = night ? '#0b1622' : '#2b231c';
    g.beginPath();
    g.arc(s * 0.5, -s * 0.08, Math.max(1.2, s * 0.11), 0, Math.PI * 2);
    g.fill();
    g.restore();
    // lagoon glints
    for (let i = 0; i < 5; i++) {
      const gx = x + cell * (2 + ((i * 1.7 + t * 0.12) % 4));
      const gy = y + cell * (2 + ((i * 0.9) % 2.2));
      g.strokeStyle = night
        ? `rgba(190,245,255,${0.18 + 0.14 * Math.sin(t * 2.3 + i * 1.3)})`
        : `rgba(255,255,255,${0.5 + 0.25 * Math.sin(t * 2.3 + i * 1.3)})`;
      g.beginPath();
      g.moveTo(gx, gy);
      g.quadraticCurveTo(gx + 6, gy - 2, gx + 12, gy);
      g.stroke();
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(this.ring, 0, 0);
  }
}
