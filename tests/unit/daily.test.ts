import { describe, expect, it } from 'vitest';
import { NO_STREAK, dailySeed, dayIndex, recordDaily, visibleStreak } from '../../src/core/daily.ts';

describe('daily', () => {
  it('seed is stable per date and differs across dates', () => {
    expect(dailySeed('2026-10-16')).toBe(dailySeed('2026-10-16'));
    expect(dailySeed('2026-10-16')).not.toBe(dailySeed('2026-10-17'));
    expect(() => dailySeed('16/10/2026')).toThrow();
  });
  it('dayIndex counts calendar days including month/year boundaries', () => {
    expect(dayIndex('2026-01-01')).toBe(0);
    expect(dayIndex('2026-03-01') - dayIndex('2026-02-28')).toBe(1);
    expect(dayIndex('2027-01-01') - dayIndex('2026-12-31')).toBe(1);
  });
  it('streak grows on consecutive days, resets after a gap, is idempotent', () => {
    let s = recordDaily(NO_STREAK, 10);
    s = recordDaily(s, 10);
    expect(s.current).toBe(1);
    s = recordDaily(s, 11);
    s = recordDaily(s, 12);
    expect(s.current).toBe(3);
    expect(visibleStreak(s, 13)).toBe(3);
    expect(visibleStreak(s, 14)).toBe(0);
    s = recordDaily(s, 15);
    expect(s.current).toBe(1);
    expect(s.longest).toBe(3);
  });
});
