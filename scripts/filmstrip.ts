/**
 * Frame-by-frame filmstrip of one move, to judge effect choreography.
 *   npx tsx scripts/filmstrip.ts [--moves "s,x,y;s,x,y"] [--at 0,60,120,...] [--out artifacts/film/x] [--theme day]
 * Default: the teaching game (cup, then lid) — screenshots after the final release.
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const arg = (k: string, d: string) => {
  const i = process.argv.indexOf(`--${k}`);
  return i >= 0 ? process.argv[i + 1]! : d;
};
const moves = arg('moves', '0,2,4;1,2,3')
  .split(';')
  .map((m) => m.split(',').map(Number) as [number, number, number]);
const at = arg('at', '0,50,100,150,220,300,400,550,800').split(',').map(Number);
const out = arg('out', 'artifacts/film/teach');
mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  colorScheme: arg('theme', 'day') === 'night' ? 'dark' : 'light',
});
await p.goto(`http://localhost:${arg('port', '5317')}/?debug=1${arg('extra', '')}`);
await p.waitForFunction(() => (window as any).__atoll);
await p.waitForTimeout(500);
for (let i = 0; i < moves.length; i++) {
  const [slot, x, y] = moves[i]!;
  const path = await p.evaluate((m) => (window as any).__atoll.pathFor(m), { slot, x, y });
  await p.mouse.move(path.down.x, path.down.y);
  await p.mouse.down();
  await p.mouse.move(path.up.x, path.up.y - 30, { steps: 5 });
  await p.mouse.move(path.up.x, path.up.y, { steps: 2 });
  if (i === moves.length - 1) await p.screenshot({ path: `${out}/pre.png` });
  const t0 = Date.now();
  await p.mouse.up();
  if (i < moves.length - 1) {
    await p.waitForTimeout(500);
    continue;
  }
  for (const t of at) {
    const wait = t - (Date.now() - t0);
    if (wait > 0) await p.waitForTimeout(wait);
    await p.screenshot({
      path: `${out}/t${String(t).padStart(4, '0')}.png`,
      clip: { x: 0, y: 0, width: 390, height: 640 },
    });
  }
}
await b.close();
console.log('ok', out);
