/**
 * Bundle budget: the initial load must stay tiny (instant start is part of the product).
 * Run after `npm run build`. Budgets are gzip sizes of what index.html loads up front.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

// 40 → 64 KB when the catch layer (47 species + procedural art) landed at ~40 KB total; still a
// sub-second load on 3G and far below any engine runtime. Raise only with a diary entry.
const BUDGET_INITIAL_JS = 64 * 1024;
const BUDGET_CSS = 6 * 1024;
const BUDGET_PUZZLES = 30 * 1024; // lazy chunk
// ADR 0011: kit runtime + every species' path data, lazy-loaded after first paint. 47 species at
// ~0.6–0.9 KB gz each plus ~8 KB of kit ≈ 45 KB; the budget leaves room for richer legends.
const BUDGET_ART = 60 * 1024;

const html = readFileSync('dist/index.html', 'utf8');
const initial = [...html.matchAll(/(?:src|href)="\.\/(assets\/[^"]+)"/g)].map((m) => m[1]!);
const gz = (f: string) => gzipSync(readFileSync(`dist/${f}`)).length;
const js = initial.filter((f) => f.endsWith('.js')).reduce((a, f) => a + gz(f), 0);
const css = initial.filter((f) => f.endsWith('.css')).reduce((a, f) => a + gz(f), 0);
const puzzles = readdirSync('dist/assets')
  .filter((f) => f.startsWith('puzzles') && f.endsWith('.js'))
  .reduce((a, f) => a + gz(`assets/${f}`), 0);
const artFiles = readdirSync('dist/assets').filter((f) => f.startsWith('creature-art') && f.endsWith('.js'));
const art = artFiles.reduce((a, f) => a + gz(`assets/${f}`), 0);
const rows = [
  ['initial JS', js, BUDGET_INITIAL_JS],
  ['CSS', css, BUDGET_CSS],
  ['puzzles (lazy)', puzzles, BUDGET_PUZZLES],
  ['creature art (lazy)', art, BUDGET_ART],
] as const;
let ok = true;
// the art must stay out of the initial bundle and exist as its own chunk
if (!artFiles.length || initial.some((f) => f.includes('creature-art'))) {
  console.log('✗ creature-art chunk missing or loaded up front');
  ok = false;
}
for (const [name, size, budget] of rows) {
  const pass = size <= budget;
  ok &&= pass;
  console.log(
    `${pass ? '✓' : '✗'} ${name.padEnd(15)} ${(size / 1024).toFixed(1).padStart(6)} KB gz  (budget ${(budget / 1024).toFixed(0)} KB)`,
  );
}
if (!ok) process.exit(1);
