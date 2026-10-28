/**
 * The title screen's living scene (ADR 0015), a lazy chunk: the static title (index.html) is already
 * on screen and playable; this canvas fades in behind it a moment later.
 *
 * A calm beach: sand under the wordmark, a shoreline under Play, and the sea below with a slow
 * shimmer. The static layer is drawn once to an offscreen canvas; a frame is one blit and a few
 * shimmer arcs (30 fps cap, stopped when hidden or when the title closes).
 */
import type { Palette } from '../render/theme.ts';

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
  private raf = 0;
  private last = 0;
  private t0 = performance.now();
  private w = 0;
  private h = 0;
  private dpr = 1;
  /** Where the open sea starts (CSS px from the top). */
  private shore = 0;
  private stopped = false;
  private ro: ResizeObserver | null = null;

  constructor(
    private palette: () => Palette,
    private reduced: () => boolean,
  ) {
    // the scene waits for the fonts' layout (the lockup's size decides where the sea starts)
    void document.fonts?.ready.then(() => this.resize());
    addEventListener('resize', this.onResize);
    // iOS settles the safe-area insets after first layout (the title's padding changes, the window
    // doesn't): watch the title's own box so the shoreline stays under Play
    let first = true;
    this.ro = new ResizeObserver(() => (first ? (first = false) : this.refresh()));
    this.ro.observe(this.el);
    document.addEventListener('visibilitychange', this.onVis);
    this.resize();
  }

  /** Theme or size changed: rebuild the static layers. */
  refresh(): void {
    if (this.stopped) return;
    this.base = null;
    this.resize();
  }

  stop(): void {
    this.stopped = true;
    cancelAnimationFrame(this.raf);
    removeEventListener('resize', this.onResize);
    this.ro?.disconnect();
    document.removeEventListener('visibilitychange', this.onVis);
    // let go of the layers (two full-screen canvases at dpr 2) once the title fades
    setTimeout(() => {
      this.base = null;
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
    // the sea starts just under Play
    const pr = this.play.getBoundingClientRect();
    this.shore = Math.min(this.h - 140, pr.bottom - r.top + Math.max(28, (r.bottom - pr.bottom) * 0.1));
    this.base = this.drawBase();
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

  /** Sky (or night), sun or moon, the shoreline and the sea. */
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

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);
    if (now - this.last < 32) return; // 30 fps is plenty for water
    this.last = now;
    this.draw(now);
  };

  private draw(now: number): void {
    if (!this.base) return;
    const g = this.cv.getContext('2d')!;
    const t = this.reduced() ? 0 : (now - this.t0) / 1000;
    const night = this.palette().name === 'night';
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(this.base, 0, 0);
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    // sea shimmer: short arcs drifting and breathing
    g.lineCap = 'round';
    g.lineWidth = 1.6;
    for (let i = 0; i < 18; i++) {
      const sx = ((i * 97.3 + t * (6 + (i % 3) * 1.5)) % (this.w + 60)) - 30;
      const sy = this.shore + 24 + ((i * 53.7) % Math.max(40, this.h - this.shore - 70));
      g.strokeStyle = night
        ? `rgba(160,230,245,${0.14 + 0.1 * Math.sin(t * 1.9 + i)})`
        : `rgba(255,255,255,${0.4 + 0.18 * Math.sin(t * 1.9 + i)})`;
      g.beginPath();
      g.moveTo(sx, sy);
      g.quadraticCurveTo(sx + 9, sy - 3, sx + 18, sy);
      g.stroke();
    }
  }
}
