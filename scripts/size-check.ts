/**
 * Bundle budget: the initial load must stay tiny (instant start is part of the product).
 * Run after `npm run build`. Budgets are gzip sizes of what index.html loads up front.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const BUDGET_INITIAL_JS = 40 * 1024;
const BUDGET_CSS = 6 * 1024;
const BUDGET_PUZZLES = 30 * 1024; // lazy chunk

const html = readFileSync('dist/index.html', 'utf8');
const initial = [...html.matchAll(/(?:src|href)="\.\/(assets\/[^"]+)"/g)].map((m) => m[1]!);
const gz = (f: string) => gzipSync(readFileSync(`dist/${f}`)).length;
const js = initial.filter((f) => f.endsWith('.js')).reduce((a, f) => a + gz(f), 0);
const css = initial.filter((f) => f.endsWith('.css')).reduce((a, f) => a + gz(f), 0);
const puzzles = readdirSync('dist/assets')
  .filter((f) => f.startsWith('puzzles') && f.endsWith('.js'))
  .reduce((a, f) => a + gz(`assets/${f}`), 0);
const rows = [
  ['initial JS', js, BUDGET_INITIAL_JS],
  ['CSS', css, BUDGET_CSS],
  ['puzzles (lazy)', puzzles, BUDGET_PUZZLES],
] as const;
let ok = true;
for (const [name, size, budget] of rows) {
  const pass = size <= budget;
  ok &&= pass;
  console.log(
    `${pass ? '✓' : '✗'} ${name.padEnd(15)} ${(size / 1024).toFixed(1).padStart(6)} KB gz  (budget ${(budget / 1024).toFixed(0)} KB)`,
  );
}
if (!ok) process.exit(1);
