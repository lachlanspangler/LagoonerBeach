/**
 * Daily challenge: everyone gets the same seed for a calendar date (local date string supplied by
 * the caller so the core never reads the clock).
 */
import { hashSeed } from './rng.ts';

export const DAILY_SALT = 'atoll-daily-v1';

export function dailySeed(isoDate: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) throw new Error(`bad date ${isoDate}`);
  return hashSeed(`${DAILY_SALT}:${isoDate}`);
}

/** Day number since 2026-01-01 for streak math (dates as YYYY-MM-DD, UTC arithmetic). */
export function dayIndex(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number) as [number, number, number];
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(2026, 0, 1)) / 86_400_000);
}

export interface DailyStreak {
  readonly lastDay: number | null;
  readonly current: number;
  readonly longest: number;
}

export const NO_STREAK: DailyStreak = { lastDay: null, current: 0, longest: 0 };

/** Record that the daily for `day` was completed. Idempotent within a day. */
export function recordDaily(s: DailyStreak, day: number): DailyStreak {
  // idempotent within a day; an older day finished late (e.g. a stale tab) never rewinds the streak
  if (s.lastDay !== null && day <= s.lastDay) return s;

  const current = s.lastDay !== null && day === s.lastDay + 1 ? s.current + 1 : 1;
  return { lastDay: day, current, longest: Math.max(s.longest, current) };
}

/** The streak as it should be displayed today (a missed day shows 0 until the next completion). */
export function visibleStreak(s: DailyStreak, today: number): number {
  if (s.lastDay === null) return 0;
  return today - s.lastDay <= 1 ? s.current : 0;
}
