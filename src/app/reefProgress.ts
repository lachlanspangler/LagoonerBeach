/**
 * Reef progress moments as DOM events, so celebration code can subscribe without touching the reef
 * flow: `reefEvents.addEventListener('chapterComplete', (e) => e.detail.chapter …)`.
 * Fired once, on the clear that completes all 20 reefs of a chapter.
 */
import { CHAPTER_SIZE, chapterCleared, chapterName, chapterOf, reefId } from '../core/endless.ts';

export interface ChapterCompleteDetail {
  readonly chapter: number;
  readonly name: string;
  readonly first: number;
  readonly last: number;
  /** Reef number whose clear completed the chapter. */
  readonly reef: number;
  /** Total reefs cleared so far. */
  readonly totalCleared: number;
}

export const reefEvents = new EventTarget();

/** Chapter progress label: "Chapter 23 · Heron Narrows · 7/20" (position of reef n in its chapter). */
export function chapterLabel(n: number): string {
  const c = chapterOf(n);
  return `Chapter ${c.chapter} · ${chapterName(c.chapter)} · ${c.pos}/${CHAPTER_SIZE}`;
}

/**
 * Call after reef n was cleared for the first time (`solved` already includes it). Dispatches
 * 'chapterComplete' and returns its detail if that clear completed the chapter.
 */
export function noteFirstClear(n: number, solved: readonly string[]): ChapterCompleteDetail | null {
  const set = new Set(solved);
  if (!set.has(reefId(n))) return null;
  const c = chapterOf(n);
  if (chapterCleared(set, c.chapter) !== CHAPTER_SIZE) return null;
  const detail: ChapterCompleteDetail = {
    chapter: c.chapter,
    name: chapterName(c.chapter),
    first: c.first,
    last: c.last,
    reef: n,
    totalCleared: set.size,
  };
  reefEvents.dispatchEvent(new CustomEvent<ChapterCompleteDetail>('chapterComplete', { detail }));
  return detail;
}
