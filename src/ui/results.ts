/**
 * Results hero (UI_DESIGN §6.6 / §7.3, ADR 0012): the score counts up (tabular Nunito, no jitter);
 * on a record, the moment it passes the old best it turns gold, a "NEW HIGH SCORE" ribbon with a
 * crown drops in (display type), confetti fires from both card edges (~2 s), and the caller plays the
 * fanfare + a heavy haptic. Reduced motion: final state at once, no confetti — same information.
 * Never delays the buttons: they're pressable from the first frame.
 */
import './results.css';
import { fmt } from '../render/theme.ts';
import { icon } from './icons.ts';

const CROWN = icon('crown', { filled: true });

export interface HeroOpts {
  score: number;
  best: number;
  /** Best before this game (0 = first game ever, no record moment). */
  prevBest: number;
  newBest: boolean;
  reducedMotion: boolean;
  /** Fires once when the record moment lands (fanfare + haptic live in the caller). */
  onRecord?: () => void;
  /** Fires once when the hero has settled (count-up and ribbon done). */
  onSettled?: () => void;
  /** "Best 1200" + bar, when it isn't a record. */
  nearMiss: string;
}

export const COUNT_MS = 800;

export function resultsHero(o: HeroOpts): { el: HTMLElement; start: () => void } {
  const el = document.createElement('div');
  el.className = 'res-hero';
  // the visible digits count up; the real value is always in the DOM (screen readers, tests)
  el.innerHTML = `<div class="big res-score"><span class="res-count" aria-hidden="true">${o.reducedMotion ? fmt(o.score) : 0}</span><span class="sr-only" data-testid="final-score">${o.score}</span></div>
    <div class="res-sub">${
      o.newBest
        ? `<div class="res-ribbon" data-testid="new-high-score">${CROWN}PERSONAL BEST</div>${o.prevBest > 0 ? `<div class="res-was">was <s class="num">${fmt(o.prevBest)}</s></div>` : ''}`
        : o.nearMiss
    }</div>`;
  const scoreEl = el.querySelector('.res-count') as HTMLElement;
  let landed = false;
  const land = () => {
    if (landed || !o.newBest) return;
    landed = true;
    el.classList.add('record');
    requestAnimationFrame(() => el.classList.add('landed'));
    if (!o.reducedMotion) confetti((el.closest('.card') as HTMLElement | null) ?? el);
    o.onRecord?.();
  };
  const start = () => {
    if (o.reducedMotion || o.score <= 0) {
      scoreEl.textContent = fmt(o.score);
      land();
      o.onSettled?.();
      return;
    }
    const t0 = performance.now();
    // a record crosses the old best around 70% of the count, so the gold lands on the climb
    const step = () => {
      // the card was dismissed (next game): stop, and never fire the record fanfare over it
      if (!el.isConnected) return;
      const k = Math.min(1, (performance.now() - t0) / COUNT_MS);
      const e = 1 - Math.pow(1 - k, 3);
      const v = Math.round(o.score * e);
      scoreEl.textContent = fmt(v);
      if (o.newBest && v > o.prevBest) land();
      if (k < 1) requestAnimationFrame(step);
      else {
        scoreEl.textContent = fmt(o.score);
        land();
        setTimeout(() => el.isConnected && o.onSettled?.(), o.newBest ? 420 : 0);
      }
    };
    requestAnimationFrame(step);
  };
  return { el, start };
}

/**
 * Confetti from both edges of the card (~2 s): gold and coral flecks and foam rings fired up and
 * inward from the left and right sides, fluttering down past the score. A fixed overlay canvas
 * (the card scrolls and would clip it); ≤ 64 particles; gone when the card is.
 */
export const CONFETTI_MS = 2100;
function confetti(card: HTMLElement): void {
  const r = card.getBoundingClientRect();
  const PAD = 28;
  const W = Math.round(r.width + PAD * 2);
  const H = Math.round(Math.min(innerHeight, r.height + 120));
  const c = document.createElement('canvas');
  c.className = 'res-confetti';
  const dpr = Math.min(3, devicePixelRatio || 1);
  c.width = W * dpr;
  c.height = H * dpr;
  Object.assign(c.style, {
    position: 'fixed',
    left: `${r.left - PAD}px`,
    top: `${Math.max(0, r.top - 60)}px`,
    width: `${W}px`,
    height: `${H}px`,
    pointerEvents: 'none',
    zIndex: '60',
  });
  document.body.append(c);
  const g = c.getContext('2d')!;
  g.scale(dpr, dpr);
  let seed = 7;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const y0 = Math.min(H * 0.5, r.top - Math.max(0, r.top - 60) + r.height * 0.42);
  const parts = Array.from({ length: 64 }, (_, i) => {
    const side = i % 2 === 0 ? -1 : 1; // -1: from the left edge
    return {
      x: side < 0 ? PAD + 4 : W - PAD - 4,
      y: y0 + (rnd() - 0.5) * 80,
      vx: -side * (90 + rnd() * 260),
      vy: -(330 + rnd() * 380),
      delay: rnd() * 0.45,
      r: 2.5 + rnd() * 3.5,
      foam: i % 5 === 0,
      color: ['#F2C14E', '#FFE08A', '#F2795B', '#5CC8E0', '#F6A6B2'][i % 5]!,
      spin: (rnd() - 0.5) * 14,
      wob: 4 + rnd() * 6,
      ph: rnd() * 6.28,
    };
  });
  const t0 = performance.now();
  const life = CONFETTI_MS / 1000;
  const frame = () => {
    const t = (performance.now() - t0) / 1000;
    g.clearRect(0, 0, W, H);
    if (t > life || !card.isConnected) return c.remove();
    for (const p of parts) {
      const u = t - p.delay;
      if (u <= 0) continue;
      // light air drag so flecks hang, then flutter down
      const drag = 1 - Math.exp(-1.6 * u);
      const x = p.x + (p.vx / 1.6) * drag + Math.sin(u * p.wob + p.ph) * 7 * Math.min(1, u * 2);
      const y = p.y + (p.vy / 1.6) * drag + 0.5 * 420 * u * u * 0.55;
      g.globalAlpha = u > life - 0.6 - p.delay ? Math.max(0, (life - p.delay - u) / 0.6) : 1;
      if (p.foam) {
        g.strokeStyle = '#FFFFFF';
        g.lineWidth = 1.6;
        g.beginPath();
        g.arc(x, y, p.r * 1.3, 0, Math.PI * 2);
        g.stroke();
      } else {
        g.save();
        g.translate(x, y);
        g.rotate(p.spin * u);
        g.scale(1, Math.cos(u * p.wob * 1.3 + p.ph)); // tumbling
        g.fillStyle = p.color;
        g.fillRect(-p.r, -p.r * 0.6, p.r * 2, p.r * 1.2);
        g.restore();
      }
    }
    g.globalAlpha = 1;
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
