/**
 * Combo (= streak) economics: does any cheap strategy farm the multiplier?
 *   npx tsx scripts/combo-sim.ts [games]
 * Compares greedy, search, human-like and a "farmer" that always takes the cheapest capture
 * available to keep the combo alive. Reports score, moves, max combo and the multiplier's share.
 */
import { applyMove, newGame, type GameState } from '../src/core/game.ts';
import { Rng } from '../src/core/rng.ts';
import { farmerBot as farmer, greedyBot, humanBot, searchBot, type Bot } from '../src/sim/bots.ts';
import { median } from '../src/sim/play.ts';
import { momentFor } from '../src/render/moments.ts';

const GAMES = Number(process.argv[2] ?? 40);
const bots: Record<string, Bot> = { greedy: greedyBot, human: humanBot, farmer, search: searchBot };
for (const [name, bot] of Object.entries(bots)) {
  const n = name === 'search' ? Math.ceil(GAMES / 4) : GAMES;
  const scores: number[] = [];
  const moves: number[] = [];
  const maxC: number[] = [];
  let fromMult = 0;
  let total = 0;
  const tiers = [0, 0, 0, 0, 0];
  const words = new Map<string, number>();
  let allMoves = 0;
  for (let g = 0; g < n; g++) {
    let s: GameState = newGame(1000 + g);
    const rng = new Rng(g);
    let mc = 0;
    while (!s.over && s.moves < 600) {
      const m = bot(s, rng);
      if (!m) break;
      const r = applyMove(s, m)!;
      allMoves++;
      for (const e of r.events)
        if (e.type === 'captured') {
          const mo = momentFor(e, { prevStreak: s.streak });
          tiers[mo.tier]!++;
          if (mo.word) words.set(mo.word.replace(/\d+/, 'N'), (words.get(mo.word.replace(/\d+/, 'N')) ?? 0) + 1);
        }
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
  const caps = tiers.reduce((a, b) => a + b, 0);
  console.log(
    `        moment tiers per capture: ${tiers.map((t, i) => `T${i} ${((t / caps) * 100).toFixed(0)}%`).join('  ')}  · a word on ${(((caps - tiers[0]!) / allMoves) * 100).toFixed(0)}% of moves`,
  );
  console.log(
    `        words: ${[...words]
      .sort((a, b) => b[1] - a[1])
      .map(([w, k]) => `${w} ${((k / caps) * 100).toFixed(1)}%`)
      .join(' · ')}`,
  );
}
