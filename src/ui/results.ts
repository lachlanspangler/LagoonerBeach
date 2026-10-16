/**
 * Results hero (UI_DESIGN §6.6 / §7.3, ADR 0012): the score counts up (tabular Nunito, no jitter);
 * on a record, the moment it passes the old best it turns gold, a "NEW HIGH SCORE" ribbon with a
 * crown drops in (display type), foam-and-gold confetti bursts once, and the caller plays the
 * fanfare + a heavy haptic. Reduced motion: final state at once, no confetti — same information.
 * Never delays the buttons: they're pressable from the first frame.
 */
const CROWN = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 8l4.5 3.5L12 5l4.5 6.5L21 8l-2 10H5L3 8z"/></svg>`;

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
  el.innerHTML = `<div class="big res-score" data-testid="final-score">${o.reducedMotion ? o.score : 0}</div>
    <div class="sub res-sub">${
      o.newBest
        ? `<div class="res-ribbon" data-testid="new-high-score">${CROWN}NEW HIGH SCORE</div>${o.prevBest > 0 ? `<div class="res-was">was <s>${o.prevBest}</s></div>` : ''}`
        : o.nearMiss
    }</div>`;
  const scoreEl = el.querySelector('.res-score') as HTMLElement;
  let landed = false;
  const land = () => {
    if (landed || !o.newBest) return;
    landed = true;
    el.classList.add('record');
    requestAnimationFrame(() => el.classList.add('landed'));
    if (!o.reducedMotion) confetti(el);
    o.onRecord?.();
  };
  const start = () => {
    if (o.reducedMotion || o.score <= 0) {
      scoreEl.textContent = String(o.score);
      land();
      o.onSettled?.();
      return;
    }
    const t0 = performance.now();
    // a record crosses the old best around 70% of the count, so the gold lands on the climb
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / COUNT_MS);
      const e = 1 - Math.pow(1 - k, 3);
      const v = Math.round(o.score * e);
      scoreEl.textContent = String(v);
      if (o.newBest && v > o.prevBest) land();
      if (k < 1) requestAnimationFrame(step);
      else {
        scoreEl.textContent = String(o.score);
        land();
        setTimeout(() => o.onSettled?.(), o.newBest ? 420 : 0);
      }
    };
    requestAnimationFrame(step);
  };
  return { el, start };
}

/** One burst of foam rings and gold flecks from the score (≤ 36 particles, ≤ 1 s). */
function confetti(host: HTMLElement): void {
  const W = 340;
  const H = 260;
  const c = document.createElement('canvas');
  c.className = 'res-confetti';
  const dpr = Math.min(3, devicePixelRatio || 1);
  c.width = W * dpr;
  c.height = H * dpr;
  c.style.width = `${W}px`;
  c.style.height = `${H}px`;
  host.append(c);
  const g = c.getContext('2d')!;
  g.scale(dpr, dpr);
  let seed = 7;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const parts = Array.from({ length: 36 }, (_, i) => {
    const a = -Math.PI / 2 + (rnd() - 0.5) * Math.PI * 1.5;
    const sp = 160 + rnd() * 260;
    return {
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      r: 2 + rnd() * 3.5,
      foam: i % 3 === 0,
      color: ['#F2C14E', '#FFE08A', '#F2795B', '#5CC8E0'][i % 4]!,
      spin: (rnd() - 0.5) * 12,
    };
  });
  const t0 = performance.now();
  const frame = () => {
    const t = (performance.now() - t0) / 1000;
    g.clearRect(0, 0, W, H);
    if (t > 1) return c.remove();
    for (const p of parts) {
      const x = W / 2 + p.vx * t;
      const y = H * 0.42 + p.vy * t + 0.5 * 520 * t * t;
      g.globalAlpha = 1 - t * t;
      if (p.foam) {
        g.strokeStyle = '#FFFFFF';
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(x, y, p.r * 1.3, 0, Math.PI * 2);
        g.stroke();
      } else {
        g.save();
        g.translate(x, y);
        g.rotate(p.spin * t);
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
