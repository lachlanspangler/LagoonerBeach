/**
 * App entry: wires core ⇄ input ⇄ scene/fx ⇄ audio/haptics ⇄ storage ⇄ UI.
 */
import {
  applyMove,
  newGame,
  previewMove,
  legalMoves,
  type GameEvent,
  type GameState,
  type Move,
} from '../core/game.ts';
import { dailySeed, dayIndex, recordDaily, visibleStreak } from '../core/daily.ts';
import { pieceById } from '../core/pieces.ts';
import { hashSeed } from '../core/rng.ts';
import { N } from '../core/grid.ts';
import { fitsAnywhere } from '../core/rules.ts';

import { Sfx } from '../audio/sfx.ts';
import { LazyMusic } from '../audio/lazyMusic.ts';
import { DragController } from '../input/drag.ts';
import { Haptics } from '../platform/haptics.ts';
import {
  loadDaily,
  loadDailyRun,
  loadGame,
  loadGameRun,
  loadJournal,
  saveJournal,
  eraseAll,
  loadProfile,
  saveDaily,
  saveGame,
  saveProfile,
  type Profile,
} from '../platform/storage.ts';
import { Scene } from '../render/scene.ts';
import { DAY, NIGHT, fmt } from '../render/theme.ts';
import { Fx } from './fx.ts';
import { Ui } from '../ui/overlay.ts';
import { SKINS, unlockedIds, type ProgressSnapshot } from '../meta/unlocks.ts';
import { lookFor } from '../render/skins.ts';
import { shareText, type LagoonShape } from '../meta/share.ts';

import type { PuzzleDef } from '../core/puzzle.ts';
import { initNative, isNative } from '../platform/native.ts';
import { catchCapture, type LagoonCatch } from '../meta/catch.ts';
import { record, type Journal } from '../meta/journal.ts';
import { SPECIES_BY_ID } from '../meta/creatures.ts';
import type { DebugDeps } from './debug.ts';
import type { ReefSource } from './reefSource.ts';
import type * as ReefMode from './reefMode.ts';
import type { ChapterCompleteDetail } from './reefProgress.ts';
import { MAX_REEF } from '../core/reefConst.ts';
import type { RevealItem } from '../ui/reveal.ts';
import { LazyReveal } from '../ui/reveal-lazy.ts';
import { showRetry } from '../ui/retry.ts';
import { installPreloadRecovery } from '../platform/lazy.ts';
import { freshSeed as envSeed, today } from './env.ts';
import { RunLog, hasPendingLbWork, markForget, type FinishedRun } from '../platform/runlog.ts';
import type { LeaderboardUi } from '../ui/leaderboard.ts';

type Mode = 'classic' | 'daily' | 'puzzle';
let PACK: (PuzzleDef & { tier?: string })[] | null = null;
/** Shipped + endless reefs (generated in a worker, cached, prefetched). Exists once PACK is loaded. */
let reefs: ReefSource | null = null;
/**
 * Reefs-mode code (reef source + generator, puzzle rules, hint solver, chapters): its own chunk,
 * loaded with the pack and prefetched at idle. Set together with PACK, so every `mode === 'puzzle'`
 * path (only reachable once the pack is loaded) may use `reefMode!`.
 */
let reefMode: typeof ReefMode | null = null;
async function loadPack(): Promise<NonNullable<typeof PACK>> {
  if (PACK && reefMode) return PACK;
  // nothing is kept from a failed attempt: the next call fetches again (retry chip / reef error)
  const [pack, m] = await Promise.all([import('../content/puzzles.json'), import('./reefMode.ts')]);
  if (!reefMode) {
    reefMode = m;
    // Chapter milestone (ADR 0012): a screen-filling moment on the board; the reef card waits for it.
    m.reefEvents.addEventListener('chapterComplete', (e) => {
      const d = (e as CustomEvent<ChapterCompleteDetail>).detail;
      const now = clock();
      chapterHold = Math.max(0, fx.chapterComplete(now, d.chapter, d.name) - now - 1300 + 250);
      ui.announce(`Chapter ${d.chapter}, ${d.name}, complete`);
    });
  }
  PACK ??= pack.default as NonNullable<typeof PACK>;
  reefs ??= new m.ReefSource(PACK as unknown as ConstructorParameters<typeof ReefSource>[0]);
  return PACK;
}
/** Reef at 0-based index i, if available now (shipped, or generated and cached). */
const reefAt = (i: number) => reefs?.get(i) ?? null;
const TIER_LABEL: Record<string, string> = { calm: 'Calm', tricky: 'Tricky', deep: 'Deep', abyss: 'Abyss' };

const params = new URLSearchParams(location.search);
/** Debug/test only: a frozen clock renders one exact frame of any moment (pixel baselines). */
let frozen: number | null = null;
const clock = (): number => frozen ?? performance.now();
// Debug hooks (window.__atoll) exist only in dev and in builds made with VITE_DEBUG=1 (Playwright's
// e2e build, the debug APK); a release build compiles them out entirely — ?debug=1 does nothing there.
const DEBUG_BUILD = import.meta.env.DEV || import.meta.env.VITE_DEBUG === '1';
const DEBUG = DEBUG_BUILD && (params.has('debug') || navigator.webdriver === true);

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true })!;
const scene = new Scene(canvas, ctx);
const sfx = new Sfx();
// automated runs (Playwright = webdriver; CDP probes pass ?mute) never make a sound; ?sound=1 opts in
sfx.muteOutput = (navigator.webdriver === true || params.has('mute')) && !params.has('sound');
const haptics = new Haptics();
const fx = new Fx(scene, sfx, haptics);
const music = new LazyMusic(() => sfx.graph());
/** Start music after the first gesture has unlocked audio (browsers require it). */
function wakeAudio(): void {
  if (document.hidden) return; // e.g. a theme change while backgrounded must not resume audio
  sfx.unlock();
  if (profile.settings.music && !document.hidden) music.start(freshSeed());
}
const profile: Profile = loadProfile();

const freshSeed = (): number => envSeed(params);
/** Move logs of the live Classic/Daily games, saved with them (leaderboards replay them). */
const runLog = new RunLog();
/** A new classic game's seed: a prefetched server seed if one is stored (a ranked Endless run). */
const classicSeed = (): number =>
  (!params.has('seed') && profile.firstRunDone ? runLog.ticketSeed() : null) ?? freshSeed();

let mode: Mode = params.get('mode') === 'daily' ? 'daily' : 'classic';
let dailyDate = today();
let state: GameState = startState();
/** A new game on a server ticket is saved at once, so a reload before the first move keeps it ranked. */
function saveIfTicketed(): void {
  const rec = mode === 'classic' && state.moves === 0 ? runLog.get('classic', state) : null;
  if (rec?.runToken) saveGame(state, rec);
}
saveIfTicketed();
let teaching = !profile.firstRunDone && mode === 'classic' && state.moves === 0;
let overShown = false;
/** When the latest move was dispatched (debug freeze offsets are relative to it). */
let lastDispatchAt = 0;
let bestCelebrated = false;
/** Which game the per-game tallies below belong to. */
let tallyKey = '';
let journal: Journal = loadJournal();
/** This game's catch, for the end-of-game card. */
let gameCatch = { count: 0, newIds: [] as string[] };

/** Roll and record the creatures caught by this move's captures (if any). */
function catchFor(r: { state: GameState; events: readonly GameEvent[] }): {
  lagoons: LagoonCatch[];
  newIds: Set<string>;
  reveals: RevealItem[];
} {
  const lagoons: LagoonCatch[] = [];
  const newIds = new Set<string>();
  const reveals: RevealItem[] = [];
  for (const e of r.events) {
    if (e.type !== 'captured') continue;
    const env = {
      gameSeed: r.state.seed,
      move: r.state.moves,
      night: scene.palette.name === 'night',
      mode,
      tier: mode === 'puzzle' ? reefAt(r.state.seed)?.tier : undefined,
      reefWin: mode === 'puzzle' && reefMode!.puzzleStatus(r.state) === 'solved',
    };
    const lc = catchCapture({ waves: e.waves, streak: e.streak, clean: e.score.cleanBonus > 0 }, env, {
      has: (id) => !!journal.entries[id],
      dry: journal.dry,
    });
    for (const l of lc) {
      // the first golden of a species already found is a find too
      for (const c of l.catches)
        if (c.golden && journal.entries[c.id] && !journal.entries[c.id]!.golden && !reveals.some((r) => r.id === c.id))
          reveals.push({ id: c.id, size: c.size, golden: true, firstGolden: true });
      const rec = record(journal, l.catches, today());
      journal = rec.journal;
      gameCatch.count += l.catches.length;
      for (const id of rec.newSpecies) {
        newIds.add(id);
        gameCatch.newIds.push(id);
        const c = l.catches.find((x) => x.id === id)!;
        reveals.push({ id, size: c.size, golden: c.golden });
      }
    }
    lagoons.push(...lc);
  }
  if (lagoons.length) saveJournal(journal);
  if (newIds.size) ui.markUnseen(journal);
  if (newIds.size)
    ui.announce(`New in your journal: ${[...newIds].map((id) => SPECIES_BY_ID.get(id)?.name).join(', ')}`);
  return { lagoons, newIds, reveals };
}
/** Biggest lagoon of the current game (for the daily share picture). */
let bigLagoon: LagoonShape | null = null;

function startState(): GameState {
  if (mode === 'puzzle' && PACK) {
    const want = profile.puzzle.index;
    const i = reefAt(want) ? want : Math.min(want, PACK.length - 1);
    return reefMode!.newPuzzleGame(reefAt(i)!, i);
  }
  if (mode === 'daily') {
    const g = loadDaily(dailyDate);
    return (
      runLog.resume('daily', g, g && loadDailyRun(dailyDate, g), dailyDate) ??
      newGame(dailySeed(dailyDate), { mode: 'daily' })
    );
  }
  if (params.has('seed')) return newGame(freshSeed(), { teach: !profile.firstRunDone });
  const g = loadGame();
  return runLog.resume('classic', g, g && loadGameRun(g)) ?? newGame(classicSeed(), { teach: !profile.firstRunDone });
}

// ------------------------------------------------------------------ theme & motion
const darkQuery = matchMedia('(prefers-color-scheme: dark)');
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
function applyTheme(): void {
  const t = profile.settings.theme === 'auto' ? (darkQuery.matches ? 'night' : 'day') : profile.settings.theme;
  scene.setPalette(t === 'night' ? NIGHT : DAY);
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]:not([media])')?.remove();
  const m = document.createElement('meta');
  m.name = 'theme-color';
  m.content = scene.palette.bg;
  document.head.append(m);
  const rm = profile.settings.reducedMotion ?? motionQuery.matches;
  scene.reducedMotion = rm;
  document.documentElement.dataset.rm = rm ? '1' : '0';
  scene.textScale = profile.settings.largeText ? 1.25 : 1;
  document.documentElement.dataset.large = profile.settings.largeText ? '1' : '0';
  document.documentElement.dataset.motion = rm ? 'reduced' : 'full'; // creature idles (ADR 0011)
  scene.particles.budget = rm ? 0.3 : 1;
  // always-on styles (e.g. Glyph) and anything earned so far — not only after a game ends
  for (const id of unlockedIds(snapshot())) if (!profile.unlocked.includes(id)) profile.unlocked.push(id);
  if (!profile.unlocked.includes(profile.settings.skin)) profile.settings.skin = 'pebble';
  scene.sprites.setLook(lookFor(profile.settings.skin));
  idle(() => scene.warmSprites());
  sfx.enabled = profile.settings.sound;
  music.night = t === 'night';
  music.enabled = profile.settings.music;
  if (!music.enabled) music.stop();
  else if (music.playing || sfx.graph()) wakeAudio();
  haptics.enabled = profile.settings.haptics;
  dirty = true;
}
darkQuery.addEventListener('change', applyTheme);
motionQuery.addEventListener('change', applyTheme);

// ------------------------------------------------------------------ layout
// Persistent probe: WebKit settles safe-area insets after first layout (and on rotation), so we
// watch the probe's size instead of reading env() once at startup.
const probe = document.createElement('div');
probe.style.cssText =
  'position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;width:calc(env(safe-area-inset-left) + env(safe-area-inset-right) + 1px);height:calc(env(safe-area-inset-top) + env(safe-area-inset-bottom) + 1px);padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);box-sizing:content-box';
document.body.append(probe);
new ResizeObserver(() => resize()).observe(probe);
function insets() {
  const cs = getComputedStyle(probe);
  const r = {
    top: parseFloat(cs.paddingTop) || 0,
    right: parseFloat(cs.paddingRight) || 0,
    bottom: parseFloat(cs.paddingBottom) || 0,
    left: parseFloat(cs.paddingLeft) || 0,
  };
  return r;
}
function resize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const ins = insets();
  // keep the HUD clear of the menu buttons
  scene.resize(w, h, Math.min(3, window.devicePixelRatio || 1), { ...ins, top: ins.top + 6 });
  aimJournal();
  // DOM overlays that sit on the play screen (the common-discovery pop) follow the canvas layout
  const l = scene.layout;
  const root = document.documentElement.style;
  root.setProperty('--board-top', `${l.board.y}px`);
  root.setProperty('--board-bottom', `${l.board.y + l.board.h}px`);
  // the common-discovery pop (≈56 px tall) centers in the strip, never over the board's last row
  root.setProperty('--strip-y', `${Math.max(scene.stripY(), l.board.y + l.board.h + 38)}px`);
  idle(() => scene.warmSprites());
  dirty = true;
}
window.addEventListener('resize', resize);
/** Caught creatures swim to the Beach Journal button (the menu in Reefs, where the bulb takes its place). */
function aimJournal(): void {
  const mb = ui.journalButton().getBoundingClientRect();
  scene.journalTarget = mb.width ? { x: mb.left + mb.width / 2, y: mb.top + mb.height / 2 } : null;
}

// ------------------------------------------------------------------ sync scene with state
/** Bumped whenever a different game is shown; delayed UI from an older game must not fire. */
let gameToken = 0;
function later(ms: number, fn: () => void): void {
  const token = gameToken;
  setTimeout(() => token === gameToken && fn(), ms);
}

function syncScene(): void {
  gameToken++;
  drag.cancelAll();
  scene.board = state.board.slice();
  scene.land.fill(-1e9);
  scene.burst.clear();
  scene.celebrate.reset(state.streak, state.dry);
  reveal.clear();
  scene.lagoons = [];
  scene.texts = [];
  scene.placing = [];
  scene.fish = [];
  scene.sweep = -1e9;
  scene.ripples = [];
  scene.shake = { start: -1e9, amp: 0 };
  scene.scorePunch = { at: -1e9, amp: 0, gold: false };
  scene.scoreRoll = { at: -1e9, ms: 0, from: 0, to: 0 };
  scene.clearChips();
  scene.particles.clear();
  const now = performance.now();
  scene.tray = state.tray.map((t, i) => ({ t, dealStart: now + i * 60, back: null }));
  scene.score = state.score;
  scene.pendingScore = null;
  scene.shownScore = state.score;
  scene.best = mode === 'daily' ? (profile.dailyBest[dailyDate] ?? 0) : profile.best;
  scene.streak = state.streak;
  scene.dry = state.dry;
  scene.gameOverAt = state.over ? now : -1;
  scene.preview = null;
  scene.drag = null;
  fx.reset();
  drag.clearSel();
  scene.selected = null;
  overShown = false;

  // per-game tallies belong to one game: reset on a fresh game or when a different game is shown
  const key = `${mode}:${mode === 'daily' ? dailyDate : ''}:${state.seed}`;
  if (state.moves === 0 || key !== tallyKey) {
    tallyKey = key;
    bestCelebrated = false;
    gameCatch = { count: 0, newIds: [] };
    bigLagoon = null;
    puzzleMoves = [];
  }
  updateHint();
  updateMisfits();
  scene.hudLabel = null;
  scene.modeTag = mode === 'daily' ? dailyTag() : '';
  const p = mode === 'puzzle' ? reefAt(state.seed) : null;
  if (p) {
    const i = state.seed;
    const solved = profile.puzzle.solved.includes(p.id);
    const pure = profile.puzzle.pure?.includes(p.id) ?? false;
    // the instruction only while it's news (first three reefs); afterwards the tier and your mark
    const status = pure ? '✓ No hints' : solved ? '✓ Cleared' : i < 3 ? 'Clear every pebble' : '';
    const tag = i === dailyReefIndex() ? 'Reef of the day' : (TIER_LABEL[p.tier ?? ''] ?? '');
    const c = reefMode!.chapterOf(i + 1);
    const first = c.first;
    const solvedNow = new Set(profile.puzzle.solved);
    scene.hudLabel = {
      top: reefMode!.chapterLabel(i + 1),
      big: `Reef ${i + 1}`,
      sub: [tag, status].filter(Boolean).join(' · '),
      tier: p.tier ?? 'endless',
      chapter: {
        name: `${reefMode!.chapterName(c.chapter)} · ${c.pos} of ${reefMode!.CHAPTER_SIZE}`,
        segs: Array.from({ length: reefMode!.CHAPTER_SIZE }, (_, k) =>
          solvedNow.has(reefMode!.reefId(first + k)) ? 1 : k === c.pos - 1 ? 2 : 0,
        ),
      },
    };
    reefs!.pin(i);
    reefs!.prefetch(i); // the next few reefs are ready before "Next reef" is tapped
  }
  ui.setMode(mode, visibleStreak(profile.daily, dayIndex(today())), journal);
  aimJournal();
  dirty = true;
}

function updateMisfits(): void {
  scene.misfit = state.tray.map((t) => t !== null && !fitsAnywhere(state.board, pieceById(t.pieceId)));
}

// ------------------------------------------------------------------ teaching hint
function updateHint(): void {
  // first run: say the goal in the strip until the first lagoon (UX S3 must-fix 3)
  scene.coach = teaching && mode === 'classic' && !state.over ? 'Close a ring of blocks' : null;
  if (mode === 'puzzle') {
    scene.hint = null; // puzzle hints are on demand only
    return;
  }
  // second lesson: after the first pinch, point out the first chance at a bigger (2+ cell) lagoon
  const lesson2 = !teaching && profile.firstRunDone && !profile.lesson2Done && mode === 'classic';
  if ((!teaching && !lesson2) || state.over) {
    scene.hint = null;
    return;
  }
  // suggest the best capturing move available within the current tray (or the cup's spot first)
  if (state.moves === 0) {
    const cup = pieceById('cup-up');
    const slot = state.tray.findIndex((t) => t?.pieceId === 'cup-up');
    if (slot >= 0) {
      scene.hint = {
        cells: cup.cells.map(([dx, dy]) => (4 + dy) * N + 2 + dx),
        start: performance.now(),
        demo: { slot, ax: 2, ay: 4 },
      };
      return;
    }
  }
  let best: { m: Move; pts: number } | null = null;
  for (const m of legalMoves(state)) {
    const pv = previewMove(state, m)!;
    const area = pv.pockets.reduce((x, p) => x + p.cells.length, 0);
    if (pv.pockets.length && (!lesson2 || area >= 2) && (!best || pv.points > best.pts)) best = { m, pts: pv.points };
  }
  if (best) {
    const p = pieceById(state.tray[best.m.slot]!.pieceId);
    scene.hint = {
      cells: p.cells.map(([dx, dy]) => (best!.m.y + dy) * N + best!.m.x + dx),
      start: performance.now(),
      demo: { slot: best.m.slot, ax: best.m.x, ay: best.m.y },
    };
  } else scene.hint = null;
}

// ------------------------------------------------------------------ moves
/** `quiet`: bot autoplay (tests) records discoveries without staging their reveals. */
function commit(m: Move, from: { x: number; y: number } | null, quiet = false): boolean {
  if (startWaiting) return false; // the next game is being dealt
  const t0 = performance.now();
  const r = applyMove(state, m);
  if (!r) return false;
  if (mode !== 'puzzle') runLog.record(state, m, mode, dailyDate);
  if (mode === 'classic' && state.moves === 0 && LB_ON && LB_URL) {
    // a ticketed run starts its server clock at the first move (offline: the run isn't speed-checked)
    const tok = runLog.get('classic')?.runToken;
    if (tok)
      void lbui().then(
        (l) => l.client.markStarted(tok),
        () => undefined,
      );
  }
  const prevBest = mode === 'daily' ? (profile.dailyBest[dailyDate] ?? 0) : profile.best;
  const prevScore = state.score;
  state = r.state;
  // the moment you pass your best, mid-game (once per game)
  persist();
  const caught = catchFor(r);
  const t = clock();
  lastDispatchAt = t;
  fx.dispatch(r.events, t, from, {
    firstCapture: teaching,
    catches: caught.lagoons,
    newIds: caught.newIds,
    after: { streak: state.streak, dry: state.dry },
  });
  // the moment you pass your best, mid-game: one gold banner under the score (once per game)
  if (mode !== 'puzzle' && prevBest > 0 && prevScore <= prevBest && state.score > prevBest && !bestCelebrated) {
    bestCelebrated = true;
    fx.newBest(t);
  }
  scene.dry = state.dry;
  for (const e of r.events) {
    if (e.type === 'captured') {
      profile.stats.captures += e.pockets.length;
      if (e.waves.length > 1) profile.stats.cascades++;
      if (e.score.cleanBonus) profile.stats.cleanReefs++;
      profile.stats.bestPocket = Math.max(profile.stats.bestPocket, ...e.pockets.map((p) => p.cells.length));
      for (const p of e.pockets)
        if (!bigLagoon || p.cells.length > bigLagoon.cells.length) bigLagoon = { cells: p.cells, ring: p.ring };
      if (teaching) {
        teaching = false;
        profile.firstRunDone = true;
        // name it, then the one-line rule, while the water is still on the board
        scene.toast("That's a lagoon!", t + 350, 1700);
        scene.toast('Water fills any closed ring', t + 350, 2200);
      } else if (!profile.lesson2Done && e.pockets.reduce((x, p) => x + p.cells.length, 0) >= 2) {
        profile.lesson2Done = true;
        later(900, () => scene.toast('Bigger lagoons, bigger catches', performance.now(), 1800));
      }
      ui.announce(
        `Captured ${e.pockets.length > 1 ? `${e.pockets.length} lagoons` : 'a lagoon'}, plus ${e.score.total}`,
      );
    }
  }
  if (mode === 'puzzle') {
    puzzleMoves.push(m);
    checkPuzzle();
  }
  // discoveries wait for everything this move set off to settle — the capture, NEW BEST, a chapter
  // moment (checkPuzzle) — never over it, then queue one at a time (the result cards wait for them)
  if (caught.reveals.length && !quiet) reveal.enqueue(caught.reveals, fx.settleAt + 80);
  if (mode !== 'puzzle' && state.over) finishGame(prevBest);
  saveProfile(profile);
  updateHint();
  updateMisfits();
  drag.clearSel();
  dirty = true;
  taskTimes.push(performance.now() - t0);
  return true;
}

function persist(): void {
  if (mode === 'puzzle') return; // puzzles are short; progress is the solved list
  if (mode === 'daily') saveDaily(dailyDate, state, runLog.get('daily'));
  else saveGame(state, runLog.get('classic', state));
}

function snapshot(): ProgressSnapshot {
  return {
    best: Math.max(profile.best, ...Object.values(profile.dailyBest), 0),
    bestPocket: profile.stats.bestPocket,
    cascades: profile.stats.cascades,
    cleanReefs: profile.stats.cleanReefs,
    games: profile.stats.games,
    captures: profile.stats.captures,
    dailyLongest: profile.daily.longest,
  };
}

/** Recompute unlocks; returns display names of skins unlocked just now. */
function refreshUnlocks(): string[] {
  const ids = unlockedIds(snapshot());
  const fresh = ids.filter((id) => !profile.unlocked.includes(id));
  profile.unlocked = ids;
  return fresh.map((id) => SKINS.find((k) => k.id === id)!.name);
}

function finishGame(prevBest: number): void {
  profile.stats.games++;
  profile.stats.totalScore += state.score;
  const newBest = state.score > prevBest;
  if (mode === 'daily') {
    dailyRank = null; // ask the board again next time (this game may have just been posted)
    profile.dailyBest[dailyDate] = Math.max(prevBest, state.score);
    profile.daily = recordDaily(profile.daily, dayIndex(dailyDate));
  } else if (newBest) profile.best = state.score;
  const unlockedNow = refreshUnlocks();
  saveProfile(profile);
  // snapshot now: the card must describe *this* game even if it shows a moment later
  const card = {
    score: state.score,
    best: Math.max(prevBest, state.score),
    newBest: newBest && prevBest > 0,
    moves: state.moves,
    lagoon: state.bestPocket,
    mode,
    dailyStreak: visibleStreak(profile.daily, dayIndex(today())),
    unlocked: unlockedNow,
    shape: bigLagoon && bigLagoon.cells.length >= 2 ? bigLagoon : null,
    caught: { ...gameCatch, newIds: [...gameCatch.newIds] },
    // starts posting now (if the player has a name) so the rank is ready when the card shows
    leaderboard: mode === 'puzzle' || !LB_ON ? undefined : lbResult(runLog.finish(state, mode), mode),
    prevBest,
    reducedMotion: scene.reducedMotion,
  };
  const token = gameToken;
  later(DEBUG && params.has('fast') ? 0 : 1400, () =>
    // a discovery still on screen finishes first; the results follow it
    reveal.whenIdle(() => {
      if (overShown || token !== gameToken) return;
      overShown = true;
      // freeze the score behind the card at the final value (no mid-count-up mismatch)
      scene.score = scene.shownScore = card.score;
      void ui.showGameOver(card, () => token === gameToken).then((c) => c && (resultCard = c));
    }),
  );
}

/** Daily HUD line: "Daily · Oct 26", plus "#12 today" once you're on today's board (boards on). */
let dailyRank: { date: string; rank: number | null; asked: boolean } | null = null;
function dailyTag(): string {
  const [y, m, d] = dailyDate.split('-').map(Number);
  const date = new Date(y!, m! - 1, d!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  if (dailyRank?.date !== dailyDate) dailyRank = { date: dailyDate, rank: null, asked: false };
  if (LB_ON && profile.lb?.name && !dailyRank.asked) {
    dailyRank.asked = true;
    const want = dailyDate;
    void lbui()
      // = boards.ts dailyBoard(want); spelled out so the initial chunk doesn't pull in boards.ts
      // (its name filter + word lists are leaderboard-only)
      .then((l) => l.client.view(`daily:${want}` as const))
      .then(
        (v) => {
          if (dailyRank?.date !== want || !v.me) return;
          dailyRank.rank = v.me.rank;
          if (mode === 'daily' && dailyDate === want) {
            scene.modeTag = dailyTag();
            dirty = true;
          }
        },
        () => undefined,
      );
  }
  return `Daily · ${date}${dailyRank.rank ? ` · #${fmt(dailyRank.rank)} today` : ''}`;
}

// ------------------------------------------------------------------ leaderboards (lazy: ui/leaderboard.ts)
const LB_URL = (import.meta.env.VITE_LB_URL as string | undefined) || undefined;
/**
 * Leaderboards are on only with a real server (`VITE_LB_URL`) or, for dev and tests, the on-device
 * demo backend (`VITE_LB=demo`: `vite` dev via .env.development, the e2e build in
 * playwright.config.ts). A release build without a URL — or any build with `VITE_LB=off` — ships
 * without leaderboards: no menu entry, no results button, no name entry, no network (ADR 0010).
 */
const LB_ON =
  import.meta.env.VITE_LB !== 'off' &&
  (!!LB_URL || import.meta.env.VITE_LB === 'demo') &&
  // debug: preview the release look (no boards) on a demo build — store shots use this
  !(DEBUG && params.has('nolb'));
let lbMod: Promise<LeaderboardUi> | null = null;
/** The last results card, so leaderboard sheets opened from it can go back to it. */
let resultCard: HTMLElement | null = null;
function lbui(): Promise<LeaderboardUi> {
  if (lbMod) return lbMod;
  const p = import('../ui/leaderboard.ts').then((m) =>
    m.createLeaderboardUi({
      ui,
      url: LB_URL,
      profile,
      save: () => saveProfile(profile),
      journal: () => journal,
      clientVersion: __APP_VERSION__,
      playDaily: () => (mode === 'daily' ? restart() : switchMode('daily')),
      playEndless: () => (mode === 'classic' ? restart() : switchMode('classic')),
      offline: DEBUG && params.has('lboffline'),
      lastRun: () => lastFinished,
      click: () => (wakeAudio(), sfx.click()),
      reducedMotion: () => scene.reducedMotion,
    }),
  );
  // a failed chunk fetch isn't cached: the next use retries
  p.catch(() => lbMod === p && (lbMod = null));
  return (lbMod = p);
}
/** Results-card hook: Leaderboard button (name entry → board), auto-post when already named. */
/** The last finished run ("Choose a name" on a boards sheet posts it if it wasn't posted or declined). */
let lastFinished: FinishedRun | null = null;
function lbResult(run: FinishedRun | null, m: 'classic' | 'daily') {
  lastFinished = run;
  type Hook = ReturnType<LeaderboardUi['forResult']>;
  let hook: Promise<Hook> | null = null;
  let btn: HTMLButtonElement | null = null;
  // the leaderboard module loads only for players who have opted in, or when the button is tapped
  const get = () => {
    if (hook) return hook;
    const p = lbui().then((l) => l.forResult(run, m, () => resultCard && ui.present(resultCard, false)));
    p.catch(() => hook === p && (hook = null));
    return (hook = p);
  };
  const named = !!profile.lb?.name;
  if (named) void get(); // opted in: post now, so the rank is ready when the card shows
  return {
    label: named ? 'Leaderboard' : 'Post your score',
    open: function open(): void {
      get().then(
        (x) => (btn && x.mount(btn), x.open()),
        () => showRetry(open),
      );
    },
    mount: (b: HTMLButtonElement) => {
      btn = b;
      if (named)
        get().then(
          (x) => x.mount(b),
          () => undefined,
        );
    },
  };
}
function openBoards(): void {
  lbui().then(
    (l) => l.showBoards(mode === 'daily' ? 'daily' : 'week'),
    () => showRetry(openBoards),
  );
}
/** Queued scores, pending deletions, a spare Endless seed: only touches the network when needed. */
const lbBackground = () =>
  LB_ON &&
  (LB_URL || hasPendingLbWork()) &&
  void lbui().then(
    (l) => l.background(),
    () => undefined,
  );
addEventListener('online', lbBackground);

function checkPuzzle(): void {
  const st = reefMode!.puzzleStatus(state);
  const i = state.seed;
  const p = reefAt(i);
  if (st === 'playing' || !p) return;
  if (st === 'solved') {
    const d = today();
    if (i === dailyReefIndex(d) && !(profile.puzzle.dailyDone ?? []).includes(d)) {
      profile.puzzle.dailyDone = [...(profile.puzzle.dailyDone ?? []), d];
      profile.daily = recordDaily(profile.daily, dayIndex(d));
      later(900, () => scene.toast(`Reef of the day ✓ · Streak ${profile.daily.current}`, performance.now(), 1800));
    }
    const first = !profile.puzzle.solved.includes(p.id);
    // the deepest reef cleared before this one (the reefs list's "Depth N m")
    const deepestBefore = Math.max(0, ...profile.puzzle.solved.map((id) => Number(id.replace(/\D/g, '')) || 0));
    let chapterDone: { chapter: number; name: string } | undefined;
    if (first) {
      profile.puzzle.solved.push(p.id);
      const cd = reefMode!.noteFirstClear(i + 1, profile.puzzle.solved); // 'chapterComplete' if this finished a chapter
      if (cd) chapterDone = { chapter: cd.chapter, name: cd.name };
    }
    profile.puzzle.pure ??= [];
    const hinted = profile.puzzle.hinted?.includes(p.id) ?? false;
    const reward = { first, pure: first && !hinted, ...(first && i + 1 > deepestBefore ? { depth: i + 1 } : {}) };
    if (!hinted && !profile.puzzle.pure.includes(p.id)) profile.puzzle.pure.push(p.id);
    profile.puzzle.index = Math.min(MAX_REEF - 1, i + 1);
    saveProfile(profile);
    const cleared = profile.puzzle.solved.length;
    const newIds = [...gameCatch.newIds];
    const ch = reefMode!.chapterOf(i + 1).chapter;
    const done = reefMode!.chapterCleared(new Set(profile.puzzle.solved), ch);
    const progress = `${reefMode!.chapterName(ch)} · ${done} of ${reefMode!.CHAPTER_SIZE} cleared`;
    const hold = chapterHold;
    chapterHold = 0;
    const chFirst = (ch - 1) * reefMode!.CHAPTER_SIZE + 1;
    const solvedSet = new Set(profile.puzzle.solved);
    const segs = Array.from({ length: reefMode!.CHAPTER_SIZE }, (_, k) => solvedSet.has(reefMode!.reefId(chFirst + k)));
    const token = gameToken;
    // a discovery still on screen (the common pop included) finishes first; the card follows it
    later(1300 + hold, () =>
      reveal.whenIdle(
        () =>
          token === gameToken &&
          ui.showPuzzleResult(
            { solved: true, index: i, total: MAX_REEF, cleared, newIds, progress, segs, chapterDone, reward },
            () => token === gameToken,
          ),
      ),
    );
  } else {
    const cleared = profile.puzzle.solved.length;
    const token = gameToken;
    // "So close": a discovery made on the way still gets its reveal first (the card follows it)
    later(700, () =>
      reveal.whenIdle(
        () =>
          token === gameToken &&
          ui.showPuzzleResult({ solved: false, index: i, total: MAX_REEF, cleared }, () => token === gameToken),
      ),
    );
  }
}

/** Solver-backed hint: outline one placement that still leads to a clear (or say it's a dead end). */
/** Moves made in the current reef (to follow the stored solution cheaply). */
let puzzleMoves: Move[] = [];

/**
 * Next winning move. While the player's moves match a prefix of the stored solution, use it
 * (free); otherwise solve from the current position (smaller than the start, so fast enough).
 */
function nextPuzzleMove(): Move | null {
  const sol = reefAt(state.seed)!.solution;
  const onPath = puzzleMoves.every((h, i) => sol[i] && sol[i].piece === h.slot && sol[i].x === h.x && sol[i].y === h.y);
  const k = puzzleMoves.length;
  if (onPath && sol[k]) return { slot: sol[k].piece, x: sol[k].x, y: sol[k].y };
  const slots = state.tray.map((t, i) => (t ? i : -1)).filter((i) => i >= 0);
  const res = reefMode!.solve(
    state.board,
    slots.map((i) => state.tray[i]!.pieceId),
  );
  const m = res.first?.[0];
  return m ? { slot: slots[m.piece]!, x: m.x, y: m.y } : null;
}

function puzzleHint(): void {
  if (mode !== 'puzzle' || reefMode!.puzzleStatus(state) !== 'playing') return;
  const next = nextPuzzleMove();
  const l = scene.layout;
  if (!next) {
    scene.texts.push({
      text: 'Dead end — restart',
      x: l.w / 2,
      y: l.board.y + l.board.h * 0.4,
      start: performance.now(),
      size: l.cell * 0.6,
      life: 1600,
      strong: true,
    });
    ui.announce('Dead end. Restart the reef.');
    haptics.fire('fail');
  } else {
    const m = next;
    const p = pieceById(state.tray[m.slot]!.pieceId);
    scene.hint = { cells: p.cells.map(([dx, dy]) => (m.y + dy) * N + m.x + dx), start: performance.now() };
    profile.stats.hints = (profile.stats.hints ?? 0) + 1;
    // a hint blocks the no-hint mark for this reef until it has been cleared cleanly (restart can't launder it)
    profile.puzzle.hinted ??= [];
    const id = reefAt(state.seed)!.id;
    if (!profile.puzzle.hinted.includes(id) && !(profile.puzzle.pure?.includes(id) ?? false))
      profile.puzzle.hinted.push(id);
    saveProfile(profile);
    ui.announce('Hint shown on the board.');
  }
  dirty = true;
}

/** Reef of the day: one Tricky/Deep reef per date, the same for everyone. */
function dailyReefIndex(date = today()): number {
  if (!PACK) return 0;
  const pool = PACK.map((p, i) => (p.tier === 'tricky' || p.tier === 'deep' ? i : -1)).filter((i) => i >= 0);
  return pool[hashSeed(`reef-of-day:${date}`) % pool.length]!;
}

/** The reef the player asked for last (an endless reef may still be on its way from the worker). */
let reefWanted = -1;
function loadPuzzle(i: number): void {
  if (!PACK || !reefs) return;
  const k = Math.max(0, Math.min(MAX_REEF - 1, Math.floor(i)));
  reefWanted = k;
  const reef = reefAt(k);
  if (!reef) {
    // not generated yet (prefetch normally runs ahead): open it when the worker delivers
    ui.announce(`Charting reef ${k + 1}…`);
    void reefs.ensure(k).then(
      () => mode === 'puzzle' && reefWanted === k && loadPuzzle(k),
      () => mode === 'puzzle' && reefWanted === k && ui.showReefError(k, () => loadPuzzle(k)),
    );
    return;
  }
  ui.close();
  profile.puzzle.index = k;
  saveProfile(profile);
  state = reefMode!.newPuzzleGame(reef, k);
  puzzleMoves = [];
  syncScene();
}

function restart(): void {
  ui.close();
  if (mode === 'puzzle') return loadPuzzle(state.seed);
  if (mode === 'daily') {
    // the daily is one seed per day; replay keeps the best score
    dailyDate = today();
    state = newGame(dailySeed(dailyDate), { mode: 'daily' });
  } else if (LB_ON && LB_URL && profile.firstRunDone && !params.has('seed') && navigator.onLine) {
    // online with the real server: prefer a ticket issued now (the spare's clock has been running
    // since it was fetched); the spare, then a local unranked seed, are the fallbacks
    const tok = ++startToken;
    startWaiting = true;
    void lbui()
      .then((l) => l.client.freshTicket())
      .catch(() => null)
      .then((t) => {
        if (tok !== startToken || mode !== 'classic') return;
        startWaiting = false;
        newClassic(t ? runLog.useTicket(t) : classicSeed());
      });
    return;
  } else return newClassic(classicSeed());
  persist();
  syncScene();
}

/** A classic game is waiting for a fresh ticket (moves on the old board are ignored meanwhile). */
let startWaiting = false;
let startToken = 0;
function newClassic(seed: number): void {
  state = newGame(seed, { teach: !profile.firstRunDone });
  teaching = !profile.firstRunDone;
  lbBackground(); // fetch the next spare server seed
  persist(); // saves the ticket with the game, so a reload before the first move stays ranked
  syncScene();
}

let wantedMode: Mode = mode;
function switchMode(m: Mode): void {
  wantedMode = m;
  if (m === 'puzzle' && (!PACK || !reefAt(profile.puzzle.index))) {
    // only honor the pack (or endless reef) load if the player still wants puzzles when it arrives
    void loadPack()
      .then(() => reefs!.ensure(profile.puzzle.index))
      .then(
        () => wantedMode === 'puzzle' && switchMode('puzzle'),
        // the pack chunk didn't load, or the reef couldn't be generated: say so and offer a retry
        // (never "Charting…" forever, and the player's place is kept)
        () => {
          if (wantedMode !== 'puzzle') return;
          const i = profile.puzzle.index;
          if (!Number.isInteger(i) || i < 0 || i >= MAX_REEF) {
            profile.puzzle.index = 0; // not a reef at all: start from the first one
            return switchMode('puzzle');
          }
          ui.showReefError(i, () => switchMode('puzzle'));
        },
      );
    return;
  }
  ui.close();
  persist();
  mode = m;
  startToken++; // a fresh-ticket start still in flight is for a game the player has left
  startWaiting = false;

  dailyDate = today();
  state = startState();
  saveIfTicketed();
  teaching = !profile.firstRunDone && mode === 'classic' && state.moves === 0;
  syncScene();
}

/** Extra delay for the reef result card while a chapter moment plays (set by the listener in loadPack). */
let chapterHold = 0;

// ------------------------------------------------------------------ UI
const ui = new Ui({
  onOpenMenu: () =>
    ui.showMenu(
      profile,
      mode,
      !state.over,
      Object.keys(journal.entries).length,
      profile.daily.lastDay === dayIndex(today()),
      mode === 'puzzle'
        ? `Reef ${state.seed + 1}`
        : `${mode === 'daily' ? 'Daily' : 'Endless'}${state.score > 0 ? ` · ${fmt(state.score)}` : ''}`,
    ),
  onSettings: () => ui.showSettings(profile),
  onJournal: () => ui.showJournal(journal),
  onLeaderboards: LB_ON ? openBoards : undefined,
  onErase: () => {
    erasing = true; // don't let the unload handlers write it all back
    const lbId = profile.lb?.installId;
    eraseAll();
    if (lbId) markForget(lbId); // the next launch asks the server to delete this player (then forgets the id)
    location.reload();
  },
  onResume: () => ui.close(),
  onNewGame: () => restart(),
  onDaily: () => (mode === 'daily' ? restart() : switchMode('daily')),
  onHint: () => puzzleHint(),
  onClassic: () => switchMode('classic'),
  onPuzzles: () => switchMode('puzzle'),
  onPuzzleNext: () => mode === 'puzzle' && loadPuzzle(state.seed + 1),
  onPuzzleRetry: () => mode === 'puzzle' && loadPuzzle(state.seed),
  onPuzzleList: () =>
    PACK &&
    ui.showReefs({
      shipped: PACK,
      solved: profile.puzzle.solved,
      pure: profile.puzzle.pure ?? [],
      current: mode === 'puzzle' ? state.seed : profile.puzzle.index,
      daily: { index: dailyReefIndex(), done: (profile.puzzle.dailyDone ?? []).includes(today()) },
      tierOf: (i) => reefAt(i)?.tier,
    }),
  onPuzzlePick: (i) => {
    if (mode !== 'puzzle') return;
    loadPuzzle(i);
  },

  onToggle: (k) => {
    if (k === 'reducedMotion')
      profile.settings.reducedMotion = !(profile.settings.reducedMotion ?? motionQuery.matches);
    else if (k === 'largeText') profile.settings.largeText = !profile.settings.largeText;
    else profile.settings[k] = !profile.settings[k];
    saveProfile(profile);
    applyTheme();
    ui.showSettings(profile);
  },
  onSkin: () => {
    const ids = profile.unlocked;
    profile.settings.skin = ids[(ids.indexOf(profile.settings.skin) + 1) % ids.length] ?? 'pebble';
    saveProfile(profile);
    applyTheme();
    syncScene();
    ui.showSettings(profile);
  },
  onTheme: (t) => {
    profile.settings.theme = t;
    saveProfile(profile);
    applyTheme();
    ui.showSettings(profile);
  },
  onShare: () => {
    const text = shareText({
      date: dailyDate,
      score: state.score,
      streak: profile.daily.current,
      lagoon: bigLagoon,
      bestPocket: state.bestPocket,
    });

    if (navigator.share) void navigator.share({ text }).catch(() => undefined);
    else void navigator.clipboard?.writeText(text).then(() => ui.announce('Copied result'));
  },
  onClick: () => {
    wakeAudio();
    sfx.click();
  },
  onRecord: () => {
    sfx.fanfare();
    haptics.fire('heavy');
  },
});

// A discovery never opens between a quick player's moves: it waits until the board and tray have
// been still for REVEAL_QUIET_MS (no press, no drag), so the next drag can't land on a fresh card.
const REVEAL_QUIET_MS = 600;
/** A press this soon after a card opens was aimed at the board: it never skips or closes the card. */
const REVEAL_GRACE_MS = 250;
let boardActiveAt = -Infinity;
let revealOpenedAt = -Infinity;
// any pointer event on the board/tray counts (a mouse homing in on the next piece is play too)
const markBoardActive = (): void => void (boardActiveAt = performance.now());
for (const t of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'] as const)
  canvas.addEventListener(t, markBoardActive, { capture: true, passive: true });
const revealGrace = (e: Event): void => {
  if (performance.now() - revealOpenedAt >= REVEAL_GRACE_MS || !reveal.current()?.modal) return;
  const t = e.target;
  if (!(t instanceof Element) || !t.closest('.reveal')) return;
  e.stopImmediatePropagation();
  e.preventDefault();
};
// window capture, registered before the reveal's own listeners, so it runs first
addEventListener('pointerdown', revealGrace, true);
addEventListener('click', revealGrace, true);

const reveal = new LazyReveal(document.getElementById('ui')!, {
  sfx,
  haptics,
  reducedMotion: () => scene.reducedMotion,
  night: () => scene.palette.name === 'night',
  announce: (t) => ui.announce(t),
  found: () => Object.keys(journal.entries).length,
  date: () => today(),
  playerName: () => profile.lb?.name || undefined,
  now: clock,
  canOpen: () => {
    const ok = scene.drag === null && !ui.open && performance.now() - boardActiveAt >= REVEAL_QUIET_MS;
    if (ok) revealOpenedAt = performance.now(); // the reveal opens right after a yes
    return ok;
  },
  onStrip: (ms) => {
    scene.holdStrip(performance.now() + ms);
    dirty = true;
  },
});

scene.onCollect = () => {
  const b = ui.journalButton();
  b.classList.remove('collect');
  void b.offsetWidth; // restart the animation
  b.classList.add('collect');
};

// ------------------------------------------------------------------ input
let sealKey = '';

const drag = new DragController(canvas, {
  layout: () => scene.layout,
  state: () => state,
  enabled: () => !ui.open && !reveal.blocking,
  onPick: () => {
    // fast play: the previous move's word leaves quickly (it won't describe the next board)
    scene.celebrate.hurry(clock());
    wakeAudio();
    sfx.pick();
    haptics.fire('tick');
    dirty = true;
  },
  onHover: (slot, _x, _y, anchor) => {
    const t = state.tray[slot];
    if (!t || !anchor) {
      scene.preview = null;
      sealKey = '';
      return;
    }
    const piece = pieceById(t.pieceId);
    const pv = previewMove(state, { slot, x: anchor.x, y: anchor.y });
    // seal tick: the moment a drag position would capture, the finger feels it
    const key = pv && pv.pockets.length ? `${slot}:${anchor.x},${anchor.y}` : '';
    if (key && key !== sealKey) {
      sfx.seal(pv!.pockets.reduce((a, p) => a + p.cells.length, 0));
      haptics.fire('tick');
    }
    sealKey = key;
    scene.preview = pv
      ? {
          ax: anchor.x,
          ay: anchor.y,
          piece,
          color: t.color,
          pocket: new Set(pv.pockets.flatMap((p) => p.cells)),
          ring: new Set(pv.cleared),
          points: pv.points,
        }
      : null;
  },
  onDrop: (slot, move, from, overBoard) => {
    scene.preview = null;
    const drawnAt = scene.lastDragDraw ?? from;
    scene.lastDragDraw = null;
    if (move && commit(move, drawnAt)) return;
    scene.tray[slot] = { ...scene.tray[slot]!, back: { ...from, start: performance.now() } };
    if (overBoard) {
      sfx.invalid();
      haptics.fire('tick');
    }
    dirty = true;
  },
  onSelect: (slot) => {
    scene.lastDragDraw = null; // a tap-to-place flies from the board anchor, not an old drag frame
    scene.selected = slot;
    if (slot === null) scene.preview = null;
    else {
      wakeAudio();
      sfx.pick();
      haptics.fire('tick');
      ui.announce('Piece selected. Tap the board to preview, tap again to place.');
    }
    dirty = true;
  },
  onCancel: (slot, from) => {
    scene.preview = null;
    scene.lastDragDraw = null;
    scene.tray[slot] = { ...scene.tray[slot]!, back: { ...from, start: performance.now() } };
    dirty = true;
  },
});

// ------------------------------------------------------------------ lifecycle
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (erasing) return;
    persist();
    saveProfile(profile);
    music.stop();
    sfx.suspend();
  } else {
    dirty = true;
    if (sfx.graph()) wakeAudio();
  }
});
let erasing = false;
window.addEventListener('pagehide', () => {
  if (erasing) return;
  persist();
  saveProfile(profile);
});
document.addEventListener('gesturestart', (e) => e.preventDefault());

// ------------------------------------------------------------------ loop
let dirty = true;
let last = performance.now();
const frameTimes: number[] = [];
const drawTimes: number[] = [];
/** Our own main-thread work per task: commits and whole frames (perf tests). */
const taskTimes: number[] = [];
/** When the first frame showing a freshly picked piece finished drawing (latency tests). */
const pickDrawnAt: number[] = [];
const dropDrawnAt: number[] = [];
let lastDrawnMoves = -1;
/** Errors already logged by the loop (each message once, so a bad frame can't flood the console). */
const loopErrors = new Set<string>();
function frame(): void {
  // schedule first: one throwing draw (an unsupported canvas call, a bad sprite) must not freeze
  // the game — the next frame still comes, and the error is logged once
  requestAnimationFrame(frame);
  try {
    step();
  } catch (e) {
    const msg = String((e as Error)?.stack ?? e);
    if (!loopErrors.has(msg) && loopErrors.size < 20) {
      loopErrors.add(msg);
      console.error('frame failed', e);
    }
    dirty = true; // redraw once the fault clears
  }
}
function step(): void {
  // one clock everywhere: input handlers dispatch effects with performance.now(), so frames do too
  const f0 = performance.now();
  const now = clock();
  const dt = now - last;
  last = now;
  fx.tick(now);
  if (frozen !== null) scene.shownScore = scene.score;
  const wasDragging = scene.drag !== null;
  scene.drag = drag.view(now);
  scene.covered = ui.open;
  if (dirty || scene.busy(now) || fx.pending) {
    const t0 = performance.now();
    scene.draw(now, dt);
    drawTimes.push(performance.now() - t0);
    if (!wasDragging && scene.drag) pickDrawnAt.push(performance.now());
    if (state.moves !== lastDrawnMoves) {
      lastDrawnMoves = state.moves;
      dropDrawnAt.push(performance.now());
    }
    dirty = false;
    frameTimes.push(dt);
    if (frameTimes.length > 1200) frameTimes.shift();
    if (drawTimes.length > 1200) drawTimes.shift();
    taskTimes.push(performance.now() - f0);
    if (taskTimes.length > 1200) taskTimes.shift();
  }
}

// welcome back: once per launch, a quiet nudge if a streak is alive and today's daily isn't done yet
{
  const td = dayIndex(today());
  const streak = visibleStreak(profile.daily, td);
  if (streak > 0 && profile.daily.lastDay !== td)
    setTimeout(
      () => scene.toast(`Welcome back · Streak ${streak} — today's Daily is waiting`, performance.now(), 2600),
      900,
    );
}

// a lazy chunk 404s after a deploy → reload once onto the new index (guarded against loops)
installPreloadRecovery();
void initNative();
// warm up audio off the input path (see Sfx.prepare)
const idle =
  (globalThis as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback ??
  ((cb: () => void) => setTimeout(cb, 300));
idle(() => {
  sfx.prepare();
  fx.warmPeaks(); // a first jackpot shouldn't build its text mid-burst
  setTimeout(() => reveal.prefetch(), 2500);
  setTimeout(() => ui.prefetchSheets(), 1800);
  setTimeout(() => ui.prefetchResults(), 2200);
  if (profile.settings.music) setTimeout(() => music.prefetch(), 2600);
  // lazy chunks that used to be in the initial bundle: fetched at idle so nothing waits on them
  setTimeout(() => void import('./reefMode.ts').catch(() => undefined), 3000);
  scene.warmSprites();
  lbBackground();
});
resize();
applyTheme();
syncScene();
requestAnimationFrame(frame);
// bundled fonts arrive after first paint (font-display: swap): redraw once they're in
const fontsIn = () => {
  scene.fontsReady();
  fx.warmPeaks(true); // the text sprites were just cleared: build the peak words again, off-frame
  dirty = true;
};
document.fonts?.addEventListener?.('loadingdone', fontsIn);
void document.fonts?.load?.('800 16px "Lagoon UI"').then(fontsIn);
void document.fonts?.load?.('900 16px "Lagoon Display"').then(fontsIn);

// PWA offline cache — web only: inside the native shells the app is already local, and a cache
// there would only strand players on an old build (ADR 0005). `?sw=1`: e2e (webdriver = debug).
if ((!DEBUG || params.has('sw')) && 'serviceWorker' in navigator && import.meta.env.PROD && !isNative()) {
  const url = `./sw.js?v=${encodeURIComponent(__BUILD_ID__)}`;
  window.addEventListener('load', () => void navigator.serviceWorker.register(url).catch(() => undefined));
} else if (isNative() && 'serviceWorker' in navigator) {
  // earlier builds registered the worker in the Android shell too: drop it and its caches (its
  // cache-first index once stranded the app on deleted chunks — a blank screen after an update)
  void navigator.serviceWorker
    .getRegistrations()
    .then((rs) => Promise.all(rs.map((r) => r.unregister())))
    .then(() => caches?.keys())
    .then((ks) => Promise.all((ks ?? []).map((k) => caches.delete(k))))
    .catch(() => undefined);
}

// ------------------------------------------------------------------ debug / test hooks
// a lazy chunk: players never download the bots and the audio QA harness
if (DEBUG) void import('./debug.ts').then(({ installDebugApi }) => installDebugApi(debugDeps()));
function debugDeps(): DebugDeps {
  return {
    state: () => state,
    setState: (g) => {
      if (g !== state) teaching = false; // a staged board is never the first-run lesson
      state = g;
      syncScene();
    },
    mode: () => mode,
    profile: () => profile,
    scene,
    sfx,
    frameTimes,
    drawTimes,
    taskTimes,
    pickDrawnAt,
    dropDrawnAt,
    commit,
    restart,
    switchMode,
    loadPuzzle,
    journal: () => journal,
    stageBest: (n, score) => {
      scene.best = n;
      if (score !== undefined) {
        state = { ...state, score }; // so the next capture adds to the staged score
        scene.score = scene.shownScore = score;
      }
      dirty = true;
    },
    stageJournal: (ids) => {
      const entries = { ...journal.entries };
      ids.forEach((id, i) => {
        const sp = SPECIES_BY_ID.get(id);
        if (sp)
          entries[id] = {
            count: 1 + ((i * 7) % 12),
            best: sp.size[1] * 0.8,
            golden: i % 9 === 0 ? 1 : 0,
            first: '2026-10-1' + (i % 6),
          };
      });
      journal = { ...journal, entries, total: 600 };
    },
    markSeen: (ids) => ui.markSeen(ids, journal),
    puzzleSolution: () => (mode === 'puzzle' ? (reefAt(state.seed)?.solution ?? null) : null),
    reefSource: () => reefs,
    celebrate: {
      freeze: (msAfterMove) => {
        frozen = msAfterMove === null ? null : lastDispatchAt + msAfterMove;
        if (frozen === null) last = performance.now();
        dirty = true;
      },
      freezeNow: () => {
        frozen = performance.now();
        lastDispatchAt = frozen;
        return frozen;
      },
      stageCombo: (n, dry = 0) => {
        state = { ...state, streak: n, dry };
        scene.streak = n;
        scene.dry = dry;
        scene.celebrate.reset(n, dry);
        dirty = true;
      },
      stageRecord: (best) => {
        if (mode === 'daily') profile.dailyBest[dailyDate] = best;
        else profile.best = best;
        scene.best = best;
        bestCelebrated = false;
        dirty = true;
      },
      // default size: a plausible catch for that species (geometric mid of its range), not a fixture
      revealSpecies: (id, o) => {
        const r = SPECIES_BY_ID.get(id)?.size ?? [20, 30];
        const size = o?.size ?? Math.round(Math.sqrt(r[0] * r[1]) * 10) / 10;
        reveal.enqueue([{ id, size, golden: o?.golden ?? false }], 0);
      },
      chapterMoment: (chapter, name) => {
        lastDispatchAt = clock();
        fx.chapterComplete(lastDispatchAt, chapter, name);
        dirty = true;
      },
      celebrateWord: () => scene.celebrate.word?.text ?? null,
      revealState: () => reveal.current(),
      revealFreeze: (t) => reveal.freeze(t),
      revealSkip: () => reveal.skip(),
      haptics: () => haptics.log.slice(),
      shareCard: async (id) => {
        const { renderShareCard } = await import('../ui/share-card.ts');
        const sp = SPECIES_BY_ID.get(id)!;
        const log: string[] = [];
        const c = renderShareCard(sp, { date: today(), log });
        return { w: c.width, h: c.height, png: c.toDataURL('image/png').length, text: log, hint: sp.hint };
      },
      shareTry: async (id) => {
        const { renderShareCard, shareCanvas } = await import('../ui/share-card.ts');
        const c = renderShareCard(SPECIES_BY_ID.get(id)!, { date: today() });
        return shareCanvas(c, `lagooner-beach-${id}.png`, 'test');
      },
      // void: the card arrives with the results chunk (a blocked chunk must not hang the caller)
      showResults: (o) =>
        void ui.showGameOver({
          score: o.score,
          best: Math.max(o.score, o.prevBest),
          newBest: o.score > o.prevBest && o.prevBest > 0,
          prevBest: o.prevBest,
          moves: 64,
          lagoon: 12,
          mode: 'classic',
          dailyStreak: 0,
          unlocked: [],
          caught: { count: 9, newIds: [] },
          reducedMotion: scene.reducedMotion,
          // review shots: the record card with its "Post your score" button (opens nothing)
          ...(o.lb ? { leaderboard: { label: 'Post your score', open: () => undefined } } : {}),
        }),
    },
  };
}
