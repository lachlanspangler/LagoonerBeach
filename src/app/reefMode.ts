/**
 * Everything Reefs mode needs and Endless/Daily don't: the reef source (pack + endless generator +
 * its synchronous fallback), puzzle rules, the hint solver and chapter names/progress. main.ts
 * loads this chunk together with the puzzle pack (and prefetches it at idle), so the first frame
 * of Endless play doesn't pay for the solvers.
 */
export { ReefSource } from './reefSource.ts';
export { chapterLabel, noteFirstClear, reefEvents } from './reefProgress.ts';
export { CHAPTER_SIZE, chapterCleared, chapterName, chapterOf, reefId } from '../core/endless.ts';
export { newPuzzleGame, puzzleStatus } from '../core/puzzle.ts';
export { solve } from '../core/solver.ts';
