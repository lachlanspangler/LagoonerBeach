/** Plays complete games with a bot and summarizes them. Pure; used by tests and tooling. */
import { applyMove, newGame, type GameState, type NewGameOptions } from '../core/game.ts';
import { Rng } from '../core/rng.ts';
import type { Bot } from './bots.ts';

export interface GameSummary {
  readonly seed: number;
  readonly moves: number;
  readonly score: number;
  readonly captures: number;
  readonly bestPocket: number;
  readonly capped: boolean;
  readonly maxStreak: number;
}

export function playGame(
  bot: Bot,
  seed: number,
  cap = 500,
  opts: NewGameOptions = {},
): { summary: GameSummary; final: GameState } {
  let s = newGame(seed, opts);
  const rng = new Rng(seed ^ 0x9e3779b9);
  let maxStreak = 0;
  while (!s.over && s.moves < cap) {
    const m = bot(s, rng);
    if (!m) break;
    const r = applyMove(s, m, opts.ramp ? { ramp: opts.ramp } : {});
    if (!r) throw new Error(`bot produced illegal move ${JSON.stringify(m)} at move ${s.moves}`);
    s = r.state;
    maxStreak = Math.max(maxStreak, s.streak);
  }
  return {
    summary: {
      seed,
      moves: s.moves,
      score: s.score,
      captures: s.captures,
      bestPocket: s.bestPocket,
      capped: !s.over && s.moves >= cap,
      maxStreak,
    },
    final: s,
  };
}

export const median = (a: readonly number[]): number => {
  const b = [...a].sort((x, y) => x - y);
  return b.length ? b[Math.floor(b.length / 2)]! : 0;
};
export const mean = (a: readonly number[]): number => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
