/**
 * Measure the endless-reef curve: generate a range of reefs and print difficulty per chapter, an
 * ASCII plot of target vs achieved score, and generation time per reef (p50/p95/max, Node).
 *   npx tsx scripts/reef-curve.ts [--from 361] [--to 1360] [--step 1]
 * Writes artifacts/reef-curve.json (one row per reef).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { chapterName, chapterOf, curve, generateReef, GENERATOR_VERSION } from '../src/core/endless.ts';

const arg = (k: string, d: number) => {
  const i = process.argv.indexOf(k);
  return i >= 0 ? Number(process.argv[i + 1]) : d;
};
const from = arg('--from', 361);
const to = arg('--to', 1360);
const step = arg('--step', 1);

interface Row {
  n: number;
  target: number;
  score: number;
  role: string;
  tier: string;
  pieces: number;
  lagoons: number;
  cascade: boolean;
  safeFirst: number;
  solutions: number;
  attempts: number;
  nodes: number;
  ms: number;
}
const rows: Row[] = [];
const seen = new Map<string, number>();
let dups = 0;
for (let n = from; n <= to; n += step) {
  const t0 = performance.now();
  const r = generateReef(n);
  const ms = performance.now() - t0;
  const key = r.board.replace(/[1-6]/g, '1') + r.pieces.join();
  if (seen.has(key)) dups++;
  seen.set(key, n);
  rows.push({
    n,
    target: r.target,
    score: r.grade.score,
    role: r.role,
    tier: r.tier,
    pieces: r.pieces.length,
    lagoons: r.lagoons,
    cascade: r.grade.cascade,
    safeFirst: +r.grade.safeFirst.toFixed(3),
    solutions: r.grade.solutions,
    attempts: r.attempts,
    nodes: r.nodes,
    ms: +ms.toFixed(2),
  });
}

const q = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))]!;
};
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);

console.log(`generator v${GENERATOR_VERSION}: reefs ${from}–${to} step ${step} (${rows.length} reefs)\n`);
console.log('chapter                         target  score(mean min–max)  in-band  casc  pieces  p95 ms');
const byCh = new Map<number, Row[]>();
for (const r of rows) {
  const c = chapterOf(r.n).chapter;
  if (!byCh.has(c)) byCh.set(c, []);
  byCh.get(c)!.push(r);
}
for (const [c, rs] of byCh) {
  const inBand = rs.filter((r) => Math.abs(r.score - r.target) <= curve(r.n).band).length;
  console.log(
    `${String(c).padStart(4)} ${chapterName(c).padEnd(26)} ${mean(rs.map((r) => r.target))
      .toFixed(0)
      .padStart(6)}  ${mean(rs.map((r) => r.score))
      .toFixed(1)
      .padStart(6)} ${String(Math.min(...rs.map((r) => r.score))).padStart(4)}–${String(
      Math.max(...rs.map((r) => r.score)),
    ).padEnd(9)} ${String(Math.round((100 * inBand) / rs.length)).padStart(5)}%  ${String(
      rs.filter((r) => r.cascade).length,
    ).padStart(4)}  ${mean(rs.map((r) => r.pieces))
      .toFixed(1)
      .padStart(6)}  ${q(
      rs.map((r) => r.ms),
      0.95,
    )
      .toFixed(0)
      .padStart(6)}`,
  );
}

// ASCII plot of the first chapters (one column per reef): '·' target, '#' achieved
const plotRows = rows.slice(0, 120);
if (plotRows.length > 1 && step === 1) {
  console.log('\nfirst reefs: · target  # achieved  (score 140–205)');
  for (let s = 205; s >= 140; s -= 5) {
    let line = `${String(s).padStart(4)} `;
    for (const r of plotRows) {
      const hit = Math.abs(r.score - s) < 2.5;
      const tgt = Math.abs(r.target - s) < 2.5;
      line += hit ? '#' : tgt ? '·' : ' ';
    }
    console.log(line);
  }
}

const ms = rows.map((r) => r.ms);
const inBand = rows.filter((r) => Math.abs(r.score - r.target) <= curve(r.n).band).length;
const summary = {
  version: GENERATOR_VERSION,
  reefs: rows.length,
  msP50: +q(ms, 0.5).toFixed(1),
  msP95: +q(ms, 0.95).toFixed(1),
  msMax: +Math.max(...ms).toFixed(1),
  attemptsP95: q(
    rows.map((r) => r.attempts),
    0.95,
  ),
  nodesMax: Math.max(...rows.map((r) => r.nodes)),
  inBandPct: +((100 * inBand) / rows.length).toFixed(1),
  meanAbsError: +mean(rows.map((r) => Math.abs(r.score - r.target))).toFixed(2),
  cascadePct: +((100 * rows.filter((r) => r.cascade).length) / rows.length).toFixed(1),
  piecesMix: [1, 2, 3].map((k) => rows.filter((r) => r.pieces === k).length),
  tiers: rows.reduce<Record<string, number>>((a, r) => ((a[r.tier] = (a[r.tier] ?? 0) + 1), a), {}),
  duplicates: dups,
};
console.log('\nsummary', summary);
mkdirSync('artifacts', { recursive: true });
writeFileSync('artifacts/reef-curve.json', JSON.stringify({ summary, rows }, null, 1));
