import { describe, expect, it } from 'vitest';
import { LOOKS, lookFor } from '../../src/render/skins.ts';
import { SKINS, newlyUnlocked, nextUnlocks, unlockedIds, type ProgressSnapshot } from '../../src/meta/unlocks.ts';

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
    expect(unlockedIds(zero)).toEqual(['pebble', 'smooth', 'glyph']);
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
  it('a first game that crosses several milestones unlocks one style; the rest come one per game', () => {
    const big: ProgressSnapshot = { ...zero, games: 1, best: 5000, bestPocket: 14, cascades: 4 };
    let have = unlockedIds(zero);
    const got: string[] = [];
    for (let g = 0; g < 6; g++) {
      const r = nextUnlocks(have, big);
      if (r.fresh) got.push(r.fresh);
      have = r.ids;
    }
    expect(got).toEqual(['seaglass', 'lantern', 'moonstone', 'atoll']);
    expect(nextUnlocks(unlockedIds(zero), big).fresh).toBe('seaglass');
  });
  it('old saves keep every style they already have, even below a moved threshold', () => {
    const r = nextUnlocks(['pebble', 'glyph', 'moonstone', 'lantern'], { ...zero, cascades: 1 });
    expect(r.ids).toEqual(['pebble', 'smooth', 'glyph', 'lantern', 'moonstone']);
    expect(r.fresh).toBeNull();
  });
  it('thresholds are spread out: one cascade or a small lagoon is not enough for later styles', () => {
    expect(unlockedIds({ ...zero, cascades: 1, bestPocket: 5 })).toEqual(['pebble', 'smooth', 'glyph']);
  });
  it('every skin has a look; a saved "pebble" is the reef default, the old look stays as "smooth"', () => {
    for (const s of SKINS) expect(LOOKS[s.id], s.id).toBeDefined();
    expect(lookFor('pebble').style).toBe('reef');
    expect(lookFor('smooth').style).toBe('pebble');
    expect(lookFor('smooth').colors).toEqual(lookFor('pebble').colors);
    expect(lookFor('no-such-skin').id).toBe('pebble');
  });
});
