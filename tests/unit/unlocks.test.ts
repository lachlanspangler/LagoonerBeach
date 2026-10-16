import { describe, expect, it } from 'vitest';
import { SKINS, newlyUnlocked, unlockedIds, type ProgressSnapshot } from '../../src/meta/unlocks.ts';

const zero: ProgressSnapshot = {
  best: 0,
  bestPocket: 0,
  cascades: 0,
  cleanReefs: 0,
  games: 0,
  captures: 0,
  dailyLongest: 0,
};

describe('unlocks', () => {
  it('default and accessibility skins are always available', () => {
    expect(unlockedIds(zero)).toEqual(['pebble', 'glyph']);
  });
  it('reports only newly crossed thresholds', () => {
    expect(newlyUnlocked(zero, { ...zero, bestPocket: 6 })).toEqual(['seaglass']);
    expect(newlyUnlocked({ ...zero, bestPocket: 6 }, { ...zero, bestPocket: 13 })).toEqual(['atoll']);
    expect(newlyUnlocked(zero, zero)).toEqual([]);
  });
  it('every skin is reachable and ids are unique', () => {
    const max: ProgressSnapshot = {
      best: 1e9,
      bestPocket: 36,
      cascades: 99,
      cleanReefs: 99,
      games: 99,
      captures: 999,
      dailyLongest: 99,
    };
    expect(unlockedIds(max)).toHaveLength(SKINS.length);
    expect(new Set(SKINS.map((s) => s.id)).size).toBe(SKINS.length);
  });
});
