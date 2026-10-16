/**
 * App entry: wires core ⇄ input ⇄ scene/fx ⇄ audio/haptics ⇄ storage ⇄ UI.
 */
import { applyMove, newGame, previewMove, legalMoves, type GameState, type Move } from '../core/game.ts';
import { dailySeed, dayIndex, recordDaily, visibleStreak } from '../core/daily.ts';
import { pieceById } from '../core/pieces.ts';
import { N } from '../core/grid.ts';
import { Rng } from '../core/rng.ts';
import { BOTS, type BotName } from '../sim/bots.ts';
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

const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug') || navigator.webdriver === true;

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true })!;
const scene = new Scene(canvas, ctx);
const sfx = new Sfx();
const haptics = new Haptics();
const fx = new Fx(scene, sfx, haptics);
const profile: Profile = loadProfile();

const today = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function freshSeed(): number {
  if (params.has('seed')) return Number(params.get('seed')) >>> 0;
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0]!;
}

let mode: 'classic' | 'daily' = params.get('mode') === 'daily' ? 'daily' : 'classic';
let dailyDate = today();
let state: GameState = startState();
let teaching = !profile.firstRunDone && mode === 'classic' && state.moves === 0;
let overShown = false;

function startState(): GameState {
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
  sfx.enabled = profile.settings.sound;
  haptics.enabled = profile.settings.haptics;
  dirty = true;
}
darkQuery.addEventListener('change', applyTheme);
motionQuery.addEventListener('change', applyTheme);

// ------------------------------------------------------------------ layout
function insets() {
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
  document.body.append(probe);
  const cs = getComputedStyle(probe);
  const r = {
    top: parseFloat(cs.paddingTop) || 0,
    right: parseFloat(cs.paddingRight) || 0,
    bottom: parseFloat(cs.paddingBottom) || 0,
    left: parseFloat(cs.paddingLeft) || 0,
  };
  probe.remove();
  return r;
}
function resize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const ins = insets();
  // keep the HUD clear of the menu buttons
  scene.resize(w, h, Math.min(3, window.devicePixelRatio || 1), { ...ins, top: ins.top + 6 });
  dirty = true;
}
window.addEventListener('resize', resize);

// ------------------------------------------------------------------ sync scene with state
function syncScene(): void {
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
  scene.gameOverAt = state.over ? now : -1;
  scene.preview = null;
  scene.drag = null;
  fx.reset();
  overShown = false;
  updateHint();
  ui.setMode(mode, visibleStreak(profile.daily, dayIndex(today())));
  dirty = true;
}

// ------------------------------------------------------------------ teaching hint
function updateHint(): void {
  if (!teaching || state.over) {
    scene.hint = null;
    return;
  }
  // suggest the best capturing move available within the current tray (or the cup's spot first)
  if (state.moves === 0) {
    const cup = pieceById('cup-up');
    const slot = state.tray.findIndex((t) => t?.pieceId === 'cup-up');
    if (slot >= 0) {
      scene.hint = { cells: cup.cells.map(([dx, dy]) => (4 + dy) * N + 2 + dx), start: performance.now() };
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
    scene.hint = { cells: p.cells.map(([dx, dy]) => (best!.m.y + dy) * N + best!.m.x + dx), start: performance.now() };
  } else scene.hint = null;
}

// ------------------------------------------------------------------ moves
function commit(m: Move, from: { x: number; y: number } | null): boolean {
  const r = applyMove(state, m);
  if (!r) return false;
  const prevBest = mode === 'daily' ? (profile.dailyBest[dailyDate] ?? 0) : profile.best;
  state = r.state;
  persist();
  fx.dispatch(r.events, performance.now(), from);
  for (const e of r.events) {
    if (e.type === 'captured') {
      profile.stats.captures += e.pockets.length;
      if (e.waves.length > 1) profile.stats.cascades++;
      if (e.score.cleanBonus) profile.stats.cleanReefs++;
      profile.stats.bestPocket = Math.max(profile.stats.bestPocket, ...e.pockets.map((p) => p.cells.length));
      if (teaching) {
        teaching = false;
        profile.firstRunDone = true;
      }
      ui.announce(
        `Captured ${e.pockets.length > 1 ? `${e.pockets.length} lagoons` : 'a lagoon'}, plus ${e.score.total}`,
      );
    }
  }
  if (state.over) finishGame(prevBest);
  saveProfile(profile);
  updateHint();
  dirty = true;
  return true;
}

function persist(): void {
  if (mode === 'daily') saveDaily(dailyDate, state);
  else saveGame(state);
}

function finishGame(prevBest: number): void {
  profile.stats.games++;
  profile.stats.totalScore += state.score;
  const newBest = state.score > prevBest;
  if (mode === 'daily') {
    profile.dailyBest[dailyDate] = Math.max(prevBest, state.score);
    profile.daily = recordDaily(profile.daily, dayIndex(dailyDate));
  } else if (newBest) profile.best = state.score;
  saveProfile(profile);
  const show = () => {
    if (overShown) return;
    overShown = true;
    if (newBest && prevBest > 0) sfx.newBest();
    ui.showGameOver({
      score: state.score,
      best: Math.max(prevBest, state.score),
      newBest: newBest && prevBest > 0,
      moves: state.moves,
      lagoon: state.bestPocket,
      mode,
      dailyStreak: visibleStreak(profile.daily, dayIndex(today())),
    });
  };
  setTimeout(show, DEBUG && params.has('fast') ? 0 : 1400);
}

function restart(): void {
  ui.close();
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

function switchMode(m: 'classic' | 'daily'): void {
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
  onResume: () => ui.close(),
  onNewGame: () => restart(),
  onDaily: () => switchMode(mode === 'daily' ? 'classic' : 'daily'),
  onClassic: () => switchMode('classic'),
  onToggle: (k) => {
    if (k === 'reducedMotion')
      profile.settings.reducedMotion = !(profile.settings.reducedMotion ?? motionQuery.matches);
    else profile.settings[k] = !profile.settings[k];
    saveProfile(profile);
    applyTheme();
    ui.showMenu(profile, mode, !state.over);
  },
  onTheme: (t) => {
    profile.settings.theme = t;
    saveProfile(profile);
    applyTheme();
    ui.showMenu(profile, mode, !state.over);
  },
  onShare: () => {
    const text = `Atoll daily ${dailyDate}: ${state.score} pts · biggest lagoon ${state.bestPocket} · streak ${profile.daily.current}`;
    if (navigator.share) void navigator.share({ text }).catch(() => undefined);
    else void navigator.clipboard?.writeText(text).then(() => ui.announce('Copied result'));
  },
  onClick: () => {
    sfx.unlock();
    sfx.click();
  },
});

// ------------------------------------------------------------------ input
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
      return;
    }
    const piece = pieceById(t.pieceId);
    const pv = previewMove(state, { slot, x: anchor.x, y: anchor.y });
    scene.preview = pv
      ? {
          ax: anchor.x,
          ay: anchor.y,
          piece,
          color: t.color,
          pocket: new Set(pv.pockets.flatMap((p) => p.cells)),
          ring: new Set(pv.cleared),
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
function frame(now: number): void {
  const dt = now - last;
  last = now;
  fx.tick(now);
  scene.drag = drag.view(now);
  if (dirty || scene.busy(now) || fx.pending) {
    const t0 = performance.now();
    scene.draw(now, dt);
    drawTimes.push(performance.now() - t0);
    dirty = false;
    frameTimes.push(dt);
    if (frameTimes.length > 1200) frameTimes.shift();
    if (drawTimes.length > 1200) drawTimes.shift();
  }
  requestAnimationFrame(frame);
}

resize();
applyTheme();
syncScene();
requestAnimationFrame(frame);

if (!DEBUG && 'serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('./sw.js').catch(() => undefined));
}

// ------------------------------------------------------------------ debug / test hooks
if (DEBUG) {
  const api = {
    state: () => state,
    mode: () => mode,
    profile: () => profile,
    frameTimes: () => frameTimes.slice(),
    drawTimes: () => drawTimes.slice(),
    clearFrames: () => {
      frameTimes.length = 0;
      drawTimes.length = 0;
    },
    /** Pointer path (CSS px) that makes the drag controller produce the bot's next move. */
    plan(bot: BotName = 'greedy') {
      if (state.over) return null;
      const m = BOTS[bot](state, new Rng(state.moves + 7));
      if (!m) return null;
      return api.pathFor(m);
    },
    pathFor(m: Move) {
      const l = scene.layout;
      const p = pieceById(state.tray[m.slot]!.pieceId);
      const [cx, cy] = p.cells[0]!;
      const [ox, oy] = scene.trayPieceOrigin(m.slot, p);
      const down = { x: ox + (cx + 0.5) * l.trayCell, y: oy + (cy + 0.5) * l.trayCell };
      const up = { x: l.board.x + (m.x + cx + 0.5) * l.cell, y: l.board.y + (m.y + cy + 0.5) * l.cell + l.lift };
      return { move: m, down, up };
    },
    /** Apply bot moves directly (no input) — for fast state setup in tests. */
    autoplay(bot: BotName = 'greedy', moves = 10) {
      for (let i = 0; i < moves && !state.over; i++) {
        const m = BOTS[bot](state, new Rng(state.moves + 7));
        if (!m) break;
        commit(m, null);
      }
      return state.moves;
    },
    restart,
    switchMode,
    layout: () => scene.layout,
  };
  (window as unknown as { __atoll: typeof api }).__atoll = api;
}
