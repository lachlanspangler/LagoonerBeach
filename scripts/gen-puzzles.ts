/**
 * Generates the shipped reef-puzzle pack: src/content/puzzles.json.
 *   npx tsx scripts/gen-puzzles.ts [--count 120]
 * Deterministic (fixed seeds). Every puzzle is solver-verified and graded; sorted by difficulty.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { generatePuzzle, type Puzzle } from '../src/core/puzzlegen.ts';
import { tierForRank } from '../src/core/solver.ts';

const count = Number(process.argv[process.argv.indexOf('--count') + 1] || 120);
const pool: Puzzle[] = [];
const seen = new Set<string>();
const t0 = Date.now();
const mix = [
  { lagoons: 1, pieces: 2 },
  { lagoons: 1, pieces: 3 },
  { lagoons: 2, pieces: 2 },
  { lagoons: 2, pieces: 3 },
  { lagoons: 3, pieces: 3 },
];
for (let seed = 1; pool.length < count * 2.5 && seed < 200000; seed++) {
  const params = mix[seed % mix.length]!;
  const p = generatePuzzle(seed * 2654435761, params);
  if (!p) continue;
  const key = p.board.replace(/[1-6]/g, '1') + p.pieces.slice().sort().join();
  if (seen.has(key)) continue;
  seen.add(key);
  pool.push(p);
}
// keep a spread across difficulty: sort, then sample evenly
pool.sort((a, b) => a.grade.score - b.grade.score);
const step = pool.length / count;
const pack = Array.from({ length: Math.min(count, pool.length) }, (_, i) => pool[Math.floor(i * step)]!).map(
  (p, i, all) => ({ ...p, id: `R${String(i + 1).padStart(3, '0')}`, tier: tierForRank(i, all.length) }),
);
mkdirSync('src/content', { recursive: true });
writeFileSync('src/content/puzzles.json', JSON.stringify(pack));
const tiers = pack.reduce<Record<string, number>>((a, p) => ((a[p.tier] = (a[p.tier] ?? 0) + 1), a), {});
console.log(
  `pool ${pool.length}, shipped ${pack.length} in ${((Date.now() - t0) / 1000).toFixed(1)}s`,
  tiers,
  'score range',
  pack[0]?.grade.score,
  '→',
  pack.at(-1)?.grade.score,
);
