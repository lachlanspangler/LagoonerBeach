import { describe, expect, it } from 'vitest';
import { CLEAN_REEF_BONUS, STREAK_GRACE, nextStreak, scoreMove } from '../../src/core/scoring.ts';

const pocket = (area: number, ring: number) => ({
  cells: Array.from({ length: area }, (_, i) => i),
  ring: Array.from({ length: ring }, (_, i) => 100 + i),
});
/** One wave containing the given pockets. */
const pk = (area: number, ring: number) => pocket(area, ring);
const W = (...ps: ReturnType<typeof pocket>[]) => [{ pockets: ps, cleared: [] }];

describe('scoreMove', () => {
  it('no capture = placed cells only', () => {
    expect(scoreMove(4, [], 3, false).total).toBe(4);
  });
  it('pocket value is area × ring', () => {
    expect(scoreMove(3, W(pk(1, 8)), 1, false).total).toBe(3 + 8);
    expect(scoreMove(3, W(pk(6, 14)), 1, false).total).toBe(3 + 84);
  });
  it('multiple pockets multiply', () => {
    expect(scoreMove(1, W(pk(1, 4), pk(1, 4)), 1, false).total).toBe(1 + 16);
  });
  it('streak raises capture by quarters, capped at ×4', () => {
    expect(scoreMove(0, W(pk(1, 8)), 2, false).total).toBe(10);
    expect(scoreMove(0, W(pk(1, 8)), 13, false).total).toBe(32);
    expect(scoreMove(0, W(pk(1, 8)), 99, false).total).toBe(32);
  });
  it('clean reef bonus only with a capture that empties the board', () => {
    expect(scoreMove(3, W(pk(1, 8)), 1, true).cleanBonus).toBe(CLEAN_REEF_BONUS);
    expect(scoreMove(3, [], 1, true).cleanBonus).toBe(0);
  });
  it('bigger lagoons are worth disproportionately more than pinches', () => {
    const pinch = scoreMove(0, W(pk(1, 8)), 1, false).total;
    const lagoon = scoreMove(0, W(pk(4, 12)), 1, false).total;
    expect(lagoon / pinch).toBeGreaterThanOrEqual(6);
  });
});

describe('cascades', () => {
  it('later waves are multiplied by their wave number', () => {
    const waves = [
      { pockets: [pocket(1, 8)], cleared: [] },
      { pockets: [pocket(9, 16)], cleared: [] },
    ];
    expect(scoreMove(0, waves, 1, false).total).toBe(8 + 9 * 16 * 2);
    expect(scoreMove(0, waves, 1, false).waves).toBe(2);
  });
});

describe('nextStreak', () => {
  it('increments on capture and survives grace-1 dry moves', () => {
    let s = { streak: 0, dry: 0 };
    s = nextStreak(s.streak, s.dry, true);
    expect(s.streak).toBe(1);
    for (let i = 0; i < STREAK_GRACE - 1; i++) s = nextStreak(s.streak, s.dry, false);
    expect(s.streak).toBe(1);
    s = nextStreak(s.streak, s.dry, false);
    expect(s.streak).toBe(0);
  });
});
