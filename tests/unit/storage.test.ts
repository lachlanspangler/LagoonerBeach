/** Profile/save migrations: adding leaderboard fields must keep every older save loading. */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  eraseAll,
  loadDaily,
  loadDailyRun,
  loadGame,
  loadGameRun,
  loadProfile,
  saveDaily,
  saveGame,
  saveProfile,
  sanitizeLbProfile,
} from '../../src/platform/storage.ts';
import { applyMove, legalMoves, newGame, type GameState } from '../../src/core/game.ts';
import { encodeGame } from '../../src/core/serialize.ts';
import { packMoves } from '../../src/core/movelog.ts';
import { freshLocalStorage, type MemStorage } from './memstorage.ts';

let ls: MemStorage;
beforeEach(() => {
  ls = freshLocalStorage();
});

function played(n: number, mode: 'classic' | 'daily' = 'classic') {
  let s: GameState = newGame(77, { mode });
  const moves = [];
  for (let i = 0; i < n; i++) {
    const m = legalMoves(s)[0]!;
    moves.push(m);
    s = applyMove(s, m)!.state;
  }
  return { s, moves };
}

describe('profile migration', () => {
  it('a v1 profile saved before leaderboards loads unchanged, with empty leaderboard fields', () => {
    const old = {
      v: 1,
      best: 1234,
      firstRunDone: true,
      settings: { sound: false, music: true, haptics: true, reducedMotion: null, theme: 'night', skin: 'pebble' },
      stats: { games: 9, captures: 40, bestPocket: 6, totalScore: 9000, cascades: 2, cleanReefs: 1 },
      daily: { lastDay: 280, current: 3, longest: 5 },
      dailyBest: { '2026-10-15': 800 },
      unlocked: ['pebble'],
      puzzle: { index: 4, solved: ['r1'] },
    };
    ls.setItem('atoll.v1.profile', JSON.stringify(old));
    const p = loadProfile();
    expect(p.best).toBe(1234);
    expect(p.settings.sound).toBe(false);
    expect(p.daily.current).toBe(3);
    expect(p.lb).toEqual({});
    expect(p.lastMode).toBeUndefined(); // boots into Endless, as before
    expect(p.puzzle.index).toBe(4);
  });
  it('the last mode round-trips; anything else is dropped', () => {
    const p = loadProfile();
    for (const m of ['daily', 'puzzle', 'classic'] as const) {
      p.lastMode = m;
      saveProfile(p);
      expect(loadProfile().lastMode).toBe(m);
    }
    ls.setItem('atoll.v1.profile', JSON.stringify({ ...p, lastMode: 'arcade' }));
    expect(loadProfile().lastMode).toBeUndefined();
  });
  it('leaderboard fields round-trip and are sanitized', () => {
    const p = loadProfile();
    p.lb = { installId: 'ab'.repeat(16), name: 'CORAL' };
    saveProfile(p);
    expect(loadProfile().lb).toEqual({ installId: 'ab'.repeat(16), name: 'CORAL' });
    ls.setItem('atoll.v1.profile', JSON.stringify({ ...p, lb: { installId: '<script>', name: 'coral 9' } }));
    expect(loadProfile().lb).toEqual({});
    expect(sanitizeLbProfile(undefined)).toEqual({});
    expect(sanitizeLbProfile({ name: 7, installId: 5 })).toEqual({});
  });
  it('the best a live run started from round-trips; junk is dropped', () => {
    const p = loadProfile();
    expect(p.runBest).toBeUndefined();
    p.runBest = { key: 'classic::77', best: 32 };
    saveProfile(p);
    expect(loadProfile().runBest).toEqual({ key: 'classic::77', best: 32 });
    ls.setItem('atoll.v1.profile', JSON.stringify({ ...p, runBest: { key: 5, best: 'x' } }));
    expect(loadProfile().runBest).toBeUndefined();
  });
});

describe('move logs saved alongside games', () => {
  it('an old classic save (no log) still loads; its log is simply missing', () => {
    const { s } = played(5);
    ls.setItem('atoll.v1.game', JSON.stringify(encodeGame(s)));
    expect(loadGame()?.moves).toBe(5);
    expect(loadGameRun(loadGame()!)).toBeNull();
  });
  it('a new save carries the log and it must match the move count', () => {
    const { s, moves } = played(6);
    saveGame(s, { moves: packMoves(moves), teach: false, runToken: 'tok' });
    const g = loadGame()!;
    expect(g.moves).toBe(6);
    expect(loadGameRun(g)).toEqual({ moves: packMoves(moves), teach: false, runToken: 'tok' });
    saveGame(s, { moves: packMoves(moves.slice(1)), teach: false });
    expect(loadGameRun(loadGame()!)).toBeNull(); // out of step with the game: not trusted
    ls.setItem('atoll.v1.game', JSON.stringify({ ...encodeGame(s), run: { moves: 7, teach: 'no' } }));
    expect(loadGame()?.moves).toBe(6);
    expect(loadGameRun(loadGame()!)).toBeNull();
  });
  it('daily saves carry their log for the same date only', () => {
    const { s, moves } = played(4, 'daily');
    saveDaily('2026-10-16', s, { moves: packMoves(moves), teach: false });
    expect(loadDaily('2026-10-16')?.moves).toBe(4);
    expect(loadDailyRun('2026-10-16', s)?.moves).toBe(packMoves(moves));
    expect(loadDailyRun('2026-10-17', s)).toBeNull();
    ls.setItem('atoll.v1.daily', JSON.stringify({ date: '2026-10-16', game: encodeGame(s) })); // pre-leaderboard
    expect(loadDaily('2026-10-16')?.moves).toBe(4);
    expect(loadDailyRun('2026-10-16', s)).toBeNull();
  });
  it('erase all progress removes leaderboard data too', () => {
    for (const k of ['atoll.v1.profile', 'atoll.v1.lbqueue', 'atoll.v1.lbmock', 'atoll.v1.lbticket', 'atoll.v1.game'])
      ls.setItem(k, '{}');
    ls.setItem('other.app', 'keep');
    eraseAll();
    expect(Object.keys(ls)).toEqual(['other.app']);
  });
});
