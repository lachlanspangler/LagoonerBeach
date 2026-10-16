/**
 * Game session as pure functions over an immutable-by-convention GameState.
 * `applyMove` resolves a move atomically and returns domain events; presentation layers animate
 * those events but never re-implement rules.
 */
import { CELLS } from './grid.ts';
import { DEFAULT_RAMP, dealTray, teachingTray, type RampConfig, type TrayPiece } from './dealer.ts';
import { pieceById } from './pieces.ts';
import { Rng } from './rng.ts';
import { canPlace, emptyBoard, fitsAnywhere, resolvePlacement, type Board, type Pocket } from './rules.ts';

export interface CapturedWave {
  readonly pockets: readonly Pocket[];
  readonly cleared: readonly { cell: number; color: number }[];
}
import { nextStreak, scoreMove, type ScoreBreakdown } from './scoring.ts';

export type Mode = 'classic' | 'daily';

export interface GameState {
  readonly v: 1;
  readonly mode: Mode;
  readonly seed: number;
  readonly rng: number;
  readonly board: Board;
  readonly tray: readonly (TrayPiece | null)[];
  readonly moves: number;
  readonly trays: number;
  readonly score: number;
  readonly streak: number;
  readonly dry: number;
  readonly captures: number;
  readonly bestPocket: number;
  readonly over: boolean;
}

export interface Move {
  readonly slot: number;
  readonly x: number;
  readonly y: number;
}

export type GameEvent =
  | { type: 'placed'; slot: number; pieceId: string; color: number; x: number; y: number; cells: readonly number[] }
  | {
      type: 'captured';
      /** All pockets across waves. */
      pockets: readonly Pocket[];
      /** All cleared cells across waves, with the color they had. */
      cleared: readonly { cell: number; color: number }[];
      waves: readonly CapturedWave[];
      score: ScoreBreakdown;
      streak: number;
    }
  | { type: 'streakLost'; was: number }
  | { type: 'cleanReef'; bonus: number }
  | { type: 'scored'; delta: number; total: number }
  | { type: 'dealt'; tray: readonly TrayPiece[] }
  | { type: 'gameOver'; score: number; moves: number };

export interface NewGameOptions {
  readonly mode?: Mode;
  /** Deal the scripted teaching tray first (first-ever game). */
  readonly teach?: boolean;
  readonly ramp?: RampConfig;
}

export function newGame(seed: number, opts: NewGameOptions = {}): GameState {
  const rng = new Rng(seed);
  const board = emptyBoard();
  const tray = opts.teach ? teachingTray(rng) : dealTray(rng, board, 0, opts.ramp ?? DEFAULT_RAMP);
  return {
    v: 1,
    mode: opts.mode ?? 'classic',
    seed: seed >>> 0,
    rng: rng.state,
    board,
    tray,
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

export function isLegal(s: GameState, m: Move): boolean {
  if (s.over) return false;
  const t = s.tray[m.slot];
  return !!t && canPlace(s.board, pieceById(t.pieceId), m.x, m.y);
}

export function legalMoves(s: GameState): Move[] {
  const out: Move[] = [];
  if (s.over) return out;
  s.tray.forEach((t, slot) => {
    if (!t) return;
    const p = pieceById(t.pieceId);
    for (let y = 0; y <= 8 - p.h; y++)
      for (let x = 0; x <= 8 - p.w; x++) if (canPlace(s.board, p, x, y)) out.push({ slot, x, y });
  });
  return out;
}

export function anyMoveLeft(board: Board, tray: readonly (TrayPiece | null)[]): boolean {
  return tray.some((t) => t !== null && fitsAnywhere(board, pieceById(t.pieceId)));
}

export interface ApplyOptions {
  /** Don't deal a new tray when the last piece is used (search bots stay within known info). */
  readonly noRefill?: boolean;
  readonly ramp?: RampConfig;
}

export interface MoveResult {
  readonly state: GameState;
  readonly events: GameEvent[];
}

/** Apply a move. Returns null if illegal. */
export function applyMove(s: GameState, m: Move, opts: ApplyOptions = {}): MoveResult | null {
  if (!isLegal(s, m)) return null;
  const t = s.tray[m.slot]!;
  const piece = pieceById(t.pieceId);
  const res = resolvePlacement(s.board, piece, m.x, m.y, t.color);
  const events: GameEvent[] = [
    { type: 'placed', slot: m.slot, pieceId: t.pieceId, color: t.color, x: m.x, y: m.y, cells: res.placed },
  ];

  const captured = res.pockets.length > 0;
  const st = nextStreak(s.streak, s.dry, captured);
  let empty = true;
  for (let i = 0; i < CELLS; i++)
    if (res.board[i] !== 0) {
      empty = false;
      break;
    }
  const score = scoreMove(res.placed.length, res.waves, st.streak, empty);
  if (captured) {
    // colors as they were just before clearing (the placed piece may be part of a ring)
    const before = s.board.slice();
    for (const c of res.placed) before[c] = t.color;
    const tag = (cell: number) => ({ cell, color: before[cell]! });
    events.push({
      type: 'captured',
      pockets: res.pockets,
      cleared: res.cleared.map(tag),
      waves: res.waves.map((w) => ({ pockets: w.pockets, cleared: w.cleared.map(tag) })),
      score,
      streak: st.streak,
    });
    if (score.cleanBonus) events.push({ type: 'cleanReef', bonus: score.cleanBonus });
  } else if (s.streak > 0 && st.streak === 0) {
    events.push({ type: 'streakLost', was: s.streak });
  }
  events.push({ type: 'scored', delta: score.total, total: s.score + score.total });

  let tray = s.tray.map((x, i) => (i === m.slot ? null : x));
  let rng = s.rng;
  let trays = s.trays;
  const moves = s.moves + 1;
  if (!opts.noRefill && tray.every((x) => x === null)) {
    const r = new Rng(rng);
    tray = dealTray(r, res.board, moves, opts.ramp ?? DEFAULT_RAMP);
    rng = r.state;
    trays++;
    events.push({ type: 'dealt', tray: tray as TrayPiece[] });
  }
  const bestPocket = Math.max(s.bestPocket, ...res.pockets.map((p) => p.cells.length), 0);
  const hasPieces = tray.some((x) => x !== null);
  const over = hasPieces && !anyMoveLeft(res.board, tray);
  const state: GameState = {
    ...s,
    rng,
    board: res.board,
    tray,
    moves,
    trays,
    score: s.score + score.total,
    streak: st.streak,
    dry: st.dry,
    captures: s.captures + res.pockets.length,
    bestPocket,
    over,
  };
  if (over) events.push({ type: 'gameOver', score: state.score, moves });
  return { state, events };
}

export interface Preview {
  readonly pockets: readonly Pocket[];
  readonly cleared: readonly number[];
  readonly waves: number;
  readonly points: number;
}

/** What would happen if this move were made (for ghost/lagoon previews). Null if illegal. */
export function previewMove(s: GameState, m: Move): Preview | null {
  if (!isLegal(s, m)) return null;
  const t = s.tray[m.slot]!;
  const piece = pieceById(t.pieceId);
  const res = resolvePlacement(s.board, piece, m.x, m.y, t.color);
  const st = nextStreak(s.streak, s.dry, res.pockets.length > 0);
  let empty = true;
  for (let i = 0; i < CELLS; i++)
    if (res.board[i] !== 0) {
      empty = false;
      break;
    }
  return {
    pockets: res.pockets,
    cleared: res.cleared,
    waves: res.waves.length,
    points: scoreMove(res.placed.length, res.waves, st.streak, empty).total,
  };
}
