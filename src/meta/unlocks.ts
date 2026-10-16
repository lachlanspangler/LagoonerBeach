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
  { id: 'pebble', name: 'Pebble', hint: '', unlocked: () => true },
  { id: 'glyph', name: 'Glyph (high contrast)', hint: '', unlocked: () => true },
  { id: 'seaglass', name: 'Sea Glass', hint: 'Capture a lagoon of 6+', unlocked: (p) => p.bestPocket >= 6 },
  { id: 'coral', name: 'Coral', hint: 'Play the daily 3 days in a row', unlocked: (p) => p.dailyLongest >= 3 },
  { id: 'lantern', name: 'Lantern', hint: 'Score 3,000 in one game', unlocked: (p) => p.best >= 3000 },
  { id: 'moonstone', name: 'Moonstone', hint: 'Set off a ripple cascade', unlocked: (p) => p.cascades >= 1 },
  { id: 'atoll', name: 'Atoll', hint: 'Capture a lagoon of 12+', unlocked: (p) => p.bestPocket >= 12 },
];

/** Skin ids newly unlocked going from `before` to `after` (in catalog order). */
export function newlyUnlocked(before: ProgressSnapshot, after: ProgressSnapshot): string[] {
  return SKINS.filter((s) => !s.unlocked(before) && s.unlocked(after)).map((s) => s.id);
}

export function unlockedIds(p: ProgressSnapshot): string[] {
  return SKINS.filter((s) => s.unlocked(p)).map((s) => s.id);
}
