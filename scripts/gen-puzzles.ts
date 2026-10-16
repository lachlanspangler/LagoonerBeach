/**
 * Generates the shipped reef-puzzle pack: src/content/puzzles.json.
 *   npx tsx scripts/gen-puzzles.ts [--count 120]
 * Deterministic (fixed seeds). Every puzzle is solver-verified and graded; sorted by difficulty.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { boardFromString, generatePuzzle, type Puzzle } from '../src/core/puzzlegen.ts';
import { grade, solve, tierForRank } from '../src/core/solver.ts';

const count = Number(process.argv[process.argv.indexOf('--count') + 1] || 120);
const pool: Puzzle[] = [];
function normalize(board: string): string {
  const cells = [...board].map((c, i) => (c !== '0' ? i : -1)).filter((i) => i >= 0);
  const x0 = Math.min(...cells.map((c) => c % 8));
  const y0 = Math.min(...cells.map((c) => Math.floor(c / 8)));
  return cells.map((c) => `${(c % 8) - x0},${Math.floor(c / 8) - y0}`).join(';');
}
const seen = new Set<string>();
const t0 = Date.now();
const mix = [
  { lagoons: 1, pieces: 2, minPebbles: 6 },
  { lagoons: 1, pieces: 3, minPebbles: 6 },
  { lagoons: 2, pieces: 2, minPebbles: 6 },
  { lagoons: 2, pieces: 3, minPebbles: 6 },
  { lagoons: 3, pieces: 3, minPebbles: 6 },
  { lagoons: 1, pieces: 2, thick: true, minPebbles: 8 },
  { lagoons: 1, pieces: 3, thick: true, minPebbles: 8 },
  { lagoons: 1, pieces: 3, thick: true, minPebbles: 10 },
  { lagoons: 2, pieces: 3, minPebbles: 8 },
];
for (let seed = 1; pool.length < count * 2.5 && seed < 200000; seed++) {
  const params = mix[seed % mix.length]!;
  const p = generatePuzzle(seed * 2654435761, params);
  if (!p) continue;
  // translation-invariant: a reef shifted by a cell is the same puzzle
  const key = normalize(p.board) + p.pieces.slice().sort().join();
  if (seen.has(key)) continue;
  seen.add(key);
  pool.push(p);
}
// Hand-made openers (still solver-verified and graded): one lid, two cups, a first cascade.
const rows = (r: string[]) => r.join('').replace(/\./g, '0');
const TUTORIAL: { board: string; pieces: string[] }[] = [
  {
    board: rows(['........', '........', '..3.3...', '..333...', '........', '........', '........', '........']),
    pieces: ['tri-h'],
  },
  {
    board: rows(['........', '........', '.4.4.5.5', '.444.555', '........', '........', '........', '........']),
    pieces: ['dot', 'dot'],
  },
  {
    board: rows(['........', '.22.22..', '.22.22..', '.22.22..', '.22222..', '.22222..', '........', '........']),
    pieces: ['duo-v'],
  },
];
const tutorial = TUTORIAL.map((t) => {
  const b = boardFromString(t.board);
  const sol = solve(b, t.pieces);
  if (!sol.first) throw new Error('tutorial reef unsolvable: ' + t.board);
  return {
    id: '',
    board: t.board,
    pieces: t.pieces,
    solution: sol.first,
    grade: grade(b, t.pieces),
    lagoons: 1,
    tutorial: true,
  };
});

// keep a spread across difficulty: sort, then sample evenly
pool.sort((a, b) => a.grade.score - b.grade.score);
const n = Math.min(count - tutorial.length, pool.length);
const step = pool.length / n;
const sampled = Array.from({ length: n }, (_, i) => pool[Math.floor(i * step)]!);
const pack = [
  ...tutorial.map((p, i) => ({ ...p, id: `R${String(i + 1).padStart(3, '0')}`, tier: 'calm' })),
  ...sampled.map((p, i) => ({
    ...p,
    id: `R${String(i + 1 + tutorial.length).padStart(3, '0')}`,
    tier: tierForRank(i, n),
  })),
];
mkdirSync('src/content', { recursive: true });
writeFileSync('src/content/puzzles.json', JSON.stringify(pack));
const tiers = pack.reduce<Record<string, number>>((a, p) => ((a[p.tier] = (a[p.tier] ?? 0) + 1), a), {});
const jumps = sampled.slice(1).map((p, i) => p.grade.score - sampled[i]!.grade.score);
console.log(`pool ${pool.length}, shipped ${pack.length} in ${((Date.now() - t0) / 1000).toFixed(1)}s`, tiers);
console.log(
  'cascade reefs',
  pack.filter((p) => p.grade.cascade).length,
  'max score step',
  Math.max(...jumps),
  'range',
  sampled[0]?.grade.score,
  '→',
  sampled.at(-1)?.grade.score,
);
