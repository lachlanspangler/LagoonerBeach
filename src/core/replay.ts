/** Replays a move log from a seed. Used for determinism tests, daily verification and bug repro. */
import { applyMove, newGame, type GameState, type Move, type NewGameOptions } from './game.ts';

export interface Replay {
  readonly seed: number;
  readonly opts?: NewGameOptions;
  readonly moves: readonly Move[];
}

export function replay(r: Replay): GameState {
  let s = newGame(r.seed, r.opts);
  r.moves.forEach((m, i) => {
    const res = applyMove(s, m, r.opts?.ramp ? { ramp: r.opts.ramp } : {});
    if (!res) throw new Error(`replay: illegal move #${i} ${JSON.stringify(m)}`);
    s = res.state;
  });
  return s;
}
