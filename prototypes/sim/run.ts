/**
 * Runs bots against mechanics and prints JSON metrics.
 * Usage: npx tsx prototypes/sim/run.ts <mechanicId> <botId> <games> [cap]
 */
import { Rng } from './core.ts';
import { ALL } from './mechanics.ts';
import { BOTS } from './bots.ts';

const [mid, bid, gamesS, capS] = process.argv.slice(2);
const mech = ALL.find((m) => m.id === mid)!;
const bot = BOTS[bid!]!;
const games = Number(gamesS ?? 50);
const cap = Number(capS ?? 500);

const res: { moves: number; score: number; events: number; cleared: number; capped: boolean; bigClears: number; first: number; maxArea: number; area: number }[] = [];
const t0 = Date.now();
for (let g = 0; g < games; g++) {
  let s = mech.init(1000 + g);
  const r = new Rng(9000 + g);
  let events = 0, cleared = 0, bigClears = 0, first = -1, maxArea = 0, area = 0;
  for (;;) {
    if (mech.budget && s.moves >= mech.budget) break;
    if (s.moves >= cap) break;
    const ms = mech.moves(s);
    if (!ms.length) break;
    const mv = bot(mech, s, r);
    const out = mech.apply(s, mv);
    events += out.events;
    cleared += out.cleared;
    if (out.cleared >= 12) bigClears++;
    if (out.events && first < 0) first = s.moves + 1;
    if (out.area) { area += out.area; maxArea = Math.max(maxArea, out.area); }
    s = out.state;
  }
  res.push({ moves: s.moves, score: s.score, events, cleared, capped: !mech.budget && s.moves >= cap, bigClears, first: first < 0 ? 999 : first, maxArea, area });
}
const med = (a: number[]) => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]!; };
const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
const p = (a: number[], q: number) => { const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(b.length * q))]!; };
console.log(JSON.stringify({
  mechanic: mid, bot: bid, games, cap,
  medMoves: med(res.map((r) => r.moves)), p10Moves: p(res.map((r) => r.moves), 0.1), p90Moves: p(res.map((r) => r.moves), 0.9),
  meanScore: Math.round(mean(res.map((r) => r.score))), medScore: med(res.map((r) => r.score)),
  movesPerClear: +(mean(res.map((r) => r.moves)) / Math.max(1e-9, mean(res.map((r) => r.events)))).toFixed(2),
  bigClearsPerGame: +mean(res.map((r) => r.bigClears)).toFixed(2),
  medFirstClear: med(res.map((r) => r.first)),
  areaPerPocket: +(mean(res.map((r) => r.area)) / Math.max(1e-9, mean(res.map((r) => r.events)))).toFixed(2),
  medMaxArea: med(res.map((r) => r.maxArea)),
  cappedPct: Math.round((100 * res.filter((r) => r.capped).length) / games),
  ms: Date.now() - t0,
}));
