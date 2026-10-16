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
import type { Scene } from '../render/scene.ts';
import { MOTION } from '../render/theme.ts';
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

export class Fx {
  private queue: Scheduled[] = [];
  /** Species already celebrated as "New!" this session (a cascade can catch one twice). */
  private announced = new Set<string>();
  readonly guard = new MomentGuard();
  /** When the latest move is visually settled (discovery reveals wait for it). */
  settleAt = 0;
  /** When the latest move's word fades (the NEW BEST banner waits for it). */
  private wordEnd = 0;

  constructor(
    private readonly scene: Scene,
    private readonly sfx: Sfx,
    private readonly haptics: Haptics,
  ) {}

  /** Run scheduled steps whose time has come. Call once per frame. */
  tick(now: number): void {
    if (!this.queue.length) return;
    const due = this.queue.filter((q) => q.at <= now);
    if (!due.length) return;
    this.queue = this.queue.filter((q) => q.at > now);
    for (const q of due) q.fn(q.at);
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

  dispatch(
    events: readonly GameEvent[],
    now: number,
    from: { x: number; y: number } | null,
    opts: DispatchOpts = {},
  ): number {
    const sc = this.scene;
    const l = sc.layout;
    const cel = sc.celebrate;
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
          const m = momentFor(e, { prevStreak });
          const tier = m.tier;
          const v = m.visual;
          let spent = 0;
          const board = l.board;
          const waves = e.waves.length;
          const last = now + flight + (waves - 1) * MOTION.waveGap;
          let lastPop = last;
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
            for (const d of w.cleared) {
              const [x, y] = sc.cellCenter(d.cell);
              const dist = Math.hypot(x - cx, y - cy) / l.cell;
              const st = t0 + MOTION.lagoonFill + dist * MOTION.ringStagger * 2;
              sc.burst.add(x, y, cx, cy, d.color, st, strength, l.cell, sc.rand);
              settle = Math.max(settle, st + 700);
              lastPop = Math.max(lastPop, st);
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
          const wordAt = clean ? Math.max(last + MOTION.lagoonFill + 40, lastPop + 190) : last + MOTION.lagoonFill + 40;
          const life = Math.max(600, Math.min(WORD_LIFE[tier]!, now + LIMITS.settleMs - wordAt));
          settle = Math.max(settle, wordAt + life);
          this.wordEnd = m.word ? wordAt + life : 0;
          if (v.sweep) this.at(last + MOTION.lagoonFill, (t) => (sc.sweep = t));
          if (v.wash)
            this.at(last + MOTION.lagoonFill + 60, (t) => {
              cel.washAt = t;
              this.sfx.whoosh();
            });
          if (v.shake > 0 && !rm)
            this.at(now + flight + 40, (t) => (sc.shake = { start: t, amp: MomentGuard.shake(v.shake) }));
          // the word and the number: one stack, above the last lagoon (never on the water)
          const lastCells = e.waves[waves - 1]!.pockets.flatMap((p) => p.cells);
          this.at(wordAt, (t) => {
            sc.score = sc.pendingScore ?? sc.score;
            const ts = sc.textScale;
            const word = m.word && this.guard.claimWord(tier, t, life) ? m.word : null;
            const numH = l.cell * (word ? 0.5 : tier >= 1 ? 0.56 : 0.48) * ts;
            const night = sc.palette.name === 'night';
            const wm = word ? cel.measure(word, l.cell * WORD_SIZE[tier]! * ts, m.style, night) : null;
            // sprites carry padding for the outline; the visible line is about one text height
            const wordH = wm ? l.cell * WORD_SIZE[tier]! * ts * 1.05 : 0;
            const wordW = wm ? Math.min(l.board.w, wm.w) : numH * 3;
            // the board is empty after Spotless: the word takes the middle of the board
            const pos =
              tier === 4 && clean
                ? { x: board.x + board.w / 2, y: board.y + board.h * 0.42 }
                : placeStack(l, lastCells, wordH, numH, wordW);
            if (word) {
              cel.showWord({ text: word, style: m.style, tier, x: pos.x, y: pos.y, start: t, life }, l, ts);
              if (m.sound.sting !== 'none') this.sfx.sting(m.sound.sting);
            }
            cel.showNumber({
              text: `+${pts}`,
              x: pos.x,
              y: word ? pos.y + wordH * 0.5 + numH * 0.55 : pos.y,
              size: numH,
              start: t + (word ? 60 : 0),
              life: word ? life - 60 : MOTION.scorePop,
            });
          });
          // the combo badge ticks up as the piece lands
          // render the moment's text off the hot frame: word, number, the combo's next badge
          {
            const ts = sc.textScale;
            const numPx = l.cell * (m.word ? 0.5 : tier >= 1 ? 0.56 : 0.48) * ts;
            cel.prewarm(
              [
                ...(m.word ? [[m.word, l.cell * WORD_SIZE[tier]! * ts, m.style] as const] : []),
                [`+${pts}`, numPx, 'points'] as const,
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
    caught.slice(0, 4).forEach((c, f) => {
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
