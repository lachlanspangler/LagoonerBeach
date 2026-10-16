/**
 * Persistence (localStorage). Everything is versioned and validated on read; a bad value falls back
 * to defaults rather than crashing.
 */
import { NO_STREAK, type DailyStreak } from '../core/daily.ts';
import { decodeGame, encodeGame } from '../core/serialize.ts';
import type { GameState } from '../core/game.ts';

export type ThemePref = 'auto' | 'day' | 'night';

export interface Settings {
  sound: boolean;
  music: boolean;
  haptics: boolean;
  reducedMotion: boolean | null; // null = follow OS
  largeText?: boolean;
  theme: ThemePref;
  skin: string;
}

export interface Stats {
  games: number;
  captures: number;
  bestPocket: number;
  totalScore: number;
  cascades: number;
  cleanReefs: number;
  hints?: number;
}

export interface Profile {
  v: 1;
  best: number;
  firstRunDone: boolean;
  /** Second lesson (first 2+ cell lagoon) learned. */
  lesson2Done?: boolean;
  settings: Settings;
  stats: Stats;
  daily: DailyStreak;
  dailyBest: Record<string, number>;
  unlocked: string[];
  /** solved = cleared at least once; pure = cleared without using a hint. */
  /** hinted = a hint was used on it before a no-hint clear (blocks the no-hint mark). */
  puzzle: { index: number; solved: string[]; pure?: string[]; hinted?: string[]; dailyDone?: string[] };
}

export const DEFAULT_PROFILE: Profile = {
  v: 1,
  best: 0,
  firstRunDone: false,
  settings: { sound: true, music: true, haptics: true, reducedMotion: null, theme: 'auto', skin: 'pebble' },
  stats: { games: 0, captures: 0, bestPocket: 0, totalScore: 0, cascades: 0, cleanReefs: 0 },
  daily: NO_STREAK,
  dailyBest: {},
  unlocked: ['pebble'],
  puzzle: { index: 0, solved: [] },
};

const K_PROFILE = 'atoll.v1.profile';
const K_GAME = 'atoll.v1.game';
const K_DAILY = 'atoll.v1.daily';

function store(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null; // privacy modes can throw on access
  }
}

const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : d);
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);

export function loadProfile(): Profile {
  const raw = safeParse(store()?.getItem(K_PROFILE));
  if (!raw || typeof raw !== 'object') return structuredClone(DEFAULT_PROFILE);
  const o = raw as Partial<Profile>;
  const d = DEFAULT_PROFILE;
  const s = (o.settings ?? {}) as Partial<Settings>;
  const st = (o.stats ?? {}) as Partial<Stats>;
  const dl = (o.daily ?? {}) as Partial<DailyStreak>;
  return {
    v: 1,
    best: num(o.best, 0),
    firstRunDone: bool(o.firstRunDone, false),
    lesson2Done: bool(o.lesson2Done, false),
    settings: {
      sound: bool(s.sound, d.settings.sound),
      music: bool(s.music, d.settings.music),
      haptics: bool(s.haptics, d.settings.haptics),
      reducedMotion: typeof s.reducedMotion === 'boolean' ? s.reducedMotion : null,
      largeText: bool(s.largeText, false),
      theme: s.theme === 'day' || s.theme === 'night' ? s.theme : 'auto',
      skin: typeof s.skin === 'string' ? s.skin : 'pebble',
    },
    stats: {
      games: num(st.games, 0),
      captures: num(st.captures, 0),
      bestPocket: num(st.bestPocket, 0),
      totalScore: num(st.totalScore, 0),
      cascades: num(st.cascades, 0),
      cleanReefs: num(st.cleanReefs, 0),
      hints: num(st.hints, 0),
    },
    daily: {
      lastDay: typeof dl.lastDay === 'number' ? dl.lastDay : null,
      current: num(dl.current, 0),
      longest: num(dl.longest, 0),
    },
    dailyBest:
      o.dailyBest && typeof o.dailyBest === 'object'
        ? Object.fromEntries(
            Object.entries(o.dailyBest)
              .filter(([k]) => /^\d{4}-\d{2}-\d{2}$/.test(k))
              .map(([k, v]) => [k, num(v, -1)] as const)
              .filter(([, v]) => v >= 0),
          )
        : {},
    unlocked: Array.isArray(o.unlocked) ? o.unlocked.filter((x): x is string => typeof x === 'string') : ['pebble'],
    puzzle: {
      index: num(o.puzzle?.index, 0),
      solved: Array.isArray(o.puzzle?.solved) ? o.puzzle.solved.filter((x): x is string => typeof x === 'string') : [],
      pure: Array.isArray(o.puzzle?.pure) ? o.puzzle.pure.filter((x): x is string => typeof x === 'string') : [],
      hinted: Array.isArray(o.puzzle?.hinted) ? o.puzzle.hinted.filter((x): x is string => typeof x === 'string') : [],
      dailyDone: Array.isArray(o.puzzle?.dailyDone)
        ? o.puzzle.dailyDone.filter((x): x is string => typeof x === 'string').slice(-60)
        : [],
    },
  };
}

export function saveProfile(p: Profile): void {
  try {
    store()?.setItem(K_PROFILE, JSON.stringify(p));
  } catch {
    /* quota or privacy mode: progress is best-effort */
  }
}

function safeParse(s: string | null | undefined): unknown {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

export function loadGame(): GameState | null {
  return decodeGame(safeParse(store()?.getItem(K_GAME)), 'classic');
}

export function saveGame(s: GameState | null): void {
  try {
    if (!s || s.over) store()?.removeItem(K_GAME);
    else store()?.setItem(K_GAME, JSON.stringify(encodeGame(s)));
  } catch {
    /* best-effort */
  }
}

/** The in-progress daily game, only if it belongs to `date` (yesterday's run is discarded). */
export function loadDaily(date: string): GameState | null {
  const raw = safeParse(store()?.getItem(K_DAILY)) as { date?: unknown; game?: unknown } | null;
  if (!raw || raw.date !== date) return null;
  return decodeGame(raw.game, 'daily');
}

export function saveDaily(date: string, s: GameState | null): void {
  try {
    if (!s || s.over) store()?.removeItem(K_DAILY);
    else store()?.setItem(K_DAILY, JSON.stringify({ date, game: encodeGame(s) }));
  } catch {
    /* best-effort */
  }
}

// ── Beach Journal ──────────────────────────────────────────────────────────────────────────
import { sanitizeJournal, type Journal } from '../meta/journal.ts';
const K_JOURNAL = 'atoll.v1.journal';

export function loadJournal(): Journal {
  return sanitizeJournal(safeParse(store()?.getItem(K_JOURNAL)));
}

export function saveJournal(j: Journal): void {
  try {
    store()?.setItem(K_JOURNAL, JSON.stringify(j));
  } catch {
    /* best-effort */
  }
}

/** Erase everything this game stored on the device. */
export function eraseAll(): void {
  try {
    const s = store();
    if (!s) return;
    for (const k of Object.keys(s)) if (k.startsWith('atoll.')) s.removeItem(k);
  } catch {
    /* best-effort */
  }
}
