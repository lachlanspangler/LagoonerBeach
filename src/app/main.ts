/**
 * App entry: wires core ⇄ input ⇄ scene/fx ⇄ audio/haptics ⇄ storage ⇄ UI.
 */
import { applyMove, newGame, previewMove, legalMoves, type GameState, type Move } from '../core/game.ts';
import { dailySeed, dayIndex, recordDaily, visibleStreak } from '../core/daily.ts';
import { pieceById } from '../core/pieces.ts';
import { N } from '../core/grid.ts';
import { fitsAnywhere } from '../core/rules.ts';

import { Sfx } from '../audio/sfx.ts';
import { DragController } from '../input/drag.ts';
import { Haptics } from '../platform/haptics.ts';
import {
  loadDaily,
  loadGame,
  loadProfile,
  saveDaily,
  saveGame,
  saveProfile,
  type Profile,
} from '../platform/storage.ts';
import { Scene } from '../render/scene.ts';
import { DAY, NIGHT } from '../render/theme.ts';
import { Fx } from './fx.ts';
import { Ui } from '../ui/overlay.ts';
import { SKINS, unlockedIds, type ProgressSnapshot } from '../meta/unlocks.ts';
import { lookFor } from '../render/skins.ts';
import { shareText, type LagoonShape } from '../meta/share.ts';

import { newPuzzleGame, puzzleStatus, type PuzzleDef } from '../core/puzzle.ts';
import { solve } from '../core/solver.ts';
import { initNative } from '../platform/native.ts';
import { installDebugApi } from './debug.ts';
import { freshSeed as envSeed, today } from './env.ts';

type Mode = 'classic' | 'daily' | 'puzzle';
let PACK: (PuzzleDef & { tier?: string })[] | null = null;
async function loadPack(): Promise<NonNullable<typeof PACK>> {
  PACK ??= (await import('../content/puzzles.json')).default as NonNullable<typeof PACK>;
  return PACK;
}
const TIER_LABEL: Record<string, string> = { calm: 'Calm', tricky: 'Tricky', deep: 'Deep', abyss: 'Abyss' };

const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug') || navigator.webdriver === true;

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true })!;
const scene = new Scene(canvas, ctx);
const sfx = new Sfx();
const haptics = new Haptics();
const fx = new Fx(scene, sfx, haptics);
const profile: Profile = loadProfile();

const freshSeed = (): number => envSeed(params);

let mode: Mode = params.get('mode') === 'daily' ? 'daily' : 'classic';
let dailyDate = today();
let state: GameState = startState();
let teaching = !profile.firstRunDone && mode === 'classic' && state.moves === 0;
let overShown = false;
let bestCelebrated = false;
/** Biggest lagoon of the current game (for the daily share picture). */
let bigLagoon: LagoonShape | null = null;

function startState(): GameState {
  if (mode === 'puzzle' && PACK) {
    const i = Math.min(profile.puzzle.index, PACK.length - 1);
    return newPuzzleGame(PACK[i]!, i);
  }
  if (mode === 'daily') return loadDaily(dailyDate) ?? newGame(dailySeed(dailyDate), { mode: 'daily' });
  if (params.has('seed')) return newGame(freshSeed(), { teach: !profile.firstRunDone });
  return loadGame() ?? newGame(freshSeed(), { teach: !profile.firstRunDone });
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
  scene.particles.budget = rm ? 0.3 : 1;
  // always-on styles (e.g. Glyph) and anything earned so far — not only after a game ends
  for (const id of unlockedIds(snapshot())) if (!profile.unlocked.includes(id)) profile.unlocked.push(id);
  if (!profile.unlocked.includes(profile.settings.skin)) profile.settings.skin = 'pebble';
  scene.sprites.setLook(lookFor(profile.settings.skin));
  idle(() => scene.warmSprites());
  sfx.enabled = profile.settings.sound;
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
  idle(() => scene.warmSprites());
  dirty = true;
}
window.addEventListener('resize', resize);

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
  scene.dying = [];
  scene.lagoons = [];
  scene.texts = [];
  scene.placing = [];
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

  if (state.moves === 0) {
    bestCelebrated = false;
    bigLagoon = null;
    puzzleMoves = [];
  }
  updateHint();
  updateMisfits();
  scene.hudLabel = null;
  if (mode === 'puzzle' && PACK) {
    const i = state.seed;
    const p = PACK[i]!;
    const solved = profile.puzzle.solved.includes(p.id);
    const pure = profile.puzzle.pure?.includes(p.id) ?? false;

    scene.hudLabel = {
      top: `REEF ${i + 1} OF ${PACK.length}`,
      big: TIER_LABEL[p.tier ?? ''] ?? 'Reef',
      sub: pure ? '✓ cleared · no hints' : solved ? '✓ cleared' : 'clear every pebble',
    };
  }
  ui.setMode(mode, visibleStreak(profile.daily, dayIndex(today())));
  dirty = true;
}

function updateMisfits(): void {
  scene.misfit = state.tray.map((t) => t !== null && !fitsAnywhere(state.board, pieceById(t.pieceId)));
}

// ------------------------------------------------------------------ teaching hint
function updateHint(): void {
  if (mode === 'puzzle') {
    scene.hint = null; // puzzle hints are on demand only
    return;
  }
  if (!teaching || state.over) {
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
    if (pv.pockets.length && (!best || pv.points > best.pts)) best = { m, pts: pv.points };
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
function commit(m: Move, from: { x: number; y: number } | null): boolean {
  const r = applyMove(state, m);
  if (!r) return false;
  const prevBest = mode === 'daily' ? (profile.dailyBest[dailyDate] ?? 0) : profile.best;
  const prevScore = state.score;
  state = r.state;
  // the moment you pass your best, mid-game (once per game)
  if (mode !== 'puzzle' && prevBest > 0 && prevScore <= prevBest && state.score > prevBest && !bestCelebrated) {
    bestCelebrated = true;
    later(650, () => {
      const l = scene.layout;
      scene.texts.push({
        text: 'New best!',
        x: l.w / 2,
        y: l.board.y + l.board.h * 0.2,
        start: performance.now(),
        size: l.cell * 0.8,
        life: 1100,
        strong: true,
      });
      sfx.newBest();
      haptics.fire('heavy');
      dirty = true;
    });
  }
  persist();
  fx.dispatch(r.events, performance.now(), from, { firstCapture: teaching });
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
      }
      ui.announce(
        `Captured ${e.pockets.length > 1 ? `${e.pockets.length} lagoons` : 'a lagoon'}, plus ${e.score.total}`,
      );
    }
  }
  if (mode === 'puzzle') {
    puzzleMoves.push(m);
    checkPuzzle();
  } else if (state.over) finishGame(prevBest);
  saveProfile(profile);
  updateHint();
  updateMisfits();
  drag.clearSel();
  dirty = true;
  return true;
}

function persist(): void {
  if (mode === 'puzzle') return; // puzzles are short; progress is the solved list
  if (mode === 'daily') saveDaily(dailyDate, state);
  else saveGame(state);
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
  };
  later(DEBUG && params.has('fast') ? 0 : 1400, () => {
    if (overShown) return;
    overShown = true;
    if (card.newBest && !bestCelebrated) sfx.newBest();
    ui.showGameOver(card);
  });
}

function checkPuzzle(): void {
  const st = puzzleStatus(state);
  if (st === 'playing' || !PACK) return;
  const i = state.seed;
  const p = PACK[i]!;
  if (st === 'solved') {
    const first = !profile.puzzle.solved.includes(p.id);
    if (first) profile.puzzle.solved.push(p.id);
    profile.puzzle.pure ??= [];
    const hinted = profile.puzzle.hinted?.includes(p.id) ?? false;
    if (!hinted && !profile.puzzle.pure.includes(p.id)) profile.puzzle.pure.push(p.id);
    profile.puzzle.index = Math.min(PACK.length - 1, i + 1);
    saveProfile(profile);
    const cleared = profile.puzzle.solved.length;
    later(1300, () => ui.showPuzzleResult({ solved: true, index: i, total: PACK!.length, cleared }));
  } else {
    const cleared = profile.puzzle.solved.length;
    later(700, () => ui.showPuzzleResult({ solved: false, index: i, total: PACK!.length, cleared }));
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
  const sol = (PACK![state.seed] as unknown as { solution: { piece: number; x: number; y: number }[] }).solution;
  const onPath = puzzleMoves.every((h, i) => sol[i] && sol[i].piece === h.slot && sol[i].x === h.x && sol[i].y === h.y);
  const k = puzzleMoves.length;
  if (onPath && sol[k]) return { slot: sol[k].piece, x: sol[k].x, y: sol[k].y };
  const slots = state.tray.map((t, i) => (t ? i : -1)).filter((i) => i >= 0);
  const res = solve(
    state.board,
    slots.map((i) => state.tray[i]!.pieceId),
  );
  const m = res.first?.[0];
  return m ? { slot: slots[m.piece]!, x: m.x, y: m.y } : null;
}

function puzzleHint(): void {
  if (mode !== 'puzzle' || puzzleStatus(state) !== 'playing') return;
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
    const id = PACK![state.seed]!.id;
    if (!profile.puzzle.hinted.includes(id) && !(profile.puzzle.pure?.includes(id) ?? false))
      profile.puzzle.hinted.push(id);
    saveProfile(profile);
    ui.announce('Hint shown on the board.');
  }
  dirty = true;
}

function loadPuzzle(i: number): void {
  if (!PACK) return;
  ui.close();
  const k = Math.max(0, Math.min(PACK.length - 1, i));
  profile.puzzle.index = k;
  saveProfile(profile);
  state = newPuzzleGame(PACK[k]!, k);
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
  } else {
    state = newGame(freshSeed(), { teach: !profile.firstRunDone });
    teaching = !profile.firstRunDone;
  }
  persist();
  syncScene();
}

let wantedMode: Mode = mode;
function switchMode(m: Mode): void {
  wantedMode = m;
  if (m === 'puzzle' && !PACK) {
    // only honor the pack load if the player still wants puzzles when it arrives
    void loadPack().then(() => wantedMode === 'puzzle' && switchMode('puzzle'));
    return;
  }
  ui.close();
  persist();
  mode = m;

  dailyDate = today();
  state = startState();
  teaching = !profile.firstRunDone && mode === 'classic' && state.moves === 0;
  syncScene();
}

// ------------------------------------------------------------------ UI
const ui = new Ui({
  onOpenMenu: () => ui.showMenu(profile, mode, !state.over),
  onSettings: () => ui.showSettings(profile),
  onResume: () => ui.close(),
  onNewGame: () => restart(),
  onDaily: () => (mode === 'puzzle' ? puzzleHint() : switchMode(mode === 'daily' ? 'classic' : 'daily')),
  onClassic: () => switchMode('classic'),
  onPuzzles: () => switchMode('puzzle'),
  onPuzzleNext: () => mode === 'puzzle' && loadPuzzle(state.seed + 1),
  onPuzzleRetry: () => mode === 'puzzle' && loadPuzzle(state.seed),
  onPuzzleList: () =>
    PACK &&
    ui.showReefs(
      PACK,
      profile.puzzle.solved,
      profile.puzzle.pure ?? [],
      mode === 'puzzle' ? state.seed : profile.puzzle.index,
    ),
  onPuzzlePick: (i) => {
    if (mode !== 'puzzle') return;
    loadPuzzle(i);
  },

  onToggle: (k) => {
    if (k === 'reducedMotion')
      profile.settings.reducedMotion = !(profile.settings.reducedMotion ?? motionQuery.matches);
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
    sfx.unlock();
    sfx.click();
  },
});

// ------------------------------------------------------------------ input
let sealKey = '';

const drag = new DragController(canvas, {
  layout: () => scene.layout,
  state: () => state,
  enabled: () => !ui.open,
  onPick: () => {
    sfx.unlock();
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
    if (move && commit(move, from)) return;
    scene.tray[slot] = { ...scene.tray[slot]!, back: { ...from, start: performance.now() } };
    if (overBoard) {
      sfx.invalid();
      haptics.fire('tick');
    }
    dirty = true;
  },
  onSelect: (slot) => {
    scene.selected = slot;
    if (slot === null) scene.preview = null;
    else {
      sfx.unlock();
      sfx.pick();
      haptics.fire('tick');
      ui.announce('Piece selected. Tap the board to preview, tap again to place.');
    }
    dirty = true;
  },
  onCancel: (slot, from) => {
    scene.preview = null;
    scene.tray[slot] = { ...scene.tray[slot]!, back: { ...from, start: performance.now() } };
    dirty = true;
  },
});

// ------------------------------------------------------------------ lifecycle
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    persist();
    saveProfile(profile);
    sfx.suspend();
  } else dirty = true;
});
window.addEventListener('pagehide', () => {
  persist();
  saveProfile(profile);
});
document.addEventListener('gesturestart', (e) => e.preventDefault());

// ------------------------------------------------------------------ loop
let dirty = true;
let last = performance.now();
const frameTimes: number[] = [];
const drawTimes: number[] = [];
/** When the first frame showing a freshly picked piece finished drawing (latency tests). */
const pickDrawnAt: number[] = [];
const dropDrawnAt: number[] = [];
let lastDrawnMoves = -1;
function frame(): void {
  // one clock everywhere: input handlers dispatch effects with performance.now(), so frames do too
  const now = performance.now();
  const dt = now - last;
  last = now;
  fx.tick(now);
  const wasDragging = scene.drag !== null;
  scene.drag = drag.view(now);
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
  }
  requestAnimationFrame(frame);
}

void initNative();
// warm up audio off the input path (see Sfx.prepare)
const idle =
  (globalThis as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback ??
  ((cb: () => void) => setTimeout(cb, 300));
idle(() => {
  sfx.prepare();
  scene.warmSprites();
});
resize();
applyTheme();
syncScene();
requestAnimationFrame(frame);

if (!DEBUG && 'serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('./sw.js').catch(() => undefined));
}

// ------------------------------------------------------------------ debug / test hooks
if (DEBUG)
  installDebugApi({
    state: () => state,
    setState: (g) => {
      state = g;
      syncScene();
    },
    mode: () => mode,
    profile: () => profile,
    scene,
    sfx,
    frameTimes,
    drawTimes,
    pickDrawnAt,
    dropDrawnAt,
    commit,
    restart,
    switchMode,
    loadPuzzle,
    puzzleSolution: () =>
      PACK && mode === 'puzzle' ? (PACK[state.seed] as unknown as { solution: unknown }).solution : null,
  });
