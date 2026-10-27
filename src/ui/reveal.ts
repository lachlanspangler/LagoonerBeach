/**
 * Discovery reveal (ADR 0012, CREATURE_ART R29/R30, UI_DESIGN §6.8): the first catch of a species
 * is a little present. Shown after the capture has settled (never mid-capture), one at a time,
 * rarest last. Scaled by rarity:
 *   common     quick card pop at the top of the board + chime (≤ 0.8 s, never blocks input)
 *   uncommon   bubble-pearl → pop → creature card (name in display type), ring wave, tier vignette
 *   rare       + light rays in the tier colour (radial falloff) + sparkles
 *   epic       a scene: coin pulses → the creature enters large → the card slides in, name stamps
 *   legendary  + ~1.2 s gold anticipation, deep tide, fanfare (settled ≤ 2.5 s)
 * The card shows creature, name, rarity and No.; size and how live on the journal species page.
 * Any tap during the animation skips to the settled card; Continue (or a tap outside) closes it.
 * The creature does a little dance (surprised → happy). Share renders a 4:5 card (share-card.ts).
 * Reduced motion: no rays/tide motion, no hops — the same information.
 */
import { SPECIES, SPECIES_BY_ID, type Rarity, type Species } from '../meta/creatures.ts';
import {
  artGoldenKindOf,
  artSizeOf,
  artTileScaleOf,
  drawCreature,
  hasNewArt,
  type DrawOpts,
} from '../render/creatures.ts';
import { spring } from '../render/celebrate.ts';
import './tiles.css';
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
  /** The player's beach name for the share card, if they chose one. */
  playerName?: () => string | undefined;
  /** A common pop takes the strip between board and tray for `ms` (chips wait for it). */
  onStrip?: (ms: number) => void;
}

/** A press this soon after a modal card is first painted was aimed at the board: it's swallowed. */
export const REVEAL_GRACE_MS = 250;

/** How long the common pop stays settled before it leaves by itself (ms after REVEAL_MS). */
export const POP_HOLD_MS = 600;

/** Settled time per rarity (ms): the reveal is skippable at any point before. */
export const REVEAL_MS: Record<Rarity, number> = {
  common: 800,
  uncommon: 900,
  rare: 1150,
  // CRITIQUE-4: scene tiers settle as the creature lands in its pool (chrome + handoff + 30 ms);
  // they waited ~0.4 s more on a dimmed Continue that read disabled (were 1800 / 2500)
  epic: 1500,
  legendary: 2100,
};
/** The species' signature move, played once in the reveal (new art). */
const SIGNATURE_MS = 950;
/** When the bubble-pearl pops (ms). */
const POP_MS: Record<Rarity, number> = { common: 0, uncommon: 300, rare: 480, epic: 700, legendary: 1200 };
/**
 * Epic and legendary are a *scene*, not a card (session-3 UX review): a pulsing coin with the
 * silhouette while the light builds (legendary ≈ 1.2 s), then the creature enters large over the
 * whole screen, and only then does the card chrome slide in and the creature settles into its pool.
 */
const CHROME_MS: Partial<Record<Rarity, number>> = { epic: 1150, legendary: 1750 };
/** The big creature moves into the card's pool over this long once the chrome slides in (ms). */
const HANDOFF_MS = 320;
/** The pool (CSS px) the creature sits in, and the bigger stage canvas around it (big ones break out). */
const POOL_W = 200;
const POOL_H = 168;
const STAGE = 300;
/** Stage offset: the pool's creature centre (POOL_W/2, POOL_H·0.55) is the stage centre. */
const STAGE_X = STAGE / 2 - POOL_W / 2;
const STAGE_Y = STAGE / 2 - POOL_H * 0.55;
export { REVEAL_SCALE, REVEAL_SCALE_MAX, revealScaleOf } from './revealScale.ts';
import { revealScaleOf } from './revealScale.ts';
/** Art critique round 5: a non-legendary present is at least this tall on the card (CSS px). */
// measured once at rest on a 1x scratch (antialiasing, the idle bob): lands ≥ 130 on screen
export const REVEAL_MIN_ART_PX = 134;
/** ...but never wider than this (CSS px; the stage canvas is STAGE wide, the card ~340). */
const REVEAL_MAX_ART_W = 250;
/** How far a legendary breaks the card top (CSS px). */
export const REVEAL_BREAK_PX = 10;
/** The most a legendary is drawn off its pool's centre to break the card top by REVEAL_BREAK_PX (CSS px). */
export const REVEAL_LIFT_MAX = 28;
/** After the happy/proud beat the creature settles on its eyes-open idle face, with one blink. */
const BEAT_END_MS = 1500;
const PROUD_MS = 650;
const BLINK_AT_MS = 420;
const BLINK_MS = 140;
/** The end of the happy (and, rare+, proud) beat, ms after the pop. */
export function beatEnd(rank: number): number {
  return BEAT_END_MS + (rank >= 3 ? PROUD_MS : 0);
}
/** Every reveal is eyes-open idle from this reveal time on (ms; its one blink comes 420 ms later). */
export const IDLE_BY_MS = 1900;
/** Epic/legendary: the proud beat's length before the card settles. */
const SCENE_PROUD_MS = 350;
/**
 * Epic/legendary: the beat ends (eyes open) when the creature lands in its pool, ms after the pop.
 * CRITIQUE-4: ending it at the settle left kraken/seadragon/whaleshark eyes-closed `happy` in the
 * card for most of its landing (2.1 s); now the card arrives with the creature already awake.
 */
export function sceneBeatEnd(rarity: Rarity): number {
  const chrome = CHROME_MS[rarity];
  return chrome === undefined ? REVEAL_MS[rarity] - POP_MS[rarity] : chrome + HANDOFF_MS - POP_MS[rarity];
}

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
  /** The clock was set explicitly (skip/freeze): the first-paint restart leaves it alone. */
  clocked?: boolean;
  /** Modal card vs the quick common pop. */
  modal: boolean;
  el: HTMLElement;
  stage: HTMLCanvasElement;
  fx: HTMLCanvasElement | null;
  /** Epic/legendary: the full-screen canvas the coin and the big creature are drawn on (sharp). */
  hero: HTMLCanvasElement | null;
  /** Epic/legendary: when the card chrome slides in (ms); 0 = from the start. */
  chromeAt: number;
  heroDone?: boolean;
  settled: boolean;
  stamped: boolean;
  /** The press that skipped the animation: its click must not land on the buttons it reveals. */
  swallow: boolean;
  /**
   * performance.now() of the first-paint frame (the grace window starts when the card is on screen,
   * not when open() began building it); unset until then.
   */
  shownAt?: number;
  /**
   * Reveal time (ms, the `t` drawn) of the last fx-canvas draw: once settled the backdrop redraws at
   * ~15 fps (or once, reduced motion). Reveal time, not the wall clock: a frozen frame (`freeze`)
   * always paints its own backdrop (CRITIQUE-3: a kraken frame at 2500 ms showed no rays).
   */
  fxAt: number;
  /** The pool creature's expression in the last frame (tests: every reveal ends on `idle`). */
  expr?: string;
  /** CSS px the pool creature is drawn above the pool centre (a legendary breaking the card top). */
  lift?: number;
  /** Modal: the present's scale (size class × tileScale, capped; floored to REVEAL_MIN_ART_PX tall). */
  big?: number;
  /** Elements made inert while the dialog is up (restored on close), and where focus was. */
  inerted: Element[];
  returnTo: HTMLElement | null;
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
    let hero: HTMLCanvasElement | null = null;
    const no = SPECIES.indexOf(sp) + 1;
    const pipColor = item.golden ? '#C9922B' : RARITY_COLOR[sp.rarity];
    if (!modal) {
      el.className = 'reveal-pop';
      el.setAttribute('aria-hidden', 'true'); // announced once, by the live region
      el.innerHTML = `<div class="rp-text"><div class="rp-over">New in your journal</div><div class="rp-name">${sp.name}</div></div>`;
      stage.className = 'rp-stage';
      el.prepend(stage);
      this.sizeCanvas(stage, 48, 48);
      this.d.onStrip?.(REVEAL_MS[rarity] + POP_HOLD_MS + 200);
    } else {
      const scene = !this.d.reducedMotion() && CHROME_MS[rarity] !== undefined;
      el.className = `reveal r-${rarity}${item.golden ? ' r-golden' : ''}${scene ? ' r-scene' : ''}`;
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      // announced once: the dialog's name is the whole sentence (no live-region repeat)
      el.setAttribute('aria-label', `New discovery: ${sp.name}, ${sp.rarity}. Added to your Beach Journal.`);
      fx = document.createElement('canvas');
      fx.className = 'rv-fx';
      const card = document.createElement('div');
      card.className = 'rv-card';
      card.style.setProperty('--tier', pipColor);
      card.style.setProperty('--hab', HABITAT_TINT[sp.habitat][this.d.night() ? 1 : 0]);
      card.innerHTML = `<div class="rv-over">${item.firstGolden ? 'Golden find' : 'New discovery'}</div>
        <div class="rv-pool"></div>
        <div class="rv-rarity"><canvas class="rv-pips"></canvas><span>${item.golden ? 'Golden · ' : ''}${cap(sp.rarity)}</span></div>
        <div class="rv-lower"><div class="rv-ph" aria-hidden="true"><i class="n"></i><i class="j"></i></div>
        <div class="rv-info">
          <div class="rv-name${sp.name.length > 13 ? ' rv-long' : ''}">${sp.name}</div>
          <div class="rv-journal"><span class="rv-stamp" aria-hidden="true">No.<b>${no}</b></span><span>Added to your Beach Journal</span></div>
        </div></div>
        <div class="rv-btns"></div>`;
      card.querySelector('.rv-pool')!.append(stage);
      const pips = card.querySelector('.rv-pips') as HTMLCanvasElement;
      this.sizeCanvas(pips, 92, 18);
      const pg = pips.getContext('2d')!;
      drawPips(pg, 46, 9, 5, RARITY_RANK[sp.rarity], pipColor, 'rgba(120,110,95,0.6)');
      const btns = card.querySelector('.rv-btns')!;
      // the buttons only act once the card has settled (they're hidden and inert until then)
      const cont = button('Continue', 'btn primary', () => this.cur?.settled && this.finish());
      const share = button('Share', 'btn ghost', () => this.cur?.settled && void this.share(sp, item));
      btns.append(cont, share);
      // epic/legendary show them (dimmed) before they act: say so to assistive tech until settled
      for (const b of [cont, share]) b.setAttribute('aria-disabled', 'true');
      el.append(fx, card);
      if (scene) {
        hero = document.createElement('canvas');
        hero.className = 'rv-fx rv-hero';
        el.append(hero);
      }
      this.sizeCanvas(stage, STAGE, STAGE);
      stage.style.left = `${-STAGE_X}px`;
      stage.style.top = `${-STAGE_Y}px`;
      // tap during the animation = skip to the settled card; tap outside the card = continue
      el.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        const a = this.cur;
        if (!a) return;
        a.swallow = false;
        if (!a.settled) {
          this.skipToSettled(a);
          a.swallow = true;
        }
      });
      // the click that ends a skipping press never presses a button the skip just revealed
      el.addEventListener(
        'click',
        (e) => {
          const a = this.cur;
          if (a?.swallow) {
            a.swallow = false;
            e.stopPropagation();
            e.preventDefault();
          }
        },
        true,
      );
      el.addEventListener('keydown', (e) => this.key(e));
    }
    const returnTo = modal && document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.root.append(el);
    const inerted = modal ? inertOthers(el) : [];
    if (hero) this.sizeCanvas(hero, innerWidth, innerHeight, 2);
    if (fx) {
      this.sizeCanvas(fx, innerWidth, innerHeight, 1);
      addEventListener('resize', this.resize);
    }
    requestAnimationFrame(() => {
      el.classList.add('show');
      // the clock starts when the reveal is first on screen (a slow first paint, e.g. under load,
      // must not eat the animation), unless a skip/freeze already set it
      const c = this.cur;
      if (c && c.el === el && !c.clocked) c.start = this.now();
      if (c && c.el === el) c.shownAt = performance.now();
    });
    this.cur = {
      item,
      sp,
      start: this.now(),
      modal,
      el,
      stage,
      fx,
      hero,
      chromeAt: hero ? CHROME_MS[rarity]! : 0,
      settled: false,
      stamped: false,
      swallow: false,
      fxAt: -Infinity,
      inerted,
      returnTo,
    };
    if (modal) this.cur.big = this.presentScale(this.cur);
    if (modal) this.frameBreak(this.cur);
    // focus the dialog itself (no ring); keyboard users move to Continue once it's there to press
    if (modal) {
      el.tabIndex = -1;
      el.focus({ preventScroll: true });
    }
    // one announcement: the modal's dialog name is read on focus; the quick pop uses the live region
    if (!modal) this.d.announce(`New discovery: ${sp.name}, ${sp.rarity}. Added to your Beach Journal.`);
    // sound and touch: the chime when the pearl pops (commons at once)
    const pop = this.d.reducedMotion() ? 0 : POP_MS[rarity];
    setTimeout(() => {
      if (this.cur?.item !== item) return;
      this.d.sfx.reveal(item.firstGolden ? 'rare' : sp.rarity);
      this.d.haptics.fire(RARITY_RANK[sp.rarity] >= 4 ? 'heavy' : 'medium');
    }, pop);
    this.loop();
  }

  /**
   * CRITIQUE-2 NEW 5: a legendary breaks the card top by ~10 px. Measures the creature's resting
   * top once (a scratch render) and draws the creature that much higher in its stage canvas.
   * CRITIQUE-4: the layout never moves (it used to pull the pool up and hide the "New discovery"
   * overline, so XL legendary cards were shorter and lost their label): every legendary card has
   * the same art box (pulled up 36 px in CSS) and height; the shift is capped at `REVEAL_LIFT_MAX`.
   */
  private frameBreak(a: Active): void {
    const cls = artSizeOf(a.sp.id);
    if (a.sp.rarity !== 'legendary' || !cls) return;
    const pool = a.stage.parentElement;
    const card = pool?.parentElement;
    if (!pool || !card) return;
    card.classList.add('rv-break');
    const c = document.createElement('canvas');
    c.width = c.height = STAGE;
    const g = c.getContext('2d', { willReadFrequently: true })!;
    const s = Math.min(POOL_W, POOL_H) * 0.84 * revealScaleOf(cls, artTileScaleOf(a.sp.id));
    drawCreature(g, a.sp, STAGE / 2, STAGE / 2, s, 0, { expression: 'idle', night: this.d.night() });
    const d = g.getImageData(0, 0, STAGE, STAGE).data;
    let top = -1;
    for (let i = 3; i < d.length && top < 0; i += 4) if (d[i]! > 40) top = Math.floor(i / 4 / STAGE);
    if (top < 0) return;
    // the creature's top sits (STAGE/2 - top) above the pool's centre line (POOL_H·0.55), i.e. at
    // `natural` px below the card's top edge (offsetTop ignores the entrance scale). Every legendary
    // is drawn so it breaks the edge by REVEAL_BREAK_PX (CRITIQUE-4: one shape for the tier; the
    // seadragon used to sit low in a taller card)
    const topInPool = POOL_H * 0.55 - (STAGE / 2 - top);
    const natural = pool.offsetTop + topInPool;
    const want = natural + REVEAL_BREAK_PX;
    const lift = Math.max(-REVEAL_LIFT_MAX, Math.min(REVEAL_LIFT_MAX, want));
    if (Math.abs(lift) < 0.5) return;
    a.lift = lift;
    a.stage.style.top = `${-STAGE_Y - lift}px`;
  }

  /**
   * Art critique round 5: the present's scale on the card. Size class × tileScale (capped, see
   * revealScaleOf), but a non-legendary is never shorter than REVEAL_MIN_ART_PX (a golden S seahorse
   * was ~75 px tall on a ~340 px card): one scratch render measures its resting height.
   */
  private presentScale(a: Active): number {
    const cls = artSizeOf(a.sp.id);
    const base = cls ? revealScaleOf(cls, artTileScaleOf(a.sp.id)) : 1;
    if (a.sp.rarity === 'legendary') return base;
    const c = document.createElement('canvas');
    c.width = c.height = STAGE;
    const g = c.getContext('2d', { willReadFrequently: true })!;
    const s = Math.min(POOL_W, POOL_H) * 0.84;
    g.translate(STAGE / 2, STAGE / 2);
    g.scale(base, base);
    drawCreature(g, a.sp, 0, 0, s, 0, { expression: 'idle', night: this.d.night(), golden: a.item.golden });
    const d = g.getImageData(0, 0, STAGE, STAGE).data;
    let top = -1;
    let bottom = -1;
    let left = STAGE;
    let right = -1;
    for (let i = 3; i < d.length; i += 4)
      if (d[i]! > 40) {
        const p = (i - 3) / 4;
        const x = p % STAGE;
        const y = (p - x) / STAGE;
        if (top < 0) top = y;
        bottom = y;
        left = Math.min(left, x);
        right = Math.max(right, x);
      }
    if (top < 0) return base;
    const tall = bottom - top + 1;
    const wide = right - left + 1;
    if (tall >= REVEAL_MIN_ART_PX) return base;
    // a long, low species (sand eel) grows only as far as the stage allows
    return base * Math.max(1, Math.min(REVEAL_MIN_ART_PX / tall, REVEAL_MAX_ART_W / wide));
  }

  /** Skip the animation: draw the settled card now. */
  private skipToSettled(a: Active): void {
    const rarity: Rarity = a.item.firstGolden ? 'rare' : a.sp.rarity;
    a.clocked = true;
    a.start = Math.min(a.start, this.now() - REVEAL_MS[rarity]);
    this.draw(a, this.now() - a.start);
  }

  /** Keyboard: Esc closes; Enter/Space skip the animation; Tab stays inside the dialog. */
  private key(e: KeyboardEvent): void {
    const a = this.cur;
    if (!a?.modal) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      this.finish();
    } else if (!a.settled && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      this.skipToSettled(a);
    } else if (e.key === 'Tab') {
      const btns = a.settled ? [...a.el.querySelectorAll<HTMLElement>('.rv-btns .btn')] : [];
      e.preventDefault();
      if (!btns.length) return a.el.focus({ preventScroll: true });
      const i = btns.indexOf(document.activeElement as HTMLElement);
      const n = i < 0 ? (e.shiftKey ? btns.length - 1 : 0) : (i + (e.shiftKey ? -1 : 1) + btns.length) % btns.length;
      btns[n]!.focus({ preventScroll: true });
    }
  }

  private resize = (): void => {
    const a = this.cur;
    if (!a?.fx) return;
    this.sizeCanvas(a.fx, innerWidth, innerHeight, 1);
    if (a.hero) this.sizeCanvas(a.hero, innerWidth, innerHeight, 2);
    a.heroDone = false;
    a.fxAt = -Infinity;
    this.draw(a, this.now() - a.start);
  };

  /** `cap`: max device pixel ratio (the full-screen fx canvas is soft gradients: 1 is plenty). */
  private sizeCanvas(c: HTMLCanvasElement, w: number, h: number, cap = 3): void {
    const dpr = Math.min(cap, devicePixelRatio || 1);
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
    // schedule first: one bad frame must never stop the backdrop (it would sit on a stale canvas)
    this.raf = requestAnimationFrame(this.loop);
    this.draw(a, this.now() - a.start);
  };

  /** Render one frame of the current reveal at elapsed time t (ms). Public for frozen-clock tests. */
  draw(a: Active, t: number): void {
    const rm = this.d.reducedMotion();
    const rarity: Rarity = a.item.firstGolden ? 'rare' : a.sp.rarity;
    const total = REVEAL_MS[rarity];
    if (!a.modal) {
      this.drawStage(a, t, 48, 48, rm, 0);
      // the quick pop leaves by itself (no tap needed, no input blocked)
      if (t > total + POP_HOLD_MS) this.finish();
      return;
    }
    const popAt = rm ? 0 : POP_MS[rarity];
    // reduced motion: nothing animates, so the card is settled at once (never blocks the board)
    const settleAt = rm ? 0 : total;
    let settledNow = false;
    if (!a.settled && t >= settleAt) {
      a.settled = settledNow = true;
      a.el.classList.add('settled', 'info');
      for (const b of a.el.querySelectorAll('.rv-btns .btn')) b.removeAttribute('aria-disabled');
      // settled: the backdrop lets presses through; one outside the card closes the reveal
      addEventListener('pointerdown', this.outside, true);
      // keyboard users land on Continue now that it can be pressed
      if (lastKey && a.el.contains(document.activeElement)) {
        (a.el.querySelector('.btn.primary') as HTMLElement | null)?.focus({ preventScroll: true });
      }
    }
    if (a.hero && t >= a.chromeAt) a.el.classList.add('chrome');
    // the name stamps in once the card is there (scene tiers), else just after the pop
    if (t >= (a.hero ? a.chromeAt + 200 : popAt + 120)) a.el.classList.add('info');
    if (!a.stamped && t >= settleAt - 160) {
      a.stamped = true;
      a.el.classList.add('stamped');
      this.d.sfx.place(2);
    }
    this.drawStage(a, t, POOL_W, POOL_H, rm, popAt);
    if (a.hero) this.drawHero(a, t, rm, popAt);
    // the backdrop: every frame while it moves; once settled ~15 fps (rays turn slowly), once if still
    if (a.fx) {
      // reduced motion: still, but repainted for the first 400 ms so the light centres on the laid-out card
      const due = !a.settled || settledNow || a.fxAt === -Infinity || (rm ? a.fxAt < 400 : Math.abs(t - a.fxAt) >= 66);
      if (due) {
        a.fxAt = t;
        this.drawFx(a, t, rm, popAt, total);
      }
    }
  }

  /** The pool: bubble-pearl (tinted by tier) → pop → the creature's little dance. */
  private drawStage(a: Active, t: number, w: number, h: number, rm: boolean, popAt: number): void {
    const g = a.stage.getContext('2d')!;
    g.save();
    if (a.modal) {
      g.clearRect(0, 0, STAGE, STAGE);
      g.translate(STAGE_X, STAGE_Y); // pool coordinates; the stage around it lets big ones break out
    } else g.clearRect(0, 0, w, h);
    this.drawPool(g, a, t, w, h, rm, popAt);
    g.restore();
  }

  private drawPool(
    g: CanvasRenderingContext2D,
    a: Active,
    t: number,
    w: number,
    h: number,
    rm: boolean,
    popAt: number,
  ): void {
    // epic/legendary: the creature is on the hero canvas until it lands in the pool
    if (a.hero && t < a.chromeAt + HANDOFF_MS) return;
    const cx = w / 2;
    const cy = h * 0.55;
    const s = Math.min(w, h) * (a.modal ? 0.84 : 0.7);
    // the creature (not the pearl) is scaled by its size class in the modal card (presentScale)
    const big = a.modal ? (a.big ?? 1) : 1;
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
    // reduced motion: the same information, eyes open (no beat to end)
    let expr: Expr = rm ? 'idle' : 'happy';
    let sig: number | undefined;
    if (!rm) {
      const out = spring(u, 360, 0.12);
      sx = 0.6 + 0.4 * out;
      sy = 0.6 + 0.4 * out + 0.12 * Math.max(0, 1 - u / 260);
      if (u < 420) expr = 'surprised';
      const hopT = u - 380;
      if (hasNewArt(a.sp.id)) {
        const sd = this.signatureMs(a);
        if (hopT > 0 && hopT < sd) sig = hopT / sd;
        else if (hopT >= sd) dy = Math.sin((hopT - sd) / 380) * s * 0.02;
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
      const rank = RARITY_RANK[a.sp.rarity];
      // the beat ends: eyes open, one blink, then the idle loop (never an eyes-closed last frame).
      // Scene tiers (epic/legendary) land late, so their beat ends when the card settles: the card
      // waiting for Continue shows the creature eyes-open (CRITIQUE-3: the seadragon sat on `happy`).
      // Art critique round 5: every reveal is eyes-open `idle` by 2.1 s (a rare golden seahorse
      // was still on its closed-eyed proud beat): the pool beat ends by IDLE_BY_MS at the latest
      const end = a.hero
        ? sceneBeatEnd(a.item.firstGolden ? 'rare' : a.sp.rarity)
        : Math.min(beatEnd(rank), IDLE_BY_MS - popAt);
      if (rank >= 3 && u > Math.min(BEAT_END_MS, end - SCENE_PROUD_MS)) expr = 'proud';
      if (u >= end) expr = u - end >= BLINK_AT_MS && u - end < BLINK_AT_MS + BLINK_MS ? 'blink' : 'idle';
    }
    if (a.modal) a.expr = expr;
    withFinish(
      g,
      a.item.golden && (artGoldenKindOf(a.sp.id) === 'pearl' ? 'pearl' : true),
      u,
      rm,
      cx,
      cy + dy,
      s * big,
      (gg) => {
        gg.save();
        gg.translate(cx, cy + dy);
        gg.rotate(ang);
        gg.scale(sx * big, sy * big);
        drawCreature(gg, a.sp, 0, 0, s, 0, opts(expr, u, sig));
        gg.restore();
      },
    );
    if (a.item.golden && !rm) sparkles(g, cx, cy, s * 0.62, 5, u / 1000);
  }

  /**
   * Behind the card: dim; uncommon gets a soft tier-tinted vignette; rare+ rays in the tier colour
   * (gold legendary, purple epic) with a soft radial falloff; legendary a deep tide rolls up while
   * the light builds. Epic/legendary rays centre on the big creature, then follow it into the pool.
   */
  private drawFx(a: Active, t: number, rm: boolean, popAt: number, total: number): void {
    const c = a.fx!;
    const g = c.getContext('2d')!;
    const W = innerWidth;
    const H = innerHeight;
    g.clearRect(0, 0, W, H);
    const rank = a.item.firstGolden ? 3 : RARITY_RANK[a.sp.rarity];
    const col = a.item.golden ? '#F2C14E' : RARITY_COLOR[a.sp.rarity];
    const night = this.d.night();
    // scrim: epic and legendary dim the board more (a scene, not a card)
    const dim = rank >= 5 ? 0.72 : rank >= 4 ? 0.64 : 0.42;
    g.fillStyle = night ? `rgba(4,12,20,${dim})` : `rgba(43,35,28,${dim * (rank >= 4 ? 0.8 : 0.55)})`;
    g.fillRect(0, 0, W, H);
    const { x: cx, y: cy } = this.lightCentre(a, t, W, H);
    // legendary: a deep tide rolls up the whole screen while the light builds
    if (rank >= 5) {
      const k = rm ? 1 : Math.min(1, t / (popAt + 300));
      const top = H * (1 - 1.05 * easeOut(k));
      const gr = g.createLinearGradient(0, top, 0, H);
      gr.addColorStop(0, night ? 'rgba(24,70,92,0.55)' : 'rgba(30,78,96,0.5)');
      gr.addColorStop(1, night ? 'rgba(4,14,24,0.9)' : 'rgba(10,30,44,0.82)');
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(0, H);
      for (let i = 0; i <= 12; i++) g.lineTo((W * i) / 12, top + Math.sin(i * 0.9 + t / 180) * (rm ? 0 : 10));
      g.lineTo(W, H);
      g.closePath();
      g.fill();
      if (!rm && k < 1) {
        g.strokeStyle = 'rgba(255,255,255,0.35)';
        g.lineWidth = 3;
        g.beginPath();
        for (let i = 0; i <= 12; i++) g.lineTo((W * i) / 12, top + Math.sin(i * 0.9 + t / 180) * 10);
        g.stroke();
      }
    }
    // uncommon: a soft vignette in the tier colour (common toast → uncommon card → epic+ scene)
    if (rank === 2) {
      const vg = g.createRadialGradient(cx, cy, Math.min(W, H) * 0.28, cx, cy, Math.max(W, H) * 0.72);
      vg.addColorStop(0, hexA(col, 0));
      vg.addColorStop(1, hexA(col, night ? 0.3 : 0.38));
      g.fillStyle = vg;
      g.fillRect(0, 0, W, H);
    }
    // the light: builds before the pop on epic/legendary, fans out as rays from the pop (rare+)
    const lightFrom = a.hero ? popAt * 0.35 : popAt;
    if (rank >= 3 && t >= lightFrom) {
      const build = a.hero && t < popAt ? (t - lightFrom) / (popAt - lightFrom) : 1;
      const k = rm ? 1 : Math.min(1, (t - popAt) / 400);
      const kk = a.hero ? Math.max(0.35 * easeOut(build), t >= popAt ? 0.35 + 0.65 * k : 0) : k;
      const len = Math.max(W, H) * (rank >= 5 ? 0.8 : rank >= 4 ? 0.7 : 0.5) * (0.4 + 0.6 * easeOut(kk));
      // a soft glow under the rays
      const glow = g.createRadialGradient(cx, cy, 0, cx, cy, len * 0.55);
      glow.addColorStop(0, hexA(col, (rank >= 4 ? 0.55 : 0.35) * kk));
      glow.addColorStop(1, hexA(col, 0));
      g.fillStyle = glow;
      g.fillRect(0, 0, W, H);
      const n = rank >= 5 ? 16 : rank >= 4 ? 12 : 8;
      g.save();
      g.translate(cx, cy);
      g.rotate(rm ? 0 : (t / 20000) * Math.PI * 2);
      // one radial gradient for every ray: bright at the centre, gone at the tips
      const rg = g.createRadialGradient(0, 0, 0, 0, 0, len);
      rg.addColorStop(0, hexA(col, 0.6 * kk));
      rg.addColorStop(0.3, hexA(col, 0.3 * kk));
      rg.addColorStop(0.65, hexA(col, 0.08 * kk));
      rg.addColorStop(1, hexA(col, 0));
      g.fillStyle = rg;
      g.beginPath();
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2;
        const hw = (Math.PI / n) * 0.42;
        g.moveTo(0, 0);
        g.lineTo(Math.cos(a0 - hw) * len, Math.sin(a0 - hw) * len);
        g.lineTo(Math.cos(a0 + hw) * len, Math.sin(a0 + hw) * len);
        g.closePath();
      }
      g.fill();
      g.restore();
    }
    // sparkles drift around the card (rare+)
    if (rank >= 3 && t >= popAt && !rm) sparkles(g, cx, cy, Math.min(W, 420) * 0.48, rank >= 5 ? 12 : 7, t / 1000);
    void total;
  }

  /** Where the light comes from: the big creature (epic/legendary), following it into the pool. */
  private lightCentre(a: Active, t: number, W: number, H: number): { x: number; y: number } {
    const pool = (a.stage.parentElement ?? a.stage).getBoundingClientRect();
    const px = pool.left + pool.width / 2;
    const py = pool.top + pool.height * 0.55;
    if (!a.hero) return { x: px, y: py };
    const h = easeInOut(Math.min(1, Math.max(0, (t - a.chromeAt) / HANDOFF_MS)));
    return { x: W / 2 + (px - W / 2) * h, y: H * 0.42 + (py - H * 0.42) * h };
  }

  /**
   * Epic/legendary on the full-screen hero canvas: the coin with the silhouette pulses while the
   * light builds; at the pop the creature enters large, then moves into the card's pool as the
   * chrome slides in (the pool's own creature takes over when it arrives).
   */
  private drawHero(a: Active, t: number, rm: boolean, popAt: number): void {
    const c = a.hero!;
    const g = c.getContext('2d')!;
    const W = innerWidth;
    const H = innerHeight;
    const end = a.chromeAt + HANDOFF_MS;
    if (t >= end) {
      if (!a.heroDone) {
        g.clearRect(0, 0, W, H);
        a.heroDone = true;
      }
      return;
    }
    a.heroDone = false;
    g.clearRect(0, 0, W, H);
    const tier = a.item.golden ? '#F2C14E' : RARITY_COLOR[a.sp.rarity];
    const legend = a.sp.rarity === 'legendary';
    const cx = W / 2;
    const cy = H * 0.42;
    const night = this.d.night();
    if (t < popAt) {
      // the coin: pulses (harder as the light builds), squashes just before it bursts
      const k = t / popAt;
      const beat = Math.max(0, Math.sin((t / 420) * Math.PI * 2));
      const pulse = 1 + (0.03 + 0.07 * k) * beat;
      const squash = k > 0.9 ? 1 - (k - 0.9) * 1.5 : 1;
      const r = Math.min(W, H) * 0.15 * pulse * Math.min(1, 0.6 + t / 300);
      g.save();
      g.translate(cx, cy);
      g.scale(1 / squash, squash);
      const face = legend ? ['#FFF4C2', '#F2C14E', '#B9821F'] : [shade(tier, 0.6), tier, shade(tier, -0.35)];
      const gr = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
      gr.addColorStop(0, face[0]!);
      gr.addColorStop(0.6, face[1]!);
      gr.addColorStop(1, face[2]!);
      g.fillStyle = gr;
      g.beginPath();
      g.arc(0, 0, r, 0, Math.PI * 2);
      g.fill();
      g.lineWidth = r * 0.07;
      g.strokeStyle = shade(tier, -0.4);
      g.stroke();
      g.lineWidth = r * 0.03;
      g.strokeStyle = 'rgba(255,255,255,0.7)';
      g.beginPath();
      g.arc(0, 0, r * 0.82, 0, Math.PI * 2);
      g.stroke();
      drawCreature(g, a.sp, 0, 0, r * 1.25, 0, { silhouette: shade(tier, -0.55) });
      // a glint crosses the coin on every beat
      g.save();
      g.beginPath();
      g.arc(0, 0, r, 0, Math.PI * 2);
      g.clip();
      const gx = -r * 1.5 + ((t % 840) / 840) * r * 3;
      const sh = g.createLinearGradient(gx - r * 0.3, -r, gx + r * 0.3, r);
      sh.addColorStop(0, 'rgba(255,255,255,0)');
      sh.addColorStop(0.5, 'rgba(255,255,255,0.55)');
      sh.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = sh;
      g.fillRect(-r, -r, r * 2, r * 2);
      g.restore();
      g.restore();
      return;
    }
    const u = t - popAt;
    const big = a.big ?? 1;
    const bigS = Math.min(W * 0.78, H * 0.4, 400);
    // into the pool once the chrome slides in
    const h = easeInOut(Math.min(1, Math.max(0, (t - a.chromeAt) / HANDOFF_MS)));
    const pool = (a.stage.parentElement ?? a.stage).getBoundingClientRect();
    const tx = pool.left + pool.width / 2;
    const ty = pool.top + pool.height * 0.55 - (a.lift ?? 0);
    const ts = Math.min(POOL_W, POOL_H) * 0.84 * big;
    const x = cx + (tx - cx) * h;
    const y = cy + (ty - cy) * h;
    const s = bigS + (ts - bigS) * h;
    // the pop: a ring and droplets fly off the coin
    if (u < 420) {
      const k = u / 420;
      g.globalAlpha = 1 - k;
      g.strokeStyle = '#FFFFFF';
      g.lineWidth = 4 * (1 - k) + 1;
      g.beginPath();
      g.arc(cx, cy, Math.min(W, H) * (0.15 + k * 0.3), 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = hexA(tier, 0.9);
      for (let i = 0; i < 14; i++) {
        const an = (i / 14) * Math.PI * 2 + 0.3;
        const d = Math.min(W, H) * (0.16 + k * 0.32);
        g.beginPath();
        g.arc(cx + Math.cos(an) * d, cy + Math.sin(an) * d + k * k * 12, 5 * (1 - k) + 1, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
    }
    const out = spring(u, 420, 0.12);
    const sx = 0.5 + 0.5 * out;
    const sy = 0.5 + 0.5 * out + 0.14 * Math.max(0, 1 - u / 280);
    // the signature starts on the hero canvas and carries on in the pool (one continuous move)
    const sd = this.signatureMs(a);
    const hopT = u - 380;
    // the same beat as the pool (drawPool): surprised → happy → proud → eyes open as it lands
    const beat = sceneBeatEnd(a.item.firstGolden ? 'rare' : a.sp.rarity);
    const opts: DrawOpts = {
      golden: a.item.golden,
      expression: u < 420 ? 'surprised' : u >= beat ? 'idle' : u > beat - SCENE_PROUD_MS ? 'proud' : 'happy',
      t: u / 1000,
      night,
      ...(hasNewArt(a.sp.id) && hopT > 0 && hopT < sd ? { signatureAt: hopT / sd } : {}),
    };
    withFinish(
      g,
      a.item.golden && (artGoldenKindOf(a.sp.id) === 'pearl' ? 'pearl' : true),
      u,
      rm,
      x,
      y,
      s * sx,
      (gg) => {
        gg.save();
        gg.translate(x, y);
        gg.scale(sx, sy);
        drawCreature(gg, a.sp, 0, 0, s, 0, opts);
        gg.restore();
      },
    );
  }

  private async share(sp: Species, item: RevealItem): Promise<void> {
    await document.fonts?.ready;
    const c = renderShareCard(sp, { golden: item.golden, date: this.d.date(), name: this.d.playerName?.() });
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
    removeEventListener('resize', this.resize);
    cancelAnimationFrame(this.raf);
    for (const e of a.inerted) e.removeAttribute('inert');
    if (a.modal && a.el.contains(document.activeElement)) {
      const back = a.returnTo?.isConnected ? a.returnTo : null;
      if (back) back.focus({ preventScroll: true });
      else (document.activeElement as HTMLElement | null)?.blur();
    }
    a.el.classList.remove('show');
    a.el.classList.add('leaving');
    if (immediate) a.el.remove();
    else setTimeout(() => a.el.remove(), 200);
    this.pump();
  }

  /**
   * How long the reveal's one signature move lasts (ms). Scene tiers fit it before the card settles,
   * because a signature can carry its own face (the seadragon's is eyes-closed).
   */
  private signatureMs(a: Active): number {
    if (!a.hero) return SIGNATURE_MS;
    return Math.min(SIGNATURE_MS, sceneBeatEnd(a.item.firstGolden ? 'rare' : a.sp.rarity) - 380 - 40);
  }

  /** Debug/test: freeze the current reveal at elapsed t (ms) and render that frame. */
  freeze(t: number): boolean {
    const a = this.cur;
    if (!a) return false;
    cancelAnimationFrame(this.raf);
    a.clocked = true;
    a.start = this.now() - t;
    // a frozen frame is a full repaint: backdrop and hero canvas included
    a.fxAt = -Infinity;
    a.heroDone = false;
    this.draw(a, t);
    return true;
  }

  /** Debug/test: what's showing. */
  current(): { id: string; modal: boolean; settled: boolean; expr?: string } | null {
    const a = this.cur;
    return a ? { id: a.sp.id, modal: a.modal, settled: a.settled, expr: a.expr } : null;
  }

  /**
   * A modal card is younger than REVEAL_GRACE_MS (or not painted yet) at `t` (an event's timeStamp,
   * performance.now() time base): a press then was aimed at the board, not at the card.
   */
  inGrace(t: number): boolean {
    const a = this.cur;
    return !!a && a.modal && (a.shownAt === undefined || t - a.shownAt < REVEAL_GRACE_MS);
  }

  /** Debug/test: close whatever is showing. */
  skip(): void {
    this.finish();
  }
}

/** Make everything but `el` (and its ancestors) inert; returns what changed, to restore. */
function inertOthers(el: Element): Element[] {
  const out: Element[] = [];
  for (let n: Element | null = el; n && n !== document.body; n = n.parentElement) {
    const parent: Element | null = n.parentElement;
    if (!parent) break;
    for (const sib of Array.from(parent.children)) {
      if (sib === n || sib.hasAttribute('inert') || sib.tagName === 'SCRIPT') continue;
      // the live region stays live (announcements from the game keep working)
      if (sib.getAttribute('aria-live')) continue;
      sib.setAttribute('inert', '');
      out.push(sib);
    }
  }
  return out;
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
const easeInOut = (k: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, k)));

let scratch: HTMLCanvasElement | null = null;
/**
 * Golden finish: the creature's own golden art read mustard on the card. Draw it to a scratch
 * canvas, lay a warmer, brighter light-gold wash over its pixels only, and sweep a moving specular
 * glint across it (no glint with reduced motion). (x, y, s): the creature's centre and box.
 */
function withFinish(
  g: CanvasRenderingContext2D,
  /** `pearl`: the gold legendary's own golden (CRITIQUE-4): no cream wash, an iridescent glint. */
  golden: boolean | 'pearl',
  tMs: number,
  rm: boolean,
  x: number,
  y: number,
  s: number,
  draw: (g: CanvasRenderingContext2D) => void,
): void {
  if (!golden) return draw(g);
  const W = g.canvas.width;
  const H = g.canvas.height;
  scratch ??= document.createElement('canvas');
  if (scratch.width !== W || scratch.height !== H) {
    scratch.width = W;
    scratch.height = H;
  }
  const sg = scratch.getContext('2d')!;
  sg.setTransform(1, 0, 0, 1, 0, 0);
  sg.clearRect(0, 0, W, H);
  sg.setTransform(g.getTransform());
  draw(sg);
  sg.globalCompositeOperation = 'source-atop';
  const pearl = golden === 'pearl';
  // pearl keeps its outline crisp on the cream card: the kit already gives it nacre and glints
  if (!pearl) {
    const wash = sg.createLinearGradient(0, y - s * 0.5, 0, y + s * 0.5);
    wash.addColorStop(0, 'rgba(255,248,205,0.42)');
    wash.addColorStop(0.55, 'rgba(255,214,110,0.22)');
    wash.addColorStop(1, 'rgba(255,160,60,0.16)');
    sg.fillStyle = wash;
    sg.fillRect(x - s, y - s, s * 2, s * 2);
  }
  if (!rm) {
    // one glint every 1.6 s, diagonally across the body
    const p = ((tMs % 1600) / 1600) * 2.2 - 0.6;
    const gx = x - s * 0.6 + s * 1.2 * p;
    const gl = sg.createLinearGradient(gx - s * 0.14, y - s * 0.5, gx + s * 0.14, y - s * 0.3);
    gl.addColorStop(0, 'rgba(255,255,255,0)');
    if (pearl) {
      // a play of colour, not a white bar: rose → white → aqua
      gl.addColorStop(0.3, 'rgba(255,190,214,0.45)');
      gl.addColorStop(0.5, 'rgba(255,255,255,0.7)');
      gl.addColorStop(0.7, 'rgba(170,240,232,0.45)');
    } else gl.addColorStop(0.5, 'rgba(255,255,255,0.8)');
    gl.addColorStop(1, 'rgba(255,255,255,0)');
    sg.fillStyle = gl;
    sg.fillRect(x - s, y - s, s * 2, s * 2);
  }
  sg.globalCompositeOperation = 'source-over';
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(scratch, 0, 0);
  g.restore();
}

function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * (1 + amt))));
  return `rgb(${ch((n >> 16) & 255)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}
