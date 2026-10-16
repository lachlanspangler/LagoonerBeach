/**
 * Simulates a player's days to tune the Beach Journal: per day 5 Classic (40% at night), 1 Daily,
 * 3 Reef puzzles (in order), using the human-like bot. Prints discoveries per day.
 *   npx tsx scripts/catch-sim.ts [--days 35] [--players 6]
 */
import { applyMove, newGame } from '../src/core/game.ts';
import { newPuzzleGame, puzzleStatus } from '../src/core/puzzle.ts';
import { Rng } from '../src/core/rng.ts';
import { humanBot } from '../src/sim/bots.ts';
import { SPECIES } from '../src/meta/creatures.ts';
import { catchCapture } from '../src/meta/catch.ts';
import { EMPTY_JOURNAL, found, record, type Journal } from '../src/meta/journal.ts';
import pack from '../src/content/puzzles.json';

const arg = (k: string, d: number) => {
  const i = process.argv.indexOf(`--${k}`);
  return i >= 0 ? Number(process.argv[i + 1]) : d;
};
const DAYS = arg('days', 35);
const PLAYERS = arg('players', 6);
const firstDay: Record<string, number[]> = {};
const curve: number[][] = [];

for (let pl = 0; pl < PLAYERS; pl++) {
  let j: Journal = { ...EMPTY_JOURNAL, entries: {} };
  let reef = 0;
  const per: number[] = [];
  const view = () => ({ has: (id: string) => !!j.entries[id], dry: j.dry });
  const play = (mode: 'classic' | 'daily', seed: number, night: boolean, day: number) => {
    let s = newGame(seed, { mode });
    const r = new Rng(seed ^ 77);
    while (!s.over && s.moves < 400) {
      const m = humanBot(s, r)!;
      const res = applyMove(s, m)!;
      for (const e of res.events)
        if (e.type === 'captured') {
          const lc = catchCapture(
            { waves: e.waves, streak: e.streak, clean: e.score.cleanBonus > 0 },
            { gameSeed: seed, move: res.state.moves, night, mode },
            view(),
          );
          for (const l of lc) {
            const rec = record(j, l.catches, `d${day}`);
            j = rec.journal;
            for (const id of rec.newSpecies) (firstDay[id] ??= []).push(day);
          }
        }
      s = res.state;
    }
  };
  for (let d = 1; d <= DAYS; d++) {
    for (let g = 0; g < 5; g++) play('classic', pl * 100000 + d * 100 + g, g % 5 < 2, d);
    play('daily', 7 + d, false, d);
    for (let k = 0; k < 3 && reef < pack.length; k++, reef++) {
      const p = pack[reef] as {
        solution: { piece: number; x: number; y: number }[];
        tier: string;
        board: string;
        pieces: string[];
        id: string;
      };
      let s = newPuzzleGame(p, reef);
      for (const m of p.solution) {
        const res = applyMove(s, { slot: m.piece, x: m.x, y: m.y })!;
        const win = puzzleStatus(res.state) === 'solved';
        for (const e of res.events)
          if (e.type === 'captured') {
            const lc = catchCapture(
              { waves: e.waves, streak: e.streak, clean: false },
              { gameSeed: reef, move: res.state.moves, night: false, mode: 'puzzle', tier: p.tier, reefWin: win },
              view(),
            );
            for (const l of lc) {
              const rec = record(j, l.catches, `d${d}`);
              j = rec.journal;
              for (const id of rec.newSpecies) (firstDay[id] ??= []).push(d);
            }
          }
        s = res.state;
      }
    }
    per.push(found(j));
  }
  curve.push(per);
}
const med = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)]!;
console.log(`species: ${SPECIES.length}`);
for (const d of [1, 2, 3, 5, 7, 10, 14, 21, 28, 35].filter((x) => x <= DAYS))
  console.log(`day ${String(d).padStart(2)}: median found ${med(curve.map((c) => c[d - 1]!))}`);
const never = SPECIES.filter((s) => !firstDay[s.id]).map((s) => s.id);
console.log('never found by any player:', never.join(', ') || '—');
const late = SPECIES.map(
  (s) => [s.id, firstDay[s.id] ? med(firstDay[s.id]!) : 999, (firstDay[s.id] ?? []).length] as const,
).sort((a, b) => b[1] - a[1]);
console.log(
  'slowest (median first day, players who found):',
  late
    .slice(0, 14)
    .map(([id, d, n]) => `${id}:${d}(${n})`)
    .join(' '),
);
