/**
 * Combo (= streak) economics: does any cheap strategy farm the multiplier?
 *   npx tsx scripts/combo-sim.ts [games]
 * Compares greedy, search, human-like and a "farmer" that always takes the cheapest capture
 * available to keep the combo alive. Reports score, moves, max combo and the multiplier's share.
 */
import { applyMove, legalMoves, newGame, type GameState, type Move } from '../src/core/game.ts';
import { Rng } from '../src/core/rng.ts';
import { evaluate, greedyBot, humanBot, searchBot, type Bot } from '../src/sim/bots.ts';
import { median } from '../src/sim/play.ts';

const farmer: Bot = (s) => {
  // any capture beats any non-capture; among captures prefer the smallest raw gain (pinches)
  let best: Move | null = null;
  let bv = -Infinity;
  for (const m of legalMoves(s)) {
    const r = applyMove(s, m, { noRefill: true })!;
    const cap = r.state.streak > s.streak;
    const v = (cap ? 1e6 - (r.state.score - s.score) * 10 : 0) + evaluate(r.state.board);
    if (v > bv) {
      bv = v;
      best = m;
    }
  }
  return best;
};

const GAMES = Number(process.argv[2] ?? 40);
const bots: Record<string, Bot> = { greedy: greedyBot, human: humanBot, farmer, search: searchBot };
for (const [name, bot] of Object.entries(bots)) {
  const n = name === 'search' ? Math.ceil(GAMES / 4) : GAMES;
  const scores: number[] = [];
  const moves: number[] = [];
  const maxC: number[] = [];
  let fromMult = 0;
  let total = 0;
  for (let g = 0; g < n; g++) {
    let s: GameState = newGame(1000 + g);
    const rng = new Rng(g);
    let mc = 0;
    while (!s.over && s.moves < 600) {
      const m = bot(s, rng);
      if (!m) break;
      const r = applyMove(s, m)!;
      for (const e of r.events)
        if (e.type === 'captured' && e.score.streakQuarters > 4) {
          const cap = e.score.total - e.score.placed - e.score.cleanBonus;
          fromMult += cap - Math.floor((cap * 4) / e.score.streakQuarters);
        }
      s = r.state;
      mc = Math.max(mc, s.streak);
    }
    scores.push(s.score);
    moves.push(s.moves);
    maxC.push(mc);
    total += s.score;
  }
  console.log(
    `${name.padEnd(7)} games ${String(n).padStart(3)}  score med ${String(median(scores)).padStart(6)}  moves med ${String(median(moves)).padStart(4)}  max combo med ${String(median(maxC)).padStart(3)}  multiplier share ${((fromMult / total) * 100).toFixed(0)}%`,
  );
}
