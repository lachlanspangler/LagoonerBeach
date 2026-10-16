/**
 * Renders docs/IDEAS.md from docs/ideas_ledger.json (the ledger is the source of truth).
 * Run: npm run ideas
 */
import { readFileSync, writeFileSync } from 'node:fs';

interface Idea {
  id: string;
  kind: string;
  name: string;
  pitch: string;
  closest: string;
  new: string;
  scores: number[];
  basis: string;
  value: number;
  effort: number;
  status: string;
  reason: string;
  data?: string;
}

const GATES = [0, 1, 4, 5, 9]; // R1, R2, R5, R6, R10 (0-based)
const ledger = JSON.parse(readFileSync('docs/ideas_ledger.json', 'utf8')) as { ideas: Idea[] };
const ideas = ledger.ideas;

const total = (i: Idea) => i.scores.reduce((a, b) => a + b, 0);
const gates = (i: Idea) => GATES.every((g) => i.scores[g] === 2);
const order = ['chosen', 'built', 'prototyped', 'shortlisted', 'backlog', 'merged', 'rejected'];

const sorted = [...ideas].sort(
  (a, b) => order.indexOf(a.status) - order.indexOf(b.status) || total(b) - total(a) || a.id.localeCompare(b.id),
);

const lines: string[] = [];
lines.push('# Ideas');
lines.push('');
lines.push('> Generated from `docs/ideas_ledger.json` by `npm run ideas`. Edit the JSON, not this file.');
lines.push('> Scores: rubric R1–R14 (`docs/research/RUBRIC.md`), 0–2 each, max 28. ★ gates = R1,R2,R5,R6,R10.');
lines.push('> `basis`: `est` = estimated before prototyping, `meas` = R4/R5/R6/R11 replaced by bot measurements.');
lines.push('');
const counts = order.map((s) => `${s}: ${ideas.filter((i) => i.status === s).length}`).join(' · ');
lines.push(`**${ideas.length} ideas** — ${counts}`);
lines.push('');
lines.push('| id | status | name | pitch | closest | total | gates | value/effort | basis |');
lines.push('|---|---|---|---|---|---|---|---|---|');
for (const i of sorted) {
  lines.push(
    `| ${i.id} | ${i.status} | ${i.name} | ${i.pitch} | ${i.closest} | ${total(i)} | ${gates(i) ? '✓' : '✗'} | ${i.value}/${i.effort} | ${i.basis} |`,
  );
}
lines.push('');
lines.push('## Details');
for (const i of sorted) {
  lines.push('');
  lines.push(`### ${i.id} — ${i.name} (${i.status})`);
  lines.push(`- **Pitch:** ${i.pitch}`);
  lines.push(`- **Closest existing:** ${i.closest}`);
  lines.push(`- **What's new:** ${i.new}`);
  lines.push(`- **Scores (R1..R14):** ${i.scores.join(' ')} → **${total(i)}**/28, gates ${gates(i) ? 'pass' : 'FAIL'} (${i.basis})`);
  lines.push(`- **Value/effort:** ${i.value}/${i.effort}`);
  lines.push(`- **Reason:** ${i.reason}`);
  if (i.data) lines.push(`- **Data:** ${i.data}`);
}
writeFileSync('docs/IDEAS.md', lines.join('\n') + '\n');
console.log(`wrote docs/IDEAS.md (${ideas.length} ideas)`);
