/** Reef puzzles as games: fixed board + fixed pieces, no refills. Win = every piece placed, board empty. */
import { COLORS } from './dealer.ts';
import type { GameState } from './game.ts';
import { CELLS } from './grid.ts';
import { boardFromString } from './puzzlegen.ts';

export interface PuzzleDef {
  readonly id: string;
  readonly board: string;
  readonly pieces: readonly string[];
}

export function newPuzzleGame(p: PuzzleDef, index: number): GameState {
  const board = boardFromString(p.board);
  // tray colors avoid the most common reef color so placed pieces stand out
  const counts = new Array(COLORS + 1).fill(0);
  for (let i = 0; i < CELLS; i++) counts[board[i]!]++;
  const palette = Array.from({ length: COLORS }, (_, i) => i + 1).sort((a, b) => counts[a] - counts[b]);
  return {
    v: 1,
    mode: 'puzzle',
    seed: index >>> 0,
    rng: 0,
    board,
    tray: [0, 1, 2].map((i) => (p.pieces[i] ? { pieceId: p.pieces[i]!, color: palette[i]! } : null)),
    moves: 0,
    trays: 1,
    score: 0,
    streak: 0,
    dry: 0,
    captures: 0,
    bestPocket: 0,
    over: false,
  };
}

export type PuzzleStatus = 'playing' | 'solved' | 'failed';

export function puzzleStatus(s: GameState): PuzzleStatus {
  const left = s.tray.some((t) => t !== null);
  let empty = true;
  for (let i = 0; i < CELLS; i++) if (s.board[i] !== 0) empty = false;
  if (!left) return empty ? 'solved' : 'failed';
  return s.over ? 'failed' : 'playing';
}
