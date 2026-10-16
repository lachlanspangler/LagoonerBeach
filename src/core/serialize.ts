/**
 * Versioned save format for an in-progress game. Decoding validates everything: a corrupted or
 * tampered save yields null (the app then starts a fresh game) instead of an impossible state.
 */
import { COLORS, TRAY_SIZE, type TrayPiece } from './dealer.ts';
import { anyMoveLeft, type GameState, type Mode } from './game.ts';
import { CELLS } from './grid.ts';
import { hasPiece } from './pieces.ts';
import { findPockets } from './rules.ts';

export interface SavedGame {
  v: 1;
  mode: Mode;
  seed: number;
  rng: number;
  board: string;
  tray: (TrayPiece | null)[];
  moves: number;
  trays: number;
  score: number;
  streak: number;
  dry: number;
  captures: number;
  bestPocket: number;
  over: boolean;
}

export function encodeGame(s: GameState): SavedGame {
  return {
    v: 1,
    mode: s.mode,
    seed: s.seed,
    rng: s.rng,
    board: Array.from(s.board, (c) => String(c)).join(''),
    tray: s.tray.map((t) => (t ? { pieceId: t.pieceId, color: t.color } : null)),
    moves: s.moves,
    trays: s.trays,
    score: s.score,
    streak: s.streak,
    dry: s.dry,
    captures: s.captures,
    bestPocket: s.bestPocket,
    over: s.over,
  };
}

const isUint = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 0xffffffff;

export function decodeGame(raw: unknown): GameState | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (o.v !== 1) return null;
  if (o.mode !== 'classic' && o.mode !== 'daily' && o.mode !== 'puzzle') return null;
  for (const k of ['seed', 'rng', 'moves', 'trays', 'score', 'streak', 'dry', 'captures', 'bestPocket'] as const)
    if (!isUint(o[k])) return null;
  if (typeof o.over !== 'boolean') return null;
  if (typeof o.board !== 'string' || o.board.length !== CELLS || !/^[0-9]+$/.test(o.board)) return null;
  const board = Uint8Array.from(o.board, (ch) => Number(ch));
  if (board.some((c) => c > COLORS)) return null;
  if (findPockets(board).length > 0) return null; // pockets are always resolved immediately
  if (!Array.isArray(o.tray) || o.tray.length !== TRAY_SIZE) return null;
  const tray: (TrayPiece | null)[] = [];
  for (const t of o.tray as unknown[]) {
    if (t === null) {
      tray.push(null);
      continue;
    }
    if (typeof t !== 'object') return null;
    const tp = t as Record<string, unknown>;
    if (typeof tp.pieceId !== 'string' || !hasPiece(tp.pieceId)) return null;
    if (!isUint(tp.color) || tp.color < 1 || tp.color > COLORS) return null;
    tray.push({ pieceId: tp.pieceId, color: tp.color });
  }
  // a live classic/daily game always has a piece to place (puzzles end with an empty tray)
  if (tray.every((t) => t === null) && !o.over && o.mode !== 'puzzle') return null;
  const over = o.over;
  if (!over && o.mode !== 'puzzle' && !anyMoveLeft(board, tray)) return null;

  return {
    v: 1,
    mode: o.mode,
    seed: o.seed as number,
    rng: o.rng as number,
    board,
    tray,
    moves: o.moves as number,
    trays: o.trays as number,
    score: o.score as number,
    streak: o.streak as number,
    dry: o.dry as number,
    captures: o.captures as number,
    bestPocket: o.bestPocket as number,
    over,
  };
}
