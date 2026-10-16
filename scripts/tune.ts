/**
 * Bot tuning CLI on the production core.
 *   npx tsx scripts/tune.ts [--games 200] [--bots random,greedy,search] [--ramp '{"end":100}'] [--cap 500]
 * Fans out across child processes; prints one summary line per bot and writes artifacts/tune.json.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { fileURLToPath } from 'node:url';

const arg = (k: string, d: string) => {
  const i = process.argv.indexOf(`--${k}`);
  return i >= 0 ? process.argv[i + 1]! : d;
};

if (process.argv.includes('--worker')) {
  const { BOTS } = await import('../src/sim/bots.ts');
  const { playGame } = await import('../src/sim/play.ts');
  const { DEFAULT_RAMP } = await import('../src/core/dealer.ts');
  const bot = BOTS[arg('bot', 'greedy') as keyof typeof BOTS];
  const from = Number(arg('from', '0'));
  const to = Number(arg('to', '10'));
  const ramp = { ...DEFAULT_RAMP, ...JSON.parse(arg('ramp', '{}')) };
  const out = [];
  for (let g = from; g < to; g++) out.push(playGame(bot, 1000 + g, Number(arg('cap', '500')), { ramp }).summary);
  process.stdout.write(JSON.stringify(out));
  process.exit(0);
}

const games = Number(arg('games', '120'));
const bots = arg('bots', 'random,greedy,search').split(',');
const ramp = arg('ramp', '{}');
const cap = arg('cap', '500');
const per: Record<string, number> = { random: 1, firstFit: 1, greedy: 0.5, search: 0.35, human: 0.5 };

const workers = Math.max(2, cpus().length - 2);
const self = fileURLToPath(import.meta.url);
const { median, mean } = await import('../src/sim/play.ts');
const results: Record<string, unknown> = {};
for (const bot of bots) {
  const n = Math.max(10, Math.round(games * (per[bot] ?? 1)));
  const chunk = Math.ceil(n / workers);
  const parts = await Promise.all(
    Array.from(
      { length: Math.ceil(n / chunk) },
      (_, i) =>
        new Promise<
          { moves: number; score: number; captures: number; bestPocket: number; capped: boolean; maxStreak: number }[]
        >((res, rej) => {
          const p = spawn('npx', [
            'tsx',
            self,
            '--worker',
            '--bot',
            bot,
            '--from',
            String(i * chunk),
            '--to',
            String(Math.min(n, (i + 1) * chunk)),
            '--ramp',
            ramp,
            '--cap',
            cap,
          ]);
          let buf = '';
          p.stdout.on('data', (d) => (buf += d));
          p.stderr.on('data', (d) => process.stderr.write(d));
          p.on('close', (code) => (code === 0 ? res(JSON.parse(buf)) : rej(new Error(`worker exit ${code}`))));
        }),
    ),
  );
  const all = parts.flat();
  const summary = {
    games: all.length,
    medMoves: median(all.map((g) => g.moves)),
    p10: median(
      all
        .map((g) => g.moves)
        .sort((a, b) => a - b)
        .slice(0, Math.max(1, Math.floor(all.length / 5))),
    ),
    meanScore: Math.round(mean(all.map((g) => g.score))),
    movesPerCapture: +(mean(all.map((g) => g.moves)) / Math.max(1e-9, mean(all.map((g) => g.captures)))).toFixed(2),
    medBestPocket: median(all.map((g) => g.bestPocket)),
    medMaxStreak: median(all.map((g) => g.maxStreak)),
    cappedPct: Math.round((100 * all.filter((g) => g.capped).length) / all.length),
  };
  results[bot] = summary;
  console.log(bot.padEnd(8), JSON.stringify(summary));
}
mkdirSync('artifacts', { recursive: true });
writeFileSync('artifacts/tune.json', JSON.stringify({ ramp: JSON.parse(ramp), results }, null, 2));
