/**
 * Cosmetic unlocks (pure). Nothing here affects gameplay. Accessibility skins are never gated.
 */
export interface ProgressSnapshot {
  readonly best: number;
  readonly bestPocket: number;
  readonly cascades: number;
  readonly cleanReefs: number;
  readonly games: number;
  readonly captures: number;
  readonly dailyLongest: number;
}

export interface SkinDef {
  readonly id: string;
  readonly name: string;
  /** Short, text-only hint shown while locked. */
  readonly hint: string;
  readonly unlocked: (p: ProgressSnapshot) => boolean;
}

export const SKINS: readonly SkinDef[] = [
  // the default style; "pebble" stays its id (saves), but the word belongs to the reef blocks
  { id: 'pebble', name: 'Reef', hint: '', unlocked: () => true },
  // the old default look (ADR 0014): never gated, so nobody loses it
  { id: 'smooth', name: 'Smooth Stones', hint: '', unlocked: () => true },
  { id: 'glyph', name: 'Glyph (high contrast)', hint: '', unlocked: () => true },
  { id: 'seaglass', name: 'Sea Glass', hint: 'Capture a lagoon of 6+', unlocked: (p) => p.bestPocket >= 6 },
  { id: 'coral', name: 'Coral', hint: 'Play the daily 3 days in a row', unlocked: (p) => p.dailyLongest >= 3 },
  { id: 'lantern', name: 'Lantern', hint: 'Score 3,000 in one game', unlocked: (p) => p.best >= 3000 },
  { id: 'moonstone', name: 'Moonstone', hint: 'Set off 3 ripple cascades', unlocked: (p) => p.cascades >= 3 },
  { id: 'atoll', name: 'Atoll', hint: 'Capture a lagoon of 12+', unlocked: (p) => p.bestPocket >= 12 },
];

/** Skin ids newly unlocked going from `before` to `after` (in catalog order). */
export function newlyUnlocked(before: ProgressSnapshot, after: ProgressSnapshot): string[] {
  return SKINS.filter((s) => !s.unlocked(before) && s.unlocked(after)).map((s) => s.id);
}

export function unlockedIds(p: ProgressSnapshot): string[] {
  return SKINS.filter((s) => s.unlocked(p)).map((s) => s.id);
}

/**
 * Styles a player has after a game ends: everything they had (old saves keep theirs, even if a
 * threshold moved) plus at most ONE newly earned style, the first in catalog order. A fresh profile
 * can cross several milestones in its first game; the rest arrive one per game after that.
 */
export function nextUnlocks(have: readonly string[], p: ProgressSnapshot): { ids: string[]; fresh: string | null } {
  const ids = [...new Set([...unlockedIds(ALWAYS), ...have])];
  const fresh = SKINS.find((s) => s.unlocked(p) && !ids.includes(s.id))?.id ?? null;
  if (fresh) ids.push(fresh);
  return { ids: SKINS.map((s) => s.id).filter((id) => ids.includes(id)), fresh };
}

/** Styles that are never gated (the default and the accessibility ones). */
export function alwaysUnlocked(): string[] {
  return unlockedIds(ALWAYS);
}

const ALWAYS: ProgressSnapshot = {
  best: 0,
  bestPocket: 0,
  cascades: 0,
  cleanReefs: 0,
  games: 0,
  captures: 0,
  dailyLongest: 0,
};
