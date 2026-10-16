/**
 * `window.__atoll`: test/debug hooks (only with ?debug=1 or under WebDriver). Lets e2e tests drive
 * real pointer drags for bot-chosen moves, stage boards, and read measurements. Not shipped to
 * players' code paths otherwise.
 */
import type { Sfx } from '../audio/sfx.ts';
import { newGame, type GameState, type Move } from '../core/game.ts';
import { pieceById } from '../core/pieces.ts';
import { Rng } from '../core/rng.ts';
import { decodeGame, encodeGame } from '../core/serialize.ts';
import type { Profile } from '../platform/storage.ts';
import type { Scene } from '../render/scene.ts';
import { trayCellFor } from '../render/layout.ts';
import { lookFor } from '../render/skins.ts';
import { BOTS, type BotName } from '../sim/bots.ts';
import { Music } from '../audio/music.ts';
import type { ReefSource } from './reefSource.ts';

export interface DebugDeps {
  state(): GameState;
  setState(s: GameState): void;
  mode(): string;
  profile(): Profile;
  scene: Scene;
  sfx: Sfx;
  frameTimes: number[];
  drawTimes: number[];
  pickDrawnAt: number[];
  dropDrawnAt: number[];
  commit(m: Move, from: { x: number; y: number } | null): boolean;
  restart(): void;
  switchMode(m: 'classic' | 'daily' | 'puzzle'): void;
  loadPuzzle(i: number): void;
  puzzleSolution(): unknown;
  reefSource(): ReefSource | null;
  journal(): unknown;
  /** Screenshots only: show a believable best score / a well-filled journal (not saved). */
  stageBest(n: number, score?: number): void;
  stageJournal(ids: string[]): void;
}

export function installDebugApi(d: DebugDeps): void {
  const api = {
    state: d.state,
    mode: d.mode,
    profile: d.profile,
    layout: () => d.scene.layout,
    frameTimes: () => d.frameTimes.slice(),
    drawTimes: () => d.drawTimes.slice(),
    pickDrawnAt: () => d.pickDrawnAt.slice(),
    dropDrawnAt: () => d.dropDrawnAt.slice(),
    clearFrames: () => {
      d.frameTimes.length = 0;
      d.drawTimes.length = 0;
    },
    /** Pointer path (CSS px) that makes the drag controller produce the bot's next move. */
    plan(bot: BotName = 'greedy') {
      const s = d.state();
      if (s.over) return null;
      const m = BOTS[bot](s, new Rng(s.moves + 7));
      return m ? api.pathFor(m) : null;
    },
    pathFor(m: Move) {
      const l = d.scene.layout;
      const p = pieceById(d.state().tray[m.slot]!.pieceId);
      const [cx, cy] = p.cells[0]!;
      const [ox, oy] = d.scene.trayPieceOrigin(m.slot, p);
      const tc = trayCellFor(l, p);
      const down = { x: ox + (cx + 0.5) * tc, y: oy + (cy + 0.5) * tc };
      const up = { x: l.board.x + (m.x + cx + 0.5) * l.cell, y: l.board.y + (m.y + cy + 0.5) * l.cell + l.lift };
      return { move: m, down, up };
    },
    /** Apply bot moves directly (no input) — fast state setup for tests. */
    autoplay(bot: BotName = 'greedy', moves = 10) {
      for (let i = 0; i < moves && !d.state().over; i++) {
        const s = d.state();
        const m = BOTS[bot](s, new Rng(s.moves + 7));
        if (!m) break;
        d.commit(m, null);
      }
      return d.state().moves;
    },
    restart: d.restart,
    switchMode: d.switchMode,
    /** Open reef at 0-based index i; endless reefs (i ≥ 360) arrive asynchronously from the worker. */
    loadPuzzle: d.loadPuzzle,
    puzzleSolution: d.puzzleSolution,
    /** Endless-reef generation: counters, cached reef numbers, and a way to queue generation. */
    reefStats: () => ({ ...d.reefSource()?.stats, cached: d.reefSource()?.cached() ?? [] }),
    reefReady: (i: number) => d.reefSource()?.get(i) !== null && d.reefSource() !== null,
    prefetchReefs: (i: number, count: number) => d.reefSource()?.prefetch(i - 1, count),
    journal: d.journal,
    stageBest: d.stageBest,
    stageJournal: d.stageJournal,
    /** Stage a board ("." or "0" empty, 1-6 colors; 64 chars) and tray piece ids. */
    setup(board: string, tray: (string | null)[]) {
      const g = decodeGame({
        ...encodeGame(newGame(1)),
        board: board.replace(/\./g, '0'),
        tray: tray.map((id, i) => (id ? { pieceId: id, color: ((i + 3) % 6) + 1 } : null)),
      });
      if (!g) throw new Error('setup: invalid board/tray');
      d.setState(g);
      return true;
    },
    /** Show a skin without touching the saved profile or unlocks. */
    debugSkin(id: string) {
      d.scene.sprites.setLook(lookFor(id));
      d.setState(d.state());
    },
    /** Audio QA: peak/RMS of every sound effect rendered offline. */
    async audioLevels() {
      const out: Record<string, { peak: number; rms: number }> = {};
      const cases: [string, (s: Sfx) => void][] = [
        ['pick', (s) => s.pick()],
        ['place', (s) => s.place(4)],
        ['placeBig', (s) => s.place(9)],
        ['seal', (s) => s.seal(6)],
        ['invalid', (s) => s.invalid()],
        ['capture', (s) => s.capture(1, 1, 0)],
        ['captureBig', (s) => s.capture(12, 8, 0)],
        ['cascade', (s) => [0, 1, 2].forEach((k) => s.capture(6, 4, k, k * 0.15))],
        ['cleanReef', (s) => s.cleanReef()],
        ['jackpot', (s) => s.jackpot(3)],
        // what a real jackpot sounds like: three cascade waves + the swell on top
        [
          'jackpotMoment',
          (s) => [0, 1, 2].forEach((k) => (s.capture(12, 9, k, k * 0.15), k === 2 && s.jackpot(3, 0.42))),
        ],
        ['streakMilestone', (s) => s.streakMilestone(10)],
        ['discovery', (s) => s.discovery()],
        ['deal', (s) => s.deal()],
        ['newBest', (s) => s.newBest()],
        ['gameOver', (s) => s.gameOver()],
        ['click', (s) => s.click()],
      ];
      for (const [k, f] of cases) out[k] = await d.sfx.measure(f);
      // 16 beats of music (day and night), rendered offline through the same master bus
      for (const night of [false, true])
        out[night ? 'musicNight' : 'music'] = await d.sfx.measure((s) => {
          const m = new Music(() => s.graph());
          m.night = night;
          m.renderBeats(16);
        }, 15);
      return out;
    },
  };
  (window as unknown as { __atoll: typeof api }).__atoll = api;
}
