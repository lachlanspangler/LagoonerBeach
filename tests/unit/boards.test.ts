import { describe, expect, it } from 'vitest';
import {
  BoardTable,
  boardsFor,
  checkSubmission,
  dailyWindow,
  isoWeek,
  parseBoard,
  resolveBoard,
  weekBoard,
} from '../../src/meta/boards.ts';
import { dailySeed } from '../../src/core/daily.ts';
import { packMoves } from '../../src/core/movelog.ts';
import { RULES_VERSION } from '../../src/core/version.ts';
import { playOut } from './runs.ts';

describe('board ids and periods', () => {
  it('ISO weeks, including year boundaries', () => {
    expect(isoWeek('2026-10-16')).toEqual({ year: 2026, week: 42 });
    expect(isoWeek('2026-01-01')).toEqual({ year: 2026, week: 1 }); // Thursday
    expect(isoWeek('2027-01-01')).toEqual({ year: 2026, week: 53 }); // Friday → last week of 2026
    expect(isoWeek('2024-12-30')).toEqual({ year: 2025, week: 1 }); // Monday of 2025-W01
    expect(weekBoard('2026-10-19')).toBe('endless:w2026-43'); // Monday starts a new week
    expect(weekBoard('2026-10-18')).toBe('endless:w2026-42'); // Sunday ends it
  });
  it('parses only real boards', () => {
    expect(parseBoard('daily:2026-10-16')).toBe('daily:2026-10-16');
    expect(parseBoard('endless:all')).toBe('endless:all');
    expect(parseBoard('endless:week')).toBe('endless:week');
    expect(parseBoard('endless:w2026-42')).toBe('endless:w2026-42');
    for (const b of ['daily:2026-1-1', 'daily:2026-02-31x', 'endless:w2026-54', 'endless:w2026-00', 'weekly', ''])
      expect(parseBoard(b), b).toBeNull();
    expect(resolveBoard('endless:week', '2026-10-16')).toBe('endless:w2026-42');
    expect(resolveBoard('endless:all', '2026-10-16')).toBe('endless:all');
  });
  it('a daily date is open from 14 h before its UTC start to 14 h after its UTC end', () => {
    const d = '2026-10-16';
    expect(dailyWindow(d, Date.parse('2026-10-15T09:59:59Z'))).toBe('early');
    expect(dailyWindow(d, Date.parse('2026-10-15T10:00:00Z'))).toBe('open'); // Kiribati midnight
    expect(dailyWindow(d, Date.parse('2026-10-17T13:59:59Z'))).toBe('open');
    expect(dailyWindow(d, Date.parse('2026-10-17T14:00:00Z'))).toBe('closed');
  });
  it('a run lands on its date (daily) or on all-time + its week (endless)', () => {
    expect(boardsFor({ mode: 'daily', date: '2026-10-16' }, '2026-10-20')).toEqual(['daily:2026-10-16']);
    expect(boardsFor({ mode: 'endless' }, '2026-10-20')).toEqual(['endless:all', 'endless:w2026-43']);
  });
});

describe('checkSubmission', () => {
  const now = Date.parse('2026-10-16T12:00:00Z');
  const seed = dailySeed('2026-10-16');
  const g = playOut(seed, { mode: 'daily', quick: true });
  const base = {
    name: 'coral',
    installId: 'a'.repeat(32),
    mode: 'daily',
    seed,
    date: '2026-10-16',
    teach: false,
    rules: RULES_VERSION,
    moves: packMoves(g.moves),
    score: g.state.score,
    clientVersion: '1.0.0',
  };
  it('normalizes a good submission', () => {
    const c = checkSubmission({ ...base, avatar: 'hermit', runToken: 'ignored-for-daily' }, now, RULES_VERSION);
    expect(c.ok && c.sub).toMatchObject({ name: 'CORAL', mode: 'daily', avatar: 'hermit', score: g.state.score });
  });
  it('names each failure', () => {
    const bad = (patch: Record<string, unknown>) => {
      const c = checkSubmission({ ...base, ...patch }, now, RULES_VERSION);
      return c.ok ? 'ok' : c.code;
    };
    expect(checkSubmission(null, now, RULES_VERSION)).toMatchObject({ ok: false, code: 'bad_request' });
    expect(bad({ seed: -1 })).toBe('bad_request');
    expect(bad({ score: 1.5 })).toBe('bad_request');
    expect(bad({ rules: 'x' })).toBe('bad_request');
    expect(bad({ moves: 7 })).toBe('bad_request');
    expect(bad({ teach: 'yes' })).toBe('bad_request');
    expect(bad({ date: 'today' })).toBe('bad_request');
    expect(bad({ name: 'X'.repeat(30) })).toBe('name_rejected');
    expect(bad({ rules: RULES_VERSION + 1 })).toBe('upgrade_required');
    expect(bad({ score: g.state.score + 8 })).toBe('score_mismatch');
    expect(bad({ seed: (seed ^ 1) >>> 0 })).toBe('seed_mismatch');
  });
});

describe('BoardTable', () => {
  const row = (id: string, score: number, at: number, extra = {}) => ({
    id,
    name: id.toUpperCase(),
    score,
    moves: 10,
    at,
    visible: true,
    ...extra,
  });
  it('best vs first policies, ties by time then insertion', () => {
    const t = new BoardTable();
    const b = 'endless:all';
    expect(t.put(b, row('a', 100, 5), 'best')).toEqual({ improved: true, best: 100 });
    expect(t.put(b, row('a', 90, 6), 'best')).toEqual({ improved: false, best: 100 });
    expect(t.put(b, row('a', 100, 7), 'best')).toEqual({ improved: false, best: 100 }); // a tie keeps the earlier time
    t.put(b, row('b', 100, 6), 'best');
    t.put(b, row('c', 100, 5), 'best'); // same score, same time as a: inserted later
    expect(t.top(b, 10).entries.map((e) => e.name)).toEqual(['A', 'C', 'B']);
    const d = 'daily:2026-10-16';
    t.put(d, row('a', 10, 1), 'first');
    expect(t.put(d, row('a', 50, 2), 'first')).toEqual({ improved: false, best: 10 });
  });
  it('round-trips through dump/load and drops junk', () => {
    const t = new BoardTable();
    t.put('endless:all', row('a', 100, 5, { avatar: 'hermit' }), 'best');
    t.put('endless:all', row('b', 50, 5, { visible: false }), 'best');
    const u = new BoardTable();
    u.load({
      ...t.dump(),
      'bogus:board': [row('x', 1, 1)],
      'endless:w2026-42': [null, { id: 3 }, row('z', 5, 1, { name: '1!' })],
    });
    expect(u.top('endless:all', 5, 'b').entries.map((e) => [e.name, e.avatar, e.me])).toEqual([
      ['A', 'hermit', undefined],
      ['B', undefined, true],
    ]);
    expect(u.top('endless:w2026-42', 5).entries[0]!.name).toBe('PLAYER');
    u.load('nonsense');
    const kept = new BoardTable();
    kept.load(t.dump(), (r) => r.id !== 'a');
    expect(kept.top('endless:all', 5, 'b').total).toBe(1);
  });
  it('around/standing for missing players, rename, delete', () => {
    const t = new BoardTable();
    expect(t.around('endless:all', 'nobody', 2, 2)).toMatchObject({ me: null, total: 0 });
    expect(t.standing('endless:all', 'nobody', false)).toBeNull();
    t.put('endless:all', row('a', 100, 5), 'best');
    t.rename('a', 'KELP', 'hermit');
    expect(t.standing('endless:all', 'a', true)).toMatchObject({ rank: 1, total: 1, above: null });
    expect(t.top('endless:all', 1).entries[0]).toMatchObject({ name: 'KELP', avatar: 'hermit' });
    t.deletePlayer('a');
    expect(t.top('endless:all', 1).total).toBe(0);
  });
});
