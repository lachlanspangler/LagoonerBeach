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
import { lookFor } from '../render/skins.ts';
import { drawCreature, loadCreatureArt } from '../render/creatures.ts';
import { SPECIES_BY_ID } from '../meta/creatures.ts';
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
  taskTimes: number[];
  pickDrawnAt: number[];
  dropDrawnAt: number[];
  commit(m: Move, from: { x: number; y: number } | null, quiet?: boolean): boolean;
  restart(): void;
  switchMode(m: 'classic' | 'daily' | 'puzzle'): void;
  loadPuzzle(i: number): void;
  puzzleSolution(): unknown;
  reefSource(): ReefSource | null;
  journal(): unknown;
  /** Screenshots only: show a believable best score / a well-filled journal (not saved). */
  stageBest(n: number, score?: number): void;
  /** How many times the loaded font set changed and the text sprites were rebuilt. */
  fontsRuns(): number;
  /** A leaderboard's Play button for that mode (asks first when it would end a run in progress). */
  playFromBoard(m: 'classic' | 'daily'): void;
  stageJournal(ids: string[]): void;
  /** The journal's "new" dots: mark these species as looked at. */
  markSeen(ids: string[]): void;
  /** Celebration staging (ADR 0012): frozen clock, combo, records, discoveries. */
  celebrate: {
    /** Freeze the render clock at `ms` after the last move (null = live again). */
    freeze(msAfterMove: number | null): void;
    /** Freeze now and treat it as the next move's dispatch time; returns it. */
    freezeNow(): number;
    stageCombo(n: number, dry?: number): void;
    /** Set the stored best (so a capture crosses it, or the results show a record). */
    stageRecord(best: number): void;
    revealSpecies(id: string, o?: { golden?: boolean; size?: number }): void;
    /** Play the chapter-complete moment now (relative times as after a move). */
    chapterMoment(chapter: number, name: string): void;
    /** The word on the board right now (if any). */
    celebrateWord(): string | null;
    /** The first-run line in the strip (null when it isn't showing). */
    coach(): string | null;
    /** NEW BEST: when a banner started (-1e9 = never) and whether the HUD line says it. */
    celebrateBest(): { bannerAt: number; hud: boolean };
    /** The best the HUD compares against (the record this run chases) and whether it says NEW BEST. */
    hudBest(): { best: number; newBest: boolean };
    revealState(): { id: string; modal: boolean; settled: boolean; expr?: string } | null;
    revealFreeze(t: number): boolean;
    revealSkip(): void;
    haptics(): { k: string; t: number }[];
    shareCard(id: string): Promise<{ w: number; h: number; png: number; text: string[]; hint: string }>;
    /** Run the real share path for a species card; resolves to the outcome. */
    shareTry(id: string): Promise<string>;
    showResults(o: { score: number; prevBest: number; lb?: boolean }): void;
  };
}

export function installDebugApi(d: DebugDeps): void {
  const api = {
    state: d.state,
    mode: d.mode,
    profile: d.profile,
    layout: () => d.scene.layout,
    frameTimes: () => d.frameTimes.slice(),
    drawTimes: () => d.drawTimes.slice(),
    taskTimes: () => d.taskTimes.slice(),
    pickDrawnAt: () => d.pickDrawnAt.slice(),
    dropDrawnAt: () => d.dropDrawnAt.slice(),
    clearFrames: () => {
      d.frameTimes.length = 0;
      d.drawTimes.length = 0;
      d.taskTimes.length = 0;
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
      const tc = d.scene.trayCell(p);
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
        d.commit(m, null, true);
      }
      return d.state().moves;
    },
    restart: d.restart,
    /** Make the next `n` scene draws throw (the loop must log and keep running). */
    breakDraw(n = 1) {
      const sc = d.scene as unknown as { draw: (...a: unknown[]) => void };
      const orig = sc.draw;
      let left = n;
      sc.draw = function (this: unknown, ...a: unknown[]) {
        if (left-- > 0) throw new Error('injected draw fault');
        sc.draw = orig;
        return orig.apply(this, a);
      };
    },
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
    fontsRuns: d.fontsRuns,
    playFromBoard: d.playFromBoard,
    /** Show a chip (lesson / reef of the day / welcome back) now. */
    toast: (text: string, life = 3000) => d.scene.toast(text, performance.now(), life),
    stageJournal: d.stageJournal,
    markSeen: d.markSeen,
    ...d.celebrate,
    /** Commit a move directly (no drag; flight 0) — for frozen-clock staging. */
    commitMove: (m: Move) => d.commit(m, null),
    /**
     * Stage a board ("." or "0" empty, 1-6 colors; 64 chars) and tray piece ids. In puzzle mode the
     * staged game stays a reef game (no refills; `seed` = reef index, default the current one).
     */
    setup(board: string, tray: (string | null)[], seed?: number) {
      const cur = d.state();
      const puzzle = cur.mode === 'puzzle';
      const g = decodeGame({
        ...encodeGame(newGame(1)),
        ...(puzzle ? { mode: 'puzzle' as const, seed: seed ?? cur.seed, rng: 0 } : {}),
        board: board.replace(/\./g, '0'),
        tray: tray.map((id, i) => (id ? { pieceId: id, color: ((i + 3) % 6) + 1 } : null)),
      });
      if (!g) throw new Error('setup: invalid board/tray');
      d.setState(g);
      return true;
    },
    /** Show a skin without touching the saved profile or unlocks. */
    /**
     * Framed-view fit (art critique round 5): the species drawn at rest (idle, still) in an `s` px
     * box with `fit`, measured on a scratch 3s canvas. Returns how far its opaque pixels reach past
     * the box on the worst side, as a share of the box (negative = margin to spare).
     */
    speciesIds: () => [...SPECIES_BY_ID.keys()],
    async artFit(id: string, fit: 'detail' | 'tile' = 'detail', s = 176, night = false) {
      await loadCreatureArt();
      const sp = SPECIES_BY_ID.get(id);
      if (!sp) return null;
      const W = s * 3;
      const c = document.createElement('canvas');
      c.width = c.height = W;
      const g = c.getContext('2d', { willReadFrequently: true })!;
      drawCreature(g, sp, W / 2, W / 2, s, 0, { fit, still: true, night, expression: 'idle', awake: true });
      const d = g.getImageData(0, 0, W, W).data;
      let l = W;
      let r = -1;
      let t = -1;
      let b = -1;
      for (let i = 3; i < d.length; i += 4)
        if (d[i]! > 40) {
          const p = (i - 3) / 4;
          const x = p % W;
          const y = (p - x) / W;
          if (t < 0) t = y;
          b = y;
          l = Math.min(l, x);
          r = Math.max(r, x);
        }
      if (t < 0) return null;
      const box0 = W / 2 - s / 2;
      const box1 = W / 2 + s / 2;
      const over = Math.max(box0 - l, r + 1 - box1, box0 - t, b + 1 - box1);
      return { over: over / s, w: (r - l + 1) / s, h: (b - t + 1) / s };
    },
    debugSkin(id: string) {
      d.scene.sprites.setLook(lookFor(id));
      d.setState(d.state());
    },
    /** Automated runs are silent (live output muted; offline QA renders still measure). */
    audioMuted: () => d.sfx.muteOutput,
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
        // ADR 0012: tier stings, combo layers, screen-filling whoosh, results fanfare, reveals
        ['stingNice', (s) => s.sting('nice')],
        ['stingLagoon', (s) => s.sting('lagoon')],
        ['stingAtoll', (s) => s.sting('atoll')],
        ['stingRiptide', (s) => s.sting('riptide')],
        ['stingSpotless', (s) => s.sting('spotless')],
        ['stingAmazing', (s) => s.sting('amazing')],
        ['whoosh', (s) => s.whoosh()],
        ['comboLevel', (s) => s.comboLevel(4)],
        ['comboBreak', (s) => s.comboBreak()],
        ['captureCombo20', (s) => s.capture(6, 12, 0, 0, 3)],
        // the biggest in-game moment: 3 waves at combo 20 + Amazing sting + whoosh
        [
          'amazingMoment',
          (s) => (
            [0, 1, 2].forEach((k) => s.capture(12, 12, k, k * 0.15, 3)),
            s.sting('amazing', 0.46),
            s.whoosh(0.52)
          ),
        ],
        ['fanfare', (s) => s.fanfare()],
        ['revealUncommon', (s) => s.reveal('uncommon')],
        ['revealLegendary', (s) => s.reveal('legendary')],
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
