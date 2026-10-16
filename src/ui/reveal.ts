/**
 * Discovery reveal (ADR 0012, CREATURE_ART R29/R30, UI_DESIGN §6.8): the first catch of a species
 * is a little present. Shown after the capture has settled (never mid-capture), one at a time,
 * rarest last. Scaled by rarity:
 *   common     quick card pop at the top of the board + chime (≤ 0.8 s, never blocks input)
 *   uncommon   bubble-pearl → pop → creature card (name in display type), ring wave
 *   rare       + light rays + sparkles
 *   epic       + music sting + dimmed board
 *   legendary  + full-screen tide + fanfare (settled ≤ 2.0 s)
 * Any tap during the animation skips to the settled card; Continue (or a tap outside) closes it.
 * The creature does a little dance (surprised → happy). Share renders a 4:5 card (share-card.ts).
 * Reduced motion: no rays/tide motion, no hops — the same information.
 */
import { SPECIES, SPECIES_BY_ID, type Rarity, type Species } from '../meta/creatures.ts';
import { drawCreature, hasNewArt, type DrawOpts } from '../render/creatures.ts';
import { spring } from '../render/celebrate.ts';
import './celebrate.css';
import {
  HABITAT_TINT,
  RARITY_COLOR,
  RARITY_RANK,
  drawPips,
  renderShareCard,
  shareCanvas,
  sparkles,
} from './share-card.ts';

let lastKey = false;
addEventListener('keydown', () => (lastKey = true), true);
addEventListener('pointerdown', () => (lastKey = false), true);

export interface RevealItem {
  readonly id: string;
  /** Size caught, cm. */
  readonly size: number;
  readonly golden: boolean;
  /** First golden of an already-found species (gets the golden sparkle treatment). */
  readonly firstGolden?: boolean;
}

export interface RevealDeps {
  sfx: { reveal(rarity: string): void; bubblePop(): void; place(size: number): void };
  haptics: { fire(k: 'tick' | 'medium' | 'heavy'): void };
  reducedMotion(): boolean;
  night(): boolean;
  announce(text: string): void;
  /** Journal found count (for "No. 9 · 15 of 47 found"). */
  found(): number;
  /** Today's date label for the share card. */
  date(): string;
  /** Clock (tests can freeze it). */
  now?: () => number;
  /** False while the player is mid-drag or a menu is open: the reveal waits (never interrupts). */
  canOpen?: () => boolean;
}

/** Settled time per rarity (ms): the reveal is skippable at any point before. */
export const REVEAL_MS: Record<Rarity, number> = {
  common: 800,
  uncommon: 900,
  rare: 1150,
  epic: 1450,
  legendary: 2000,
};
/** The species' signature move, played once in the reveal (new art). */
const SIGNATURE_MS = 950;
/** When the bubble-pearl pops (ms). */
const POP_MS: Record<Rarity, number> = { common: 0, uncommon: 300, rare: 480, epic: 640, legendary: 980 };

export function formatSize(cm: number): string {
  return cm >= 100 ? `${(cm / 100).toFixed(cm >= 1000 ? 0 : 1)} m` : `${cm.toFixed(1)} cm`;
}

/** How it was caught, as a short line from the species' hint ("Lives in long, flat pools."). */
export function howLine(sp: Species): string {
  return sp.hint.replace(/\.$/, '');
}

interface Active {
  item: RevealItem;
  sp: Species;
  start: number;
  /** Modal card vs the quick common pop. */
  modal: boolean;
  el: HTMLElement;
  stage: HTMLCanvasElement;
  fx: HTMLCanvasElement | null;
  settled: boolean;
  stamped: boolean;
}

export class Reveal {
  private queue: { item: RevealItem; at: number }[] = [];
  private cur: Active | null = null;
  private raf = 0;
  private idleFns: (() => void)[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly now: () => number;

  constructor(
    private readonly root: HTMLElement,
    private readonly d: RevealDeps,
  ) {
    this.now = d.now ?? (() => performance.now());
  }

  /**
   * A modal reveal is animating (board input waits, ≤ 2 s; any tap skips). Once settled the card
   * stays for Share, but a press outside it dismisses it and goes straight to the game.
   */
  get blocking(): boolean {
    return this.cur?.modal === true && !this.cur.settled;
  }

  get idle(): boolean {
    return !this.cur && this.queue.length === 0;
  }

  /** Run fn once nothing is queued or showing (e.g. the game-over card waits for discoveries). */
  whenIdle(fn: () => void): void {
    if (this.idle) fn();
    else this.idleFns.push(fn);
  }

  /** Queue discoveries to start at `at` (performance.now() time, after the capture settles). */
  enqueue(items: readonly RevealItem[], at: number): void {
    const sorted = [...items].sort(
      (a, b) => RARITY_RANK[SPECIES_BY_ID.get(a.id)!.rarity] - RARITY_RANK[SPECIES_BY_ID.get(b.id)!.rarity],
    );
    for (const item of sorted) if (SPECIES_BY_ID.has(item.id)) this.queue.push({ item, at });
    this.pump();
  }

  /** Drop everything (new game / mode switch). Discoveries are already in the journal. */
  clear(): void {
    this.queue = [];
    if (this.cur) this.finish(true);
  }

  private pump(): void {
    if (this.cur || !this.queue.length) return this.flushIdle();
    const next = this.queue[0]!;
    const wait = next.at - this.now();
    if (wait > 0) {
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.timer = null;
        this.pump();
      }, wait);
      return;
    }
    if (this.d.canOpen && !this.d.canOpen()) {
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.timer = null;
        this.pump();
      }, 150);
      return;
    }
    this.queue.shift();
    this.open(next.item);
  }

  private flushIdle(): void {
    if (!this.idle) return;
    const fns = this.idleFns;
    this.idleFns = [];
    for (const f of fns) f();
  }

  private open(item: RevealItem): void {
    const sp = SPECIES_BY_ID.get(item.id)!;
    const rarity: Rarity = item.firstGolden ? 'rare' : sp.rarity;
    const modal = rarity !== 'common' || item.golden;
    const el = document.createElement('div');
    const stage = document.createElement('canvas');
    let fx: HTMLCanvasElement | null = null;
    const no = SPECIES.indexOf(sp) + 1;
    const pipColor = item.golden ? '#C9922B' : RARITY_COLOR[sp.rarity];
    if (!modal) {
      el.className = 'reveal-pop';
      el.setAttribute('role', 'status');
      el.innerHTML = `<div class="rp-text"><div class="rp-over">New in your journal</div><div class="rp-name">${sp.name}</div></div>`;
      stage.className = 'rp-stage';
      el.prepend(stage);
      this.sizeCanvas(stage, 64, 64);
    } else {
      el.className = `reveal r-${rarity}${item.golden ? ' r-golden' : ''}`;
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      el.setAttribute('aria-label', `New discovery: ${sp.name}`);
      fx = document.createElement('canvas');
      fx.className = 'rv-fx';
      const card = document.createElement('div');
      card.className = 'rv-card';
      card.style.setProperty('--tier', pipColor);
      card.style.setProperty('--hab', HABITAT_TINT[sp.habitat][this.d.night() ? 1 : 0]);
      card.innerHTML = `<div class="rv-over">${item.firstGolden ? 'Golden find' : 'New discovery'}</div>
        <div class="rv-pool"></div>
        <div class="rv-info">
          <div class="rv-name">${sp.name}</div>
          <div class="rv-rarity"><canvas class="rv-pips"></canvas><span>${item.golden ? 'Golden · ' : ''}${cap(sp.rarity)}</span></div>
          <div class="rv-facts">
            <div><b>${formatSize(item.size)}</b><span>Size</span></div>
            <div><b>${howLine(sp)}</b><span>How</span></div>
          </div>
          <div class="rv-journal"><span class="rv-stamp" aria-hidden="true">No.<b>${no}</b></span><span>Added to your Beach Journal</span></div>
        </div>
        <div class="rv-btns"></div>`;
      card.querySelector('.rv-pool')!.append(stage);
      const pips = card.querySelector('.rv-pips') as HTMLCanvasElement;
      this.sizeCanvas(pips, 92, 18);
      const pg = pips.getContext('2d')!;
      drawPips(pg, 46, 9, 5, RARITY_RANK[sp.rarity], pipColor, 'rgba(120,110,95,0.6)');
      const btns = card.querySelector('.rv-btns')!;
      const cont = button('Continue', 'btn primary', () => this.finish());
      const share = button('Share', 'btn ghost', () => void this.share(sp, item));
      btns.append(cont, share);
      el.append(fx, card);
      this.sizeCanvas(stage, 200, 168);
      // tap during the animation = skip to the settled card; tap outside the card = continue
      el.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        const a = this.cur;
        if (!a) return;
        if (!a.settled) a.start = this.now() - REVEAL_MS[rarity];
      });
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.finish();
      });
    }
    this.root.append(el);
    if (fx) this.sizeCanvas(fx, innerWidth, innerHeight);
    requestAnimationFrame(() => el.classList.add('show'));
    this.cur = { item, sp, start: this.now(), modal, el, stage, fx, settled: false, stamped: false };
    // keyboard users land on Continue; touch users get no focus ring (focus the dialog itself)
    if (modal && lastKey) (el.querySelector('.btn.primary') as HTMLElement | null)?.focus({ preventScroll: true });
    else if (modal) {
      el.tabIndex = -1;
      el.focus({ preventScroll: true });
    }
    this.d.announce(`New discovery: ${sp.name}, ${sp.rarity}. Added to your Beach Journal.`);
    // sound and touch: the chime when the pearl pops (commons at once)
    const pop = this.d.reducedMotion() ? 0 : POP_MS[rarity];
    setTimeout(() => {
      if (this.cur?.item !== item) return;
      this.d.sfx.reveal(item.firstGolden ? 'rare' : sp.rarity);
      this.d.haptics.fire(RARITY_RANK[sp.rarity] >= 4 ? 'heavy' : 'medium');
    }, pop);
    this.loop();
  }

  private sizeCanvas(c: HTMLCanvasElement, w: number, h: number): void {
    const dpr = Math.min(3, devicePixelRatio || 1);
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    c.style.width = `${w}px`;
    c.style.height = `${h}px`;
    c.getContext('2d')!.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private loop = (): void => {
    cancelAnimationFrame(this.raf);
    const a = this.cur;
    if (!a) return;
    this.draw(a, this.now() - a.start);
    this.raf = requestAnimationFrame(this.loop);
  };

  /** Render one frame of the current reveal at elapsed time t (ms). Public for frozen-clock tests. */
  draw(a: Active, t: number): void {
    const rm = this.d.reducedMotion();
    const rarity: Rarity = a.item.firstGolden ? 'rare' : a.sp.rarity;
    const total = REVEAL_MS[rarity];
    if (!a.modal) {
      this.drawStage(a, t, 64, 64, rm, 0);
      // the quick pop leaves by itself (no tap needed, no input blocked)
      if (t > total + 1100) this.finish();
      return;
    }
    const popAt = rm ? 0 : POP_MS[rarity];
    if (!a.settled && t >= total) {
      a.settled = true;
      a.el.classList.add('settled');
      // settled: the backdrop lets presses through; one outside the card closes the reveal
      addEventListener('pointerdown', this.outside, true);
    }
    if (t >= popAt + 120) a.el.classList.add('info');
    if (!a.stamped && t >= total - 160) {
      a.stamped = true;
      a.el.classList.add('stamped');
      this.d.sfx.place(2);
    }
    this.drawStage(a, t, 200, 168, rm, popAt);
    if (a.fx) this.drawFx(a, t, rm, popAt, total);
  }

  /** The pool: bubble-pearl (tinted by tier) → pop → the creature's little dance. */
  private drawStage(a: Active, t: number, w: number, h: number, rm: boolean, popAt: number): void {
    const g = a.stage.getContext('2d')!;
    g.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h * 0.55;
    const s = Math.min(w, h) * (a.modal ? 0.84 : 0.7);
    const tier = a.item.golden ? '#F2C14E' : RARITY_COLOR[a.sp.rarity];
    const night = this.d.night();
    type Expr = NonNullable<DrawOpts['expression']>;
    const opts = (expression: Expr, tt: number, signatureAt?: number): DrawOpts => ({
      golden: a.item.golden,
      expression,
      t: tt / 1000,
      night,
      still: rm,
      ...(signatureAt !== undefined ? { signatureAt } : {}),
    });
    if (t < popAt) {
      // the present: a translucent pearl with the silhouette inside, wobbling (more wobbles = rarer)
      const k = t / popAt;
      const wob = Math.sin(k * Math.PI * 2 * (RARITY_RANK[a.sp.rarity] - 1)) * 0.06 * (1 - k * 0.3);
      const squash = k > 0.85 ? 1 - (k - 0.85) * 1.2 : 1; // anticipation just before the pop
      const r = Math.min(w, h) * 0.44;
      g.save();
      g.translate(cx, cy);
      g.scale((1 + wob) / squash, (1 - wob) * squash);
      drawCreature(g, a.sp, 0, 0, r * 1.3, 0, { silhouette: shade(tier, -0.45) });
      const gr = g.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
      gr.addColorStop(0, 'rgba(255,255,255,0.75)');
      gr.addColorStop(0.55, hexA(tier, 0.28));
      gr.addColorStop(1, hexA(tier, 0.55));
      g.fillStyle = gr;
      g.beginPath();
      g.arc(0, 0, r, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.85)';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(-r * 0.15, -r * 0.15, r * 0.7, Math.PI * 1.1, Math.PI * 1.45);
      g.stroke();
      // legendary: light glows from inside and the pearl cracks
      if (a.sp.rarity === 'legendary' && k > 0.45) {
        const q = (k - 0.45) / 0.55;
        g.globalAlpha = q;
        g.strokeStyle = '#FFF4C2';
        g.lineWidth = 2.5;
        g.beginPath();
        g.moveTo(-r * 0.1, -r);
        g.lineTo(r * 0.05, -r * 0.5);
        g.lineTo(-r * 0.12, -r * 0.1);
        g.lineTo(r * 0.1, r * 0.3 * q);
        g.stroke();
        g.globalAlpha = 0.5 * q;
        g.fillStyle = '#FFF4C2';
        g.beginPath();
        g.arc(0, 0, r * 0.9, 0, Math.PI * 2);
        g.fill();
        g.globalAlpha = 1;
      }
      g.restore();
      return;
    }
    const u = t - popAt;
    // rare and up: soft rays turn behind the creature inside the pool
    const rank = RARITY_RANK[a.sp.rarity];
    if (a.modal && rank >= 3) {
      const k = rm ? 1 : Math.min(1, u / 350);
      const n = rank >= 5 ? 14 : rank >= 4 ? 10 : 8;
      g.save();
      g.translate(cx, cy);
      g.rotate(rm ? 0 : (u / 16000) * Math.PI * 2);
      for (let i = 0; i < n; i++) {
        g.rotate((Math.PI * 2) / n);
        const gr = g.createLinearGradient(0, 0, 0, -w * 0.55);
        gr.addColorStop(0, rank >= 5 ? `rgba(255,214,110,${0.55 * k})` : hexA(tier, 0.35 * k));
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr;
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(-w * 0.06, -w * 0.55);
        g.lineTo(w * 0.06, -w * 0.55);
        g.closePath();
        g.fill();
      }
      g.restore();
    }
    // pop: a foam ring and droplets fly off the pearl
    if (!rm && popAt > 0 && u < 420) {
      const k = u / 420;
      g.globalAlpha = 1 - k;
      g.strokeStyle = '#FFFFFF';
      g.lineWidth = 3 * (1 - k) + 1;
      g.beginPath();
      g.arc(cx, cy, s * (0.62 + k * 0.5), 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = hexA(tier, 0.9);
      for (let i = 0; i < 10; i++) {
        const ang = (i / 10) * Math.PI * 2 + 0.3;
        const d = s * (0.6 + k * 0.7);
        g.beginPath();
        g.arc(cx + Math.cos(ang) * d, cy + Math.sin(ang) * d - k * k * 8, 3.5 * (1 - k) + 1, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
    }
    // the dance (R30): spring out (stretch) looking surprised → its signature move once (new art)
    // or two little hops (legacy art) → happy, bobbing; rare and up end proud
    let sx = 1;
    let sy = 1;
    let dy = 0;
    let ang = 0;
    let expr: Expr = 'happy';
    let sig: number | undefined;
    if (!rm) {
      const out = spring(u, 360, 0.12);
      sx = 0.6 + 0.4 * out;
      sy = 0.6 + 0.4 * out + 0.12 * Math.max(0, 1 - u / 260);
      if (u < 420) expr = 'surprised';
      const hopT = u - 380;
      if (hasNewArt(a.sp.id)) {
        if (hopT > 0 && hopT < SIGNATURE_MS) sig = hopT / SIGNATURE_MS;
        else if (hopT >= SIGNATURE_MS) dy = Math.sin((hopT - SIGNATURE_MS) / 380) * s * 0.02;
      } else if (hopT > 0 && hopT < 560) {
        const ph = (hopT % 280) / 280;
        dy = -Math.sin(ph * Math.PI) * s * 0.14;
        const land = ph < 0.12 || ph > 0.88;
        sx *= land ? 1.08 : 0.96;
        sy *= land ? 0.92 : 1.05;
        ang = Math.sin(ph * Math.PI * 2) * 0.12;
      } else if (hopT >= 560) {
        dy = Math.sin((hopT - 560) / 380) * s * 0.025;
        ang = Math.sin((hopT - 560) / 520) * 0.05;
      }
      if (RARITY_RANK[a.sp.rarity] >= 3 && u > 1500) expr = 'proud';
    }
    g.save();
    g.translate(cx, cy + dy);
    g.rotate(ang);
    g.scale(sx, sy);
    drawCreature(g, a.sp, 0, 0, s, 0, opts(expr, u, sig));
    g.restore();
    if (a.item.golden && !rm) sparkles(g, cx, cy, s * 0.62, 5, u / 1000);
  }

  /** Behind the card: dim, rays (rare+), sparkles, and the full-screen tide (legendary). */
  private drawFx(a: Active, t: number, rm: boolean, popAt: number, total: number): void {
    const c = a.fx!;
    const g = c.getContext('2d')!;
    const W = innerWidth;
    const H = innerHeight;
    g.clearRect(0, 0, W, H);
    const rank = a.item.firstGolden ? 3 : RARITY_RANK[a.sp.rarity];
    const night = this.d.night();
    // scrim: epic and legendary dim the board more
    const dim = rank >= 4 ? 0.62 : 0.42;
    g.fillStyle = night ? `rgba(4,12,20,${dim})` : `rgba(43,35,28,${dim * 0.55})`;
    g.fillRect(0, 0, W, H);
    const pool = a.stage.getBoundingClientRect();
    const cx = pool.left + pool.width / 2;
    const cy = pool.top + pool.height * 0.55;
    // legendary: the tide rolls up the whole screen, then settles as deep water behind the card
    if (rank >= 5) {
      const k = rm ? 1 : Math.min(1, t / (popAt + 300));
      const top = H * (1 - 1.05 * easeOut(k));
      const gr = g.createLinearGradient(0, top, 0, H);
      gr.addColorStop(0, night ? 'rgba(47,184,216,0.55)' : 'rgba(92,200,224,0.7)');
      gr.addColorStop(1, night ? 'rgba(10,40,70,0.9)' : 'rgba(22,88,138,0.85)');
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(0, H);
      for (let i = 0; i <= 12; i++) g.lineTo((W * i) / 12, top + Math.sin(i * 0.9 + t / 180) * (rm ? 0 : 10));
      g.lineTo(W, H);
      g.closePath();
      g.fill();
      if (!rm && k < 1) {
        g.strokeStyle = 'rgba(255,255,255,0.8)';
        g.lineWidth = 4;
        g.beginPath();
        for (let i = 0; i <= 12; i++) g.lineTo((W * i) / 12, top + Math.sin(i * 0.9 + t / 180) * 10);
        g.stroke();
      }
    }
    // light rays fan open behind the creature (rare+); they turn slowly unless motion is reduced
    if (rank >= 3 && t >= popAt) {
      const k = rm ? 1 : Math.min(1, (t - popAt) / 400);
      const n = rank >= 5 ? 16 : rank >= 4 ? 12 : 8;
      const len = Math.max(W, H) * (rank >= 5 ? 0.75 : 0.5) * (0.4 + 0.6 * easeOut(k));
      g.save();
      g.translate(cx, cy);
      g.rotate(rm ? 0 : (t / 20000) * Math.PI * 2);
      for (let i = 0; i < n; i++) {
        g.rotate((Math.PI * 2) / n);
        const gr = g.createLinearGradient(0, 0, 0, -len);
        gr.addColorStop(0, rank >= 5 ? `rgba(255,228,140,${0.5 * k})` : `rgba(255,255,255,${0.42 * k})`);
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr;
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(-len * 0.09, -len);
        g.lineTo(len * 0.09, -len);
        g.closePath();
        g.fill();
      }
      g.restore();
    }
    // sparkles drift around the card (rare+)
    if (rank >= 3 && t >= popAt && !rm) sparkles(g, cx, cy, Math.min(W, 420) * 0.48, rank >= 5 ? 12 : 7, t / 1000);
    void total;
  }

  private async share(sp: Species, item: RevealItem): Promise<void> {
    await document.fonts?.ready;
    const c = renderShareCard(sp, { golden: item.golden, date: this.d.date() });
    const how = await shareCanvas(c, `lagooner-beach-${sp.id}.png`, `I found a ${sp.name} on Lagooner Beach!`);
    this.d.announce(how === 'downloaded' ? 'Saved the picture' : how === 'shared' ? 'Shared' : 'Could not share');
  }

  private outside = (e: PointerEvent): void => {
    const a = this.cur;
    if (!a?.settled) return;
    const card = a.el.querySelector('.rv-card');
    if (card && !card.contains(e.target as Node)) this.finish();
  };

  private finish(immediate = false): void {
    const a = this.cur;
    if (!a) return;
    this.cur = null;
    removeEventListener('pointerdown', this.outside, true);
    cancelAnimationFrame(this.raf);
    a.el.classList.remove('show');
    a.el.classList.add('leaving');
    if (immediate) a.el.remove();
    else setTimeout(() => a.el.remove(), 200);
    this.pump();
  }

  /** Debug/test: freeze the current reveal at elapsed t (ms) and render that frame. */
  freeze(t: number): boolean {
    const a = this.cur;
    if (!a) return false;
    cancelAnimationFrame(this.raf);
    a.start = this.now() - t;
    this.draw(a, t);
    return true;
  }

  /** Debug/test: what's showing. */
  current(): { id: string; modal: boolean; settled: boolean } | null {
    const a = this.cur;
    return a ? { id: a.sp.id, modal: a.modal, settled: a.settled } : null;
  }

  /** Debug/test: close whatever is showing. */
  skip(): void {
    this.finish();
  }
}

function button(label: string, cls: string, fn: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.className = cls;
  b.textContent = label;
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    fn();
  });
  return b;
}

const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);
const easeOut = (k: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);

function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * (1 + amt))));
  return `rgb(${ch((n >> 16) & 255)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}
