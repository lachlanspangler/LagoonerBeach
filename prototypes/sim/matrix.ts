/** Runs every mechanic × bot in parallel child processes; writes prototypes/sim/results.json. */
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { ALL } from './mechanics.ts';

const only = process.argv[2]?.split(',');
const mechs = ALL.filter((m) => !only || only.includes(m.id)).map((m) => m.id);
const plan: Record<string, number> = { random: 300, firstFit: 100, greedy: 60, search: 40 };
const jobs = mechs.flatMap((m) => Object.entries(plan).map(([b, g]) => [m, b, String(g), '500']));
const out: unknown[] = [];
let running = 0, i = 0;
await new Promise<void>((done) => {
  const next = () => {
    if (i >= jobs.length && running === 0) return done();
    while (running < 12 && i < jobs.length) {
      const args = jobs[i++]!;
      running++;
      const p = spawn('npx', ['tsx', 'prototypes/sim/run.ts', ...args]);
      let buf = '';
      p.stdout.on('data', (d) => (buf += d));
      p.stderr.on('data', (d) => process.stderr.write(d));
      p.on('close', () => { running--; try { out.push(JSON.parse(buf)); } catch { console.error('fail', args, buf); } next(); });
    }
  };
  next();
});
const file = process.argv[3] ?? 'prototypes/sim/results.json';
writeFileSync(file, JSON.stringify(out, null, 1));
type R = { mechanic: string; bot: string; medMoves: number; meanScore: number; movesPerClear: number; cappedPct: number; bigClearsPerGame: number };
const rs = out as R[];
for (const m of mechs) {
  const g = (b: string) => rs.find((r) => r.mechanic === m && r.bot === b)!;
  const [ra, ff, gr, se] = ['random', 'firstFit', 'greedy', 'search'].map(g) as R[];
  console.log(
    `${m.padEnd(13)} moves r/ff/g/s ${[ra, ff, gr, se].map((x) => String(x!.medMoves).padStart(4)).join(' ')} | score ${[ra, ff, gr, se].map((x) => String(x!.meanScore).padStart(6)).join(' ')} | skill(s/r score) ${(se!.meanScore / Math.max(1, ra!.meanScore)).toFixed(1)} | ff/s ${(ff!.meanScore / Math.max(1, se!.meanScore)).toFixed(2)} g/s ${(gr!.meanScore / Math.max(1, se!.meanScore)).toFixed(2)} | mpc(s) ${se!.movesPerClear} | cap% s ${se!.cappedPct} g ${gr!.cappedPct} | 1st clear r ${(ra as any).medFirstClear} | area s ${(se as any).areaPerPocket} max ${(se as any).medMaxArea}`,
  );
}
