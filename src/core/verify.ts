/**
 * Replay verification of a finished run (leaderboards). Shared by the server, the mock backend and
 * the client's "can this run be posted?" check, so all three agree on what a valid run is.
 */
import type { GameState } from './game.ts';
import { MAX_LOG_MOVES, unpackMoves } from './movelog.ts';
import { replay } from './replay.ts';

export interface RunToVerify {
  readonly mode: 'daily' | 'endless';
  readonly seed: number;
  readonly teach: boolean;
  /** Packed move log (movelog.ts). */
  readonly moves: string;
}

export type VerifyFailure = 'log_invalid' | 'replay_invalid' | 'not_over';
export type VerifyResult = { ok: true; state: GameState } | { ok: false; reason: VerifyFailure };

export function verifyRun(r: RunToVerify, maxMoves = MAX_LOG_MOVES): VerifyResult {
  const moves = unpackMoves(r.moves, maxMoves);
  if (!moves) return { ok: false, reason: 'log_invalid' };
  let state: GameState;
  try {
    state = replay({
      seed: r.seed >>> 0,
      opts: r.mode === 'daily' ? { mode: 'daily' } : { mode: 'classic', teach: r.teach },
      moves,
    });
  } catch {
    return { ok: false, reason: 'replay_invalid' };
  }
  // only finished games rank (and a log must not continue past game over: replay rejects that)
  if (!state.over) return { ok: false, reason: 'not_over' };
  return { ok: true, state };
}
