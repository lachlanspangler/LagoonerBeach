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

interface Scheduled {
  at: number;
  fn: () => void;
}

export class Fx {
  private queue: Scheduled[] = [];

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

  dispatch(events: readonly GameEvent[], now: number, from: { x: number; y: number } | null): void {
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
          let maxArea = 0;
          e.waves.forEach((w, k) => {
            const t0 = now + flight + k * MOTION.waveGap;
            const area = w.pockets.reduce((a, p) => a + p.cells.length, 0);
            maxArea = Math.max(maxArea, ...w.pockets.map((p) => p.cells.length));
            const lagoonCells = w.pockets.flatMap((p) => p.cells);
            // centroid of this wave's lagoons
            let cx = 0;
            let cy = 0;
            for (const c of lagoonCells) {
              cx += xOf(c);
              cy += yOf(c);
            }
            cx = l.board.x + (cx / lagoonCells.length + 0.5) * l.cell;
            cy = l.board.y + (cy / lagoonCells.length + 0.5) * l.cell;
            sc.lagoons.push({ cells: lagoonCells, start: t0 });
            for (const d of w.cleared) {
              const [x, y] = sc.cellCenter(d.cell);
              const dist = Math.hypot(x - cx, y - cy) / l.cell;
              const st = t0 + MOTION.lagoonFill * 0.6 + dist * MOTION.ringStagger * 2;
              sc.dying.push({ cell: d.cell, color: d.color, start: st });
              this.at(st + 70, () => {
                sc.particles.burst(
                  5,
                  x,
                  y,
                  Kind.Droplet,
                  d.color,
                  l.cell * 6,
                  l.cell * 0.22,
                  MOTION.particleMax,
                  sc.rand,
                );
                sc.particles.burst(2, x, y, Kind.Foam, 0, l.cell * 3, l.cell * 0.45, MOTION.particleMin, sc.rand);
              });
            }
            this.at(t0, () => {
              sc.ripples.push({ x: cx, y: cy, start: t0, r: l.cell * (1.2 + Math.sqrt(area) * 0.8) });
              for (const c of lagoonCells) {
                const [x, y] = sc.cellCenter(c);
                sc.particles.burst(2, x, y, Kind.Spark, 0, l.cell * 2.5, l.cell * 0.12, MOTION.particleMin, sc.rand);
              }
              this.sfx.capture(area, e.streak, k);
              this.haptics.fire(k > 0 || area >= 12 ? 'heavy' : 'medium');
            });
          });
          const last = now + flight + (e.waves.length - 1) * MOTION.waveGap;
          // points land with the burst: under the callout if there is one, else at the first lagoon
          const first = e.waves[0]!.pockets.flatMap((p) => p.cells);
          const [px, py] = sc.cellCenter(first[Math.floor(first.length / 2)]!);
          const pts = e.score.total;
          const word = calloutFor(maxArea, e.waves.length, e.score.cleanBonus > 0);
          const land = last + MOTION.lagoonFill + 60;
          this.at(land, () => {
            const t = performance.now();
            sc.score = sc.pendingScore ?? sc.score;
            if (word) {
              const cy = l.board.y + l.board.h * 0.36;
              sc.texts.push({
                text: word,
                x: l.w / 2,
                y: cy,
                start: t,
                size: l.cell * 0.95,
                life: MOTION.callout,
                strong: true,
              });
              sc.texts.push({
                text: `+${pts}`,
                x: l.w / 2,
                y: cy + l.cell * 0.85,
                start: t + 60,
                size: l.cell * 0.55,
                life: MOTION.callout - 60,
                strong: false,
              });
            } else {
              sc.texts.push({
                text: `+${pts}`,
                x: px,
                y: py,
                start: t,
                size: l.cell * (maxArea >= 3 ? 0.7 : 0.55),
                life: MOTION.scorePop,
                strong: false,
              });
            }
          });
          if (e.waves.length > 1 || maxArea >= 12) {
            this.at(now + flight + 40, () => {
              sc.shake = { start: performance.now(), amp: Math.min(7, 2.5 + e.waves.length * 1.5) };
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
