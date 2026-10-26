/**
 * Effects dispatcher: turns domain events into choreographed visuals, sound and haptics.
 * Timeline (ms after release): piece flies to its cell (≈90) → per wave k at 90 + k·150:
 * lagoon fills, ring pebbles lift and burst outward from the lagoon's center (burst.ts), droplets,
 * chime one step up per combo → the word + number above the lagoon → (tier 3+) sweep and a capped
 * shake → (tier 4) tide wash and whoosh. How much happens is decided by `momentFor` (ADR 0012):
 * big moments get big, normal moves stay calm. Input is never blocked.
 */
import type { GameEvent } from '../core/game.ts';
import { pieceById } from '../core/pieces.ts';
import { xOf, yOf } from '../core/grid.ts';
import { Kind } from '../render/particles.ts';
import { BURST_LIFT } from '../render/burst.ts';
import { FISH_LIFE, type Scene } from '../render/scene.ts';
import { MOTION, fmt } from '../render/theme.ts';
import { chimeLayers, chimeStep, comboChange, comboLevel, LIMITS, MomentGuard, momentFor } from '../render/moments.ts';
import { placeStack, WORD_LIFE, WORD_SIZE, BEST_LIFE } from '../render/celebrate.ts';
import type { Sfx } from '../audio/sfx.ts';
import type { Haptics } from '../platform/haptics.ts';
import type { LagoonCatch } from '../meta/catch.ts';

interface Scheduled {
  at: number;
  fn: (t: number) => void;
}

export interface DispatchOpts {
  firstCapture?: boolean;
  catches?: readonly LagoonCatch[];
  newIds?: ReadonlySet<string>;
  /** Combo state after the move (drives the badge and its grace shells). */
  after?: { streak: number; dry: number };
}

/**
 * The floating +N's text size: one function for the real sprite and its prewarm (they used to
 * differ, so the prewarm never hit the sprite cache). Never under 24 px.
 */
export const numberPx = (cell: number, withWord: boolean, tier: number, ts: number): number =>
  Math.max(24, cell * (withWord ? 0.56 : tier >= 1 ? 0.58 : 0.5)) * ts;

/** A scheduled step this overdue keeps its visuals but drops its sound and haptics. */
export const LATE_MS = 250;
/** Creatures in flight at once (the rest become one "+N" coin chip). */
export const MAX_FLYING = 3;

/** `target` whose methods become no-ops while `quiet()` (sound/haptics of late steps). */
function quietWhen<T extends object>(target: T, quiet: () => boolean): T {
  return new Proxy(target, {
    get(t, k) {
      const v = Reflect.get(t, k, t) as unknown;
      if (typeof v !== 'function') return v;
      return (...a: unknown[]) => (quiet() ? undefined : (v as (...a: unknown[]) => unknown).apply(t, a));
    },
  });
}

export class Fx {
  private queue: Scheduled[] = [];
  /** Species already celebrated as "New!" this session (a cascade can catch one twice). */
  private announced = new Set<string>();
  readonly guard = new MomentGuard();
  /** When the latest move is visually settled (discovery reveals wait for it). */
  settleAt = 0;
  /** When the latest move's word fades (the NEW BEST banner waits for it). */
  private wordEnd = 0;
  /** Bumped per dispatched move: a word never lands over a board it doesn't describe. */
  private moveSeq = 0;

  /** True while running a step that is more than LATE_MS overdue: its sound and haptics are dropped. */
  private late = false;
  private readonly sfx: Sfx;
  private readonly haptics: Haptics;

  constructor(
    private readonly scene: Scene,
    sfx: Sfx,
    haptics: Haptics,
  ) {
    this.sfx = quietWhen(sfx, () => this.late);
    this.haptics = quietWhen(haptics, () => this.late);
  }

  /** Run scheduled steps whose time has come. Call once per frame. */
  tick(now: number): void {
    if (!this.queue.length) return;
    const due = this.queue.filter((q) => q.at <= now);
    if (!due.length) return;
    this.queue = this.queue.filter((q) => q.at > now);
    // back from the background (rAF paused): the visuals settle, but a celebration's queued chimes
    // and buzzes don't all go off at once
    for (const q of due) {
      this.late = now - q.at > LATE_MS;
      try {
        q.fn(q.at);
      } finally {
        this.late = false;
      }
    }
  }

  get pending(): boolean {
    return this.queue.length > 0;
  }

  /** Schedule `fn` at absolute time t; it receives its scheduled time (so a frozen clock is exact). */
  private at(t: number, fn: (t: number) => void): void {
    this.queue.push({ at: t, fn });
  }

  /** Flush everything instantly (e.g. on restart). */
  reset(): void {
    this.queue = [];
    this.guard.reset();
    this.settleAt = 0;
  }

  /** The mid-game moment you pass your best (once per game): gold banner under the score. */
  newBest(now: number): void {
    // a word owns the moment; the banner lands as it fades (but never more than ~0.9 s late)
    const t = Math.max(now + 450, Math.min(this.wordEnd - 150, now + 1000));
    this.at(t, (t) => {
      this.scene.celebrate.bestAt = t;
      this.scene.celebrate.bestShown = true;
      this.sfx.newBest();
      this.haptics.fire('medium', t);
    });
    this.settleAt = Math.max(this.settleAt, t + BEST_LIFE * 0.5);
  }

  /**
   * A reef chapter is complete (endless reefs, 20 per chapter): a screen-filling moment after the
   * clear's own word has faded — tide wash, gold "Chapter N!" + its name, whoosh, fanfare.
   * Returns when it has settled (the reef result card waits for it).
   */
  chapterComplete(now: number, chapter: number, name: string): number {
    const sc = this.scene;
    const l = sc.layout;
    const cel = sc.celebrate;
    const t = Math.max(now + 650, this.wordEnd + 60);
    const life = 1500;
    this.at(t, (t) => {
      const b = l.board;
      const ts = sc.textScale;
      this.guard.claimWord(4, t, life);
      cel.washAt = t;
      sc.sweep = t + 200;
      cel.showWord(
        { text: `Chapter ${chapter}`, style: 'gold', tier: 4, x: b.x + b.w / 2, y: b.y + b.h * 0.42, start: t, life },
        l,
        ts,
      );
      cel.showNumber({
        text: `Complete · ${name}`, // "Chapter 2!" read like *starting* chapter 2 (UX review)
        x: b.x + b.w / 2,
        y: b.y + b.h * 0.42 + l.cell * 1.05 * ts,
        size: l.cell * 0.68 * ts, // ≥ 30 px: stroked display type needs the size (UI_DESIGN §7.1)
        start: t + 120,
        life: life - 120,
        style: 'water',
      });
      if (!sc.reducedMotion)
        for (let i = 0; i < 16; i++) {
          const x = b.x + b.w * (0.1 + 0.8 * ((i * 0.618) % 1));
          const y = b.y + b.h * (0.25 + 0.5 * ((i * 0.382) % 1));
          sc.particles.burst(1, x, y, Kind.Spark, 0, l.cell * 2.4, l.cell * 0.16, MOTION.particleMax, sc.rand);
        }
      this.sfx.whoosh();
      this.sfx.fanfare(0.12);
      this.haptics.fire('heavy', t);
    });
    this.settleAt = Math.max(this.settleAt, t + life);
    return t + life;
  }

  dispatch(
    events: readonly GameEvent[],
    now: number,
    from: { x: number; y: number } | null,
    opts: DispatchOpts = {},
  ): number {
    const sc = this.scene;
    const l = sc.layout;
    const cel = sc.celebrate;
    // a newer move: the previous word leaves fast, and its pending word (if any) never lands
    const seq = ++this.moveSeq;
    cel.hurry(now);
    const flight = from ? MOTION.place * 0.8 : 0;
    const rm = sc.reducedMotion;
    let settle = now + flight + MOTION.place;
    let hapticsLeft = LIMITS.maxHapticsPerMove;
    const buzz = (k: 'tick' | 'medium' | 'heavy', t: number) => {
      if (hapticsLeft-- > 0) this.haptics.fire(k, t);
    };
    for (const e of events) {
      switch (e.type) {
        case 'placed': {
          const piece = pieceById(e.pieceId);
          for (const c of e.cells) {
            sc.board[c] = e.color;
            sc.land[c] = now + flight;
          }
          if (from)
            sc.placing.push({
              cells: e.cells,
              color: e.color,
              fromX: from.x,
              fromY: from.y,
              ax: e.x,
              ay: e.y,
              piece,
              start: now,
            });
          sc.tray[e.slot] = { t: null, dealStart: 0, back: null };
          this.at(now + flight, (t) => {
            this.sfx.place(piece.size);
            buzz('tick', t);
          });
          break;
        }
        case 'captured': {
          // logical board is final now: remove cleared cells from the mirror, animate them bursting
          for (const c of e.cleared) sc.board[c.cell] = 0;
          const prevStreak = sc.streak;
          const m0 = momentFor(e, { prevStreak });
          // first run: the teaching capture names the thing ("Lagoon!"), never "Spotless!" (UX S3)
          const m = opts.firstCapture && m0.word ? { ...m0, word: 'Lagoon!' } : m0;
          const tier = m.tier;
          const v = m.visual;
          let spent = 0;
          const board = l.board;
          const waves = e.waves.length;
          const last = now + flight + (waves - 1) * MOTION.waveGap;
          let lastPop = last;
          // when the last ring's top row (where the word lands) bursts
          let topPop = 0;
          e.waves.forEach((w, k) => {
            const t0 = now + flight + k * MOTION.waveGap;
            const area = w.pockets.reduce((a, p) => a + p.cells.length, 0);
            const lagoonCells = w.pockets.flatMap((p) => p.cells);
            let cx = 0;
            let cy = 0;
            for (const c of lagoonCells) {
              cx += xOf(c);
              cy += yOf(c);
            }
            cx = board.x + (cx / lagoonCells.length + 0.5) * l.cell;
            cy = board.y + (cy / lagoonCells.length + 0.5) * l.cell;
            sc.lagoons.push({ cells: lagoonCells, start: t0 });
            // ring pebbles burst outward from the lagoon's center, in a ripple by distance; later
            // waves and bigger moments burst harder
            const strength = rm ? 0 : v.burst + k * 0.1;
            const lagoonTop = Math.min(...lagoonCells.map(yOf));
            for (const d of w.cleared) {
              const [x, y] = sc.cellCenter(d.cell);
              const dist = Math.hypot(x - cx, y - cy) / l.cell;
              const st = t0 + MOTION.lagoonFill + dist * MOTION.ringStagger * 2;
              sc.burst.add(x, y, cx, cy, d.color, st, strength, l.cell, sc.rand);
              settle = Math.max(settle, st + 700);
              lastPop = Math.max(lastPop, st);
              if (k === waves - 1 && yOf(d.cell) < lagoonTop) topPop = Math.max(topPop, st);
              const n = Math.min(v.perPebble, v.budget - spent);
              spent += Math.max(0, n);
              if (n > 0)
                this.at(st + 70, () => {
                  sc.particles.burst(
                    n,
                    x,
                    y,
                    Kind.Droplet,
                    d.color,
                    l.cell * 3 * (0.8 + 0.2 * v.burst),
                    l.cell * 0.2,
                    MOTION.particleMin,
                    sc.rand,
                  );
                });
            }
            this.at(t0, (t) => {
              sc.ripples.push({ x: cx, y: cy, start: t, r: l.cell * (0.9 + Math.sqrt(area) * 0.6) });
              // a few bubbles rise out of the water
              for (const c of lagoonCells.slice(0, tier >= 3 ? 8 : 5)) {
                const [x, y] = sc.cellCenter(c);
                sc.particles.burst(1, x, y, Kind.Foam, 0, l.cell * 1.2, l.cell * 0.3, MOTION.particleMin, sc.rand);
              }
              if (v.sparks)
                for (const c of lagoonCells.slice(0, 12)) {
                  const [x, y] = sc.cellCenter(c);
                  sc.particles.burst(1, x, y, Kind.Spark, 0, l.cell * 2.2, l.cell * 0.14, MOTION.particleMax, sc.rand);
                }
              this.leap(opts, k, t0);
              // the chime climbs one pentatonic step per combo (cap 12), extra voices at ×5/×10/×20
              this.sfx.capture(area, chimeStep(e.streak, 0), k, 0, chimeLayers(e.streak));
              if (k < 2) buzz(m.haptic[Math.min(k, m.haptic.length - 1)]!, t);
            });
          });
          const pts = e.score.total;
          const clean = e.score.cleanBonus > 0;
          // Spotless owns the middle of the board, so it waits for the last ring to leave its cells
          // a lagoon's word waits (≤ 140 ms more) until the ring's top row has lifted off and left the
          // spot above the lagoon where it lands
          const base = last + MOTION.lagoonFill + 40;
          const wordAt = clean
            ? Math.max(base, lastPop + 190)
            : m.word
              ? Math.min(base + 140, Math.max(base, topPop + BURST_LIFT + 90))
              : base; // pinches: unchanged (just the +N)
          // words fit the 1.3 s settle budget; the rare tier-4 word may hold a little longer
          const life = Math.max(tier === 4 ? 850 : 600, Math.min(WORD_LIFE[tier]!, now + LIMITS.settleMs - wordAt));
          settle = Math.max(settle, wordAt + life);
          this.wordEnd = m.word ? wordAt + life : 0;
          // peaks: the gold light sweeps the board just after the word pops (it lights the moment)
          if (v.sweep) this.at(wordAt + 120, (t) => (sc.sweep = t));
          if (v.wash)
            this.at(last + MOTION.lagoonFill + 60, (t) => {
              cel.washAt = t;
              this.sfx.whoosh();
            });
          // the shake lands with the first ring burst; tier 4 takes the whole allowance (≤ 6 px)
          if (v.shake > 0 && !rm)
            this.at(
              now + flight + MOTION.lagoonFill,
              (t) => (sc.shake = { start: t, amp: MomentGuard.shake(tier === 4 ? LIMITS.maxShakePx : v.shake) }),
            );
          // the word and the number: one stack, above the last lagoon (never on the water)
          const lastCells = e.waves[waves - 1]!.pockets.flatMap((p) => p.cells);
          this.at(wordAt, (t) => {
            const from = sc.score;
            sc.score = sc.pendingScore ?? sc.score;
            // the board has moved on (a newer move was committed): just land the points
            if (seq !== this.moveSeq) return;
            if (tier >= 3) {
              // peaks count up on a clock and the score pulses (gold) as the last digit lands
              const ms = tier === 4 ? 520 : 420;
              sc.scoreRoll = { at: t, ms, from, to: sc.score };
              sc.scorePunch = { at: t + ms, amp: tier === 4 ? 0.24 : 0.17, gold: true };
            } else if (tier === 2) sc.scorePunch = { at: t, amp: 0.08, gold: false };
            const ts = sc.textScale;
            const word = m.word && this.guard.claimWord(tier, t, life) ? m.word : null;
            const numH = numberPx(l.cell, !!word, tier, ts);
            const gap = word ? l.cell * 0.2 : 0;
            const night = sc.palette.name === 'night';
            const wm = word ? cel.measure(word, l.cell * WORD_SIZE[tier]! * ts, m.style, night) : null;
            // sprites carry padding for the outline; the visible line is about one text height
            const wordH = wm ? l.cell * WORD_SIZE[tier]! * ts * 1.05 : 0;
            const wordW = wm ? Math.min(l.board.w, wm.w) : numH * 3;
            // the board is empty after Spotless: the word takes the middle of the board
            const pos =
              tier === 4 && clean
                ? { x: board.x + board.w / 2, y: board.y + board.h * 0.42 }
                : placeStack(l, lastCells, wordH + gap, numH, wordW, !!word);
            if (word) {
              cel.showWord({ text: word, style: m.style, tier, x: pos.x, y: pos.y, start: t, life }, l, ts);
              if (m.sound.sting !== 'none') this.sfx.sting(m.sound.sting);
            }
            cel.showNumber({
              text: `+${fmt(pts)}`,
              x: pos.x,
              y: word ? pos.y + wordH * 0.5 + gap + numH * 0.5 : pos.y,
              size: numH,
              start: t + (word ? 60 : 0),
              life: word ? life - 60 : MOTION.scorePop,
            });
          });
          // the combo badge ticks up as the piece lands
          // render the moment's text off the hot frame: word, number, the combo's next badge
          {
            const ts = sc.textScale;
            const numPx = numberPx(l.cell, !!m.word, tier, ts);
            cel.prewarm(
              [
                ...(m.word ? [[m.word, l.cell * WORD_SIZE[tier]! * ts, m.style] as const] : []),
                [`+${fmt(pts)}`, numPx, 'points'] as const,
                ...(e.streak >= 2 ? cel.comboSprites(e.streak, l, ts) : []),
              ],
              sc.palette.name === 'night',
            );
          }
          const after = opts.after ?? { streak: e.streak, dry: 0 };
          const change = comboChange({ streak: prevStreak, dry: sc.dry }, after);
          sc.streak = e.streak;
          this.at(now + flight, (t) => {
            sc.streakPulse = t;
            if (e.streak >= 2) cel.comboUp(e.streak, t);
            else cel.combo.n = e.streak;
            if (change === 'milestone') this.sfx.comboLevel(comboLevel(e.streak));
          });
          this.settleAt = settle;
          break;
        }
        case 'cleanReef':
          break; // part of the Spotless moment (sting + wash)
        case 'streakLost':
          sc.streak = 0;
          if (e.was >= 2)
            this.at(now + flight, (t) => {
              cel.comboBreak(t);
              this.sfx.comboBreak();
            });
          else cel.combo.n = 0;
          break;
        case 'scored': {
          // captures reveal the new total when their points land; plain placements right away
          sc.pendingScore = e.total;
          if (!events.some((x) => x.type === 'captured')) {
            this.at(now + flight, () => (sc.score = e.total));
            // a dry move with the combo alive dims one grace shell
            const after = opts.after;
            if (after && after.streak >= 2 && after.dry > 0) this.at(now + flight, (t) => cel.comboDry(after.dry, t));
          }
          break;
        }
        case 'dealt': {
          const base = now + flight + 140;
          e.tray.forEach((t, i) => (sc.tray[i] = { t, dealStart: base + i * MOTION.dealStagger, back: null }));
          this.at(base, () => this.sfx.deal());
          break;
        }
        case 'gameOver':
          this.at(now + flight + 500, (t) => {
            sc.gameOverAt = t;
            this.sfx.gameOver();
            this.haptics.fire('fail', t);
          });
          break;
      }
    }
    if (opts.after) sc.dry = opts.after.dry;
    if (!events.some((e) => e.type === 'captured')) this.settleAt = settle;
    return this.settleAt;
  }

  /** The catch: each creature leaps out of this wave's water and dives back to the sea. */
  private leap(opts: DispatchOpts, k: number, t0: number): void {
    const sc = this.scene;
    const l = sc.layout;
    // reduced motion: catches are still recorded and revealed, just not animated
    if (sc.reducedMotion) return;
    const caught = (opts.catches ?? [])
      .filter((c) => c.wave === k + 1)
      .flatMap((c) => c.catches.map((x) => ({ x, cells: c.cells })));
    const announced = new Set<string>();
    // at most MAX_FLYING creatures in the air at once (counting earlier waves/moves still flying);
    // the rest merge into one small "+N" coin chip that swims to the journal behind them
    const flying = sc.fish.filter((x) => !x.arrived && x.start + FISH_LIFE * 1000 > t0).length;
    const room = Math.max(0, MAX_FLYING - flying);
    // new species always get a seat first
    const isNewId = (id: string) => (opts.newIds?.has(id) ? 1 : 0);
    const order = [...caught].sort((a, b) => isNewId(b.x.id) - isNewId(a.x.id));
    const extra = order.length - room;
    if (extra > 0) {
      const c = order[Math.min(room, order.length - 1)]!;
      const [lx, ly] = sc.cellCenter(c.cells[Math.floor(c.cells.length / 2)]!);
      sc.fish.push({
        x: lx,
        y: ly,
        vx: l.cell * 1.4,
        vy: -l.cell * 10,
        start: t0 + 90 + Math.min(room, MAX_FLYING) * 110,
        size: l.cell * 0.5,
        hue: '#F2C14E',
        chip: extra,
      });
    }
    order.slice(0, room).forEach((c, f) => {
      // only the first of a newly discovered species gets the "New!" treatment
      const isNew = (opts.newIds?.has(c.x.id) ?? false) && !announced.has(c.x.id) && !this.announced.has(c.x.id);
      if (isNew) {
        announced.add(c.x.id);
        this.announced.add(c.x.id);
      }
      const [lx, ly] = sc.cellCenter(c.cells[Math.floor(c.cells.length / 2)]!);
      const dir = (f + k) % 2 ? -1 : 1;
      sc.fish.push({
        x: lx,
        y: ly,
        vx: dir * l.cell * (isNew ? 1.2 : 1.6 + sc.rand() * 1.2),
        vy: -l.cell * (isNew ? 13 : 10 + sc.rand() * 2),
        start: t0 + 90 + f * 110,
        size: l.cell * (isNew ? 0.62 : 0.5),
        hue: '#FF8A3D',
        species: c.x.id,
        golden: c.x.golden,
        isNew,
      });
    });
  }
}
