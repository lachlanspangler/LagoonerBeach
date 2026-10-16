/** Renders the results JSON files into a markdown table (stdout). */
import { readFileSync, existsSync } from 'node:fs';
type R = Record<string, number | string>;
const files = ['results.json', 'results2.json', 'results3.json'].map((f) => `prototypes/sim/${f}`).filter(existsSync);
const all = new Map<string, R>();
for (const f of files) for (const r of JSON.parse(readFileSync(f, 'utf8')) as R[]) all.set(`${r.mechanic}/${r.bot}`, r);
const mechs = [...new Set([...all.values()].map((r) => r.mechanic as string))];
console.log('| mechanic | med moves r / ff / g / s | mean score r / ff / g / s | skill s÷r | ff÷s | g÷s | moves/clear (s) | search capped % | 1st clear (random) | pocket area (s) | best pocket (s, median) |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|');
for (const m of mechs) {
  const g = (b: string) => all.get(`${m}/${b}`)!;
  const [ra, ff, gr, se] = ['random', 'firstFit', 'greedy', 'search'].map(g);
  if (!ra || !ff || !gr || !se) continue;
  const n = (x: R, k: string) => Number(x[k]);
  console.log(`| ${m} | ${[ra, ff, gr, se].map((x) => x.medMoves).join(' / ')} | ${[ra, ff, gr, se].map((x) => x.meanScore).join(' / ')} | ${(n(se, 'meanScore') / Math.max(1, n(ra, 'meanScore'))).toFixed(1)} | ${(n(ff, 'meanScore') / n(se, 'meanScore')).toFixed(2)} | ${(n(gr, 'meanScore') / n(se, 'meanScore')).toFixed(2)} | ${se.movesPerClear} | ${se.cappedPct} | ${ra.medFirstClear ?? '–'} | ${se.areaPerPocket ?? '–'} | ${se.medMaxArea ?? '–'} |`);
}
