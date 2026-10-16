/**
 * Frame-by-frame filmstrip of one move, to judge effect choreography.
 *   npx tsx scripts/filmstrip.ts [--moves "s,x,y;s,x,y"] [--at 0,60,120,...] [--out artifacts/film/x] [--theme day]
 *   npx tsx scripts/filmstrip.ts --stage atoll [--combo 4] [--best 500 --score 480]   (celebration boards)
 *   npx tsx scripts/filmstrip.ts --reveal moray|kraken                                  (discovery reveal)
 *   npx tsx scripts/filmstrip.ts --results 5230,4100                                    (results, score,prevBest)
 * Staged moments render on a frozen clock (window.__atoll.freeze), so frame t is exactly t ms after
 * release regardless of screenshot speed. Default: the teaching game (cup, then lid), real drags.
 * Server: LB_URL (default http://localhost:5317) or --port.
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { BOARDS, boardString } from '../tests/e2e/celebrate-boards.ts';

const arg = (k: string, d: string) => {
  const i = process.argv.indexOf(`--${k}`);
  return i >= 0 ? process.argv[i + 1]! : d;
};
const has = (k: string) => process.argv.includes(`--${k}`);
const url = process.env.LB_URL ?? `http://localhost:${arg('port', '5317')}`;
const stage = arg('stage', '');
const reveal = arg('reveal', '');
const results = arg('results', '');
const defaultAt = reveal
  ? '0,150,300,450,600,800,1000,1300,1700,2100'
  : results
    ? '0,200,400,600,800,1000,1300'
    : '0,50,100,150,220,300,400,550,800';
const at = arg('at', defaultAt).split(',').map(Number);
const out = arg('out', `artifacts/film/${stage || reveal || (results ? 'results' : 'teach')}`);
const full = has('full') || !!reveal || !!results;
mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: Number(arg('dpr', '1')),
  colorScheme: arg('theme', 'day') === 'night' ? 'dark' : 'light',
  reducedMotion: has('reduced') ? 'reduce' : 'no-preference',
});
const errors: string[] = [];
p.on('pageerror', (e) => errors.push(String(e)));
p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await p.goto(`${url}/?debug=1&seed=${arg('seed', '42')}${arg('extra', '')}`);
await p.waitForFunction(() => (window as any).__atoll);
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(500);
const clip = full ? undefined : { x: 0, y: 0, width: 390, height: 640 };
const shot = (name: string) => p.screenshot({ path: `${out}/${name}.png`, clip });
const frames = async () => {
  for (let i = 0; i < 3; i++) await p.evaluate(() => new Promise(requestAnimationFrame));
};

if (stage) {
  const s = BOARDS[stage];
  if (!s) throw new Error(`unknown stage ${stage}: ${Object.keys(BOARDS).join(', ')}`);
  await p.evaluate(([board, tray]) => (window as any).__atoll.setup(board, tray), [boardString(s), s.tray] as const);
  const combo = Number(arg('combo', String(s.combo ?? 0)));
  if (combo) await p.evaluate((n) => (window as any).__atoll.stageCombo(n), combo);
  if (has('best')) {
    await p.evaluate(
      ([best, score]) => {
        const a = (window as any).__atoll;
        a.stageRecord(best);
        a.stageBest(best, score);
      },
      [Number(arg('best', '0')), Number(arg('score', '0'))] as const,
    );
  }
  await p.waitForTimeout(700); // deal-in settles
  await frames();
  await shot('pre');
  await p.evaluate((m) => {
    const a = (window as any).__atoll;
    a.freezeNow();
    a.commitMove(m);
  }, s.move);
  for (const t of at) {
    await p.evaluate((t) => (window as any).__atoll.freeze(t), t);
    await frames();
    await shot(`t${String(t).padStart(4, '0')}`);
  }
} else if (reveal) {
  await p.evaluate(([id, golden]) => (window as any).__atoll.revealSpecies(id, { golden, size: 31.4 }), [
    reveal,
    has('golden'),
  ] as const);
  await p.waitForTimeout(400); // CSS entrance
  for (const t of at) {
    await p.evaluate((t) => (window as any).__atoll.revealFreeze(t), t);
    // CSS classes flip at thresholds; give transitions time to land
    await p.waitForTimeout(t > 0 ? 260 : 60);
    await shot(`t${String(t).padStart(4, '0')}`);
  }
} else if (results) {
  const [score, prevBest] = results.split(',').map(Number);
  await p.evaluate((o) => (window as any).__atoll.showResults(o), { score, prevBest });
  const t0 = Date.now();
  for (const t of at) {
    const wait = t - (Date.now() - t0);
    if (wait > 0) await p.waitForTimeout(wait);
    await shot(`t${String(t).padStart(4, '0')}`);
  }
} else {
  const moves = arg('moves', '0,2,4;1,2,3')
    .split(';')
    .map((m) => m.split(',').map(Number) as [number, number, number]);
  const setup = arg('setup', '');
  if (setup) {
    const [board, tray] = setup.split('|');
    await p.evaluate(
      ([b, t]) =>
        (window as any).__atoll.setup(
          b,
          t!.split(',').map((x) => x || null),
        ),
      [board, tray],
    );
    await p.waitForTimeout(400);
  }
  for (let i = 0; i < moves.length; i++) {
    const [slot, x, y] = moves[i]!;
    const path = await p.evaluate((m) => (window as any).__atoll.pathFor(m), { slot, x, y });
    await p.mouse.move(path.down.x, path.down.y);
    await p.mouse.down();
    await p.mouse.move(path.up.x, path.up.y - 30, { steps: 5 });
    await p.mouse.move(path.up.x, path.up.y, { steps: 2 });
    if (i === moves.length - 1) await shot('pre');
    const t0 = Date.now();
    await p.mouse.up();
    if (i < moves.length - 1) {
      await p.waitForTimeout(500);
      continue;
    }
    for (const t of at) {
      const wait = t - (Date.now() - t0);
      if (wait > 0) await p.waitForTimeout(wait);
      await shot(`t${String(t).padStart(4, '0')}`);
    }
  }
}
await b.close();
if (errors.length) console.log('errors', errors);
console.log('ok', out);
