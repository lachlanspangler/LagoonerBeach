/**
 * Effects dispatcher: turns domain events into choreographed visuals, sound and haptics.
 * Timeline (ms after release): piece flies to its cell (≈90) → per wave k at 90 + k·150:
 * lagoon fills, ring pebbles lift and burst in a ripple from the lagoon's center, particles,
 * score pop; callout for big moments; tiny shake only for cascades/huge lagoons.
 */
import type { GameEvent } from '../core/game.ts';
import { pieceById } from '../core/pieces.ts';
import { xOf, yOf } from '../core/grid.ts';
import { Kind } from '../render/particles.ts';
import type { Scene } from '../render/scene.ts';
import { MOTION, calloutFor } from '../render/theme.ts';
import type { Sfx } from '../audio/sfx.ts';
import type { Haptics } from '../platform/haptics.ts';
import type { LagoonCatch } from '../meta/catch.ts';
import { SPECIES_BY_ID } from '../meta/creatures.ts';

interface Scheduled {
  at: number;
  fn: () => void;
}

export class Fx {
  private queue: Scheduled[] = [];
  /** Species already celebrated as "New!" this session (a cascade can catch one twice). */
  private announced = new Set<string>();

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
    for (const q of due) q.fn();
  }

  get pending(): boolean {
    return this.queue.length > 0;
  }

  private at(t: number, fn: () => void): void {
    this.queue.push({ at: t, fn });
  }

  /** Flush everything instantly (e.g. on restart). */
  reset(): void {
    this.queue = [];
  }

  dispatch(
    events: readonly GameEvent[],
    now: number,
    from: { x: number; y: number } | null,
    opts: { firstCapture?: boolean; catches?: readonly LagoonCatch[]; newIds?: ReadonlySet<string> } = {},
  ): void {
    const sc = this.scene;
    const l = sc.layout;
    const flight = from ? MOTION.place * 0.8 : 0;
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
          this.at(now + flight, () => {
            this.sfx.place(piece.size);
            this.haptics.fire('tick');
          });
          break;
        }
        case 'captured': {
          // logical board is final now: remove cleared cells from the mirror, animate them as dying
          for (const c of e.cleared) sc.board[c.cell] = 0;
          const maxArea = Math.max(...e.pockets.map((p) => p.cells.length));
          const clean = e.score.cleanBonus > 0;
          // how big a moment this is decides how much happens — small pops stay calm
          const tier = maxArea >= 12 || e.waves.length > 1 || clean ? 3 : maxArea >= 6 ? 2 : maxArea >= 3 ? 1 : 0;
          const perPebble = [2, 3, 3, 4][tier]!;
          const budget = [16, 24, 28, 36][tier]!;
          let spent = 0;
          const board = l.board;
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
            // ring pebbles pop outward from the lagoon's center, each shedding a few droplets of its color
            for (const d of w.cleared) {
              const [x, y] = sc.cellCenter(d.cell);
              const dist = Math.hypot(x - cx, y - cy) / l.cell;
              const st = t0 + MOTION.lagoonFill + dist * MOTION.ringStagger * 2;
              sc.dying.push({ cell: d.cell, color: d.color, start: st });
              const n = Math.min(perPebble, budget - spent);
              spent += n;
              if (n > 0)
                this.at(st + 60, () =>
                  sc.particles.burst(
                    n,
                    x,
                    y,
                    Kind.Droplet,
                    d.color,
                    l.cell * 3,
                    l.cell * 0.2,
                    MOTION.particleMin,
                    sc.rand,
                  ),
                );
            }
            this.at(t0, () => {
              sc.ripples.push({ x: cx, y: cy, start: t0, r: l.cell * (0.9 + Math.sqrt(area) * 0.6) });
              // a few bubbles rise out of the water
              for (const c of lagoonCells.slice(0, 6)) {
                const [x, y] = sc.cellCenter(c);
                sc.particles.burst(1, x, y, Kind.Foam, 0, l.cell * 1.2, l.cell * 0.3, MOTION.particleMin, sc.rand);
              }
              if (tier === 3)
                for (const c of lagoonCells.slice(0, 12)) {
                  const [x, y] = sc.cellCenter(c);
                  sc.particles.burst(1, x, y, Kind.Spark, 0, l.cell * 2.2, l.cell * 0.14, MOTION.particleMax, sc.rand);
                }
              // the catch: each creature leaps out of this wave's water and dives back to the sea
              const caught = (opts.catches ?? [])
                .filter((c) => c.wave === k + 1)
                .flatMap((c) => c.catches.map((x) => ({ x, cells: c.cells })));
              const announced = new Set<string>();
              caught.slice(0, 4).forEach((c, f) => {
                // only the first of a newly discovered species gets the "New!" treatment
                const isNew =
                  (opts.newIds?.has(c.x.id) ?? false) && !announced.has(c.x.id) && !this.announced.has(c.x.id);
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
              const fresh = caught.filter((c) => opts.newIds?.has(c.x.id));
              if (fresh.length)
                this.at(t0 + 200, () => {
                  this.sfx.discovery();
                  const names = [...new Set(fresh.map((c) => SPECIES_BY_ID.get(c.x.id)?.name ?? ''))].join(' · ');
                  // discovery toast in the band above the board (never on it)
                  sc.texts.push({
                    text: `New: ${names}`,
                    x: l.w / 2,
                    y: Math.max(l.hud.y + l.hud.h + l.cell * 0.05, l.board.y - l.cell * 0.2) - l.cell * 0.75,
                    start: performance.now(),
                    size: l.cell * 0.38,
                    life: 1700,
                    strong: false,
                    accent: true,
                    rise: 0.1,
                  });
                });
              this.sfx.capture(area, e.streak, k);
              // feel the streak: long streaks and big moments hit harder
              this.haptics.fire(k > 0 || area >= 12 || e.streak >= 5 ? 'heavy' : 'medium');
            });
          });
          const last = now + flight + (e.waves.length - 1) * MOTION.waveGap;
          const pts = e.score.total;
          const word = opts.firstCapture ? 'Pop!' : calloutFor(maxArea, e.waves.length, clean);
          const land = last + MOTION.lagoonFill + 80;
          this.at(land, () => {
            const t = performance.now();
            sc.score = sc.pendingScore ?? sc.score;
            if (word) {
              // big moments: the word rides just above the board, points tucked under it
              const cy = Math.max(l.hud.y + l.hud.h + l.cell * 0.05, board.y - l.cell * 0.2);
              const big = tier === 3 && !opts.firstCapture;
              sc.texts.push({
                text: word,
                x: l.w / 2,
                y: cy,
                start: t,
                size: l.cell * (big ? 0.9 : 0.72),
                life: MOTION.callout,
                strong: true,
              });
              sc.texts.push({
                text: `+${pts}`,
                x: l.w / 2,
                y: cy + l.cell * (big ? 0.72 : 0.6),
                start: t + 50,
                size: l.cell * 0.46,
                life: MOTION.callout - 50,
                strong: false,
                accent: true,
                rise: 0.25,
              });
            } else {
              const first = e.waves[0]!.pockets.flatMap((p) => p.cells);
              const [px, py] = sc.cellCenter(first[Math.floor(first.length / 2)]!);
              sc.texts.push({
                text: `+${pts}`,
                x: px,
                y: py,
                start: t,
                size: l.cell * (tier >= 1 ? 0.6 : 0.5),
                life: MOTION.scorePop,
                strong: false,
                accent: true,
              });
            }
          });
          if (tier === 3) {
            this.at(now + flight + 40, () => {
              sc.shake = { start: performance.now(), amp: Math.min(6, 2 + e.waves.length * 1.2) };
            });
          }
          this.at(now + flight, () => {
            sc.streak = e.streak;
            sc.streakPulse = performance.now();
          });
          break;
        }
        case 'cleanReef':
          this.at(now + flight + 260, () => this.sfx.cleanReef());
          break;
        case 'streakLost':
          sc.streak = 0;
          break;
        case 'scored':
          // captures reveal the new total when their points land; plain placements right away
          sc.pendingScore = e.total;
          if (!events.some((x) => x.type === 'captured')) this.at(now + flight, () => (sc.score = e.total));
          break;
        case 'dealt': {
          const base = now + flight + 140;
          e.tray.forEach((t, i) => (sc.tray[i] = { t, dealStart: base + i * MOTION.dealStagger, back: null }));
          this.at(base, () => this.sfx.deal());
          break;
        }
        case 'gameOver':
          this.at(now + flight + 500, () => {
            sc.gameOverAt = performance.now();
            this.sfx.gameOver();
            this.haptics.fire('fail');
          });
          break;
      }
    }
  }
}
