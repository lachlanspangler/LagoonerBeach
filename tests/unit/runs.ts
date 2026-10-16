/** Test helper: complete games played by the greedy bot (for leaderboard / replay tests). */
import { applyMove, newGame, type GameState, type Move } from '../../src/core/game.ts';
import { Rng } from '../../src/core/rng.ts';
import { greedyBot, randomBot } from '../../src/sim/bots.ts';

/** Play a full game; returns its moves and final state. `quick` uses the random bot (short games). */
export function playOut(
  seed: number,
  opts: { mode?: 'daily' | 'classic'; teach?: boolean; quick?: boolean } = {},
): { moves: Move[]; state: GameState } {
  let s = newGame(seed, { mode: opts.mode, teach: opts.teach });
  const moves: Move[] = [];
  const bot = opts.quick ? randomBot : greedyBot;
  while (!s.over) {
    const m = bot(s, new Rng(s.moves + 1));
    if (!m) break;
    moves.push(m);
    s = applyMove(s, m)!.state;
  }
  return { moves, state: s };
}
