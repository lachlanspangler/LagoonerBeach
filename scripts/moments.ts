/**
 * Real play, celebration review: a bot plays with real drags; every capturing move is frozen at
 * --at ms after release and screenshotted, with its word (if any) in the filename. Shows how often
 * words appear and what ordinary moves look like next to the big ones.
 *   LB_URL=http://localhost:5717 npx tsx scripts/moments.ts [--moves 40] [--bot human] [--seed 7] [--at 380]
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const arg = (k: string, d: string) => {
  const i = process.argv.indexOf(`--${k}`);
  return i >= 0 ? process.argv[i + 1]! : d;
};
const url = process.env.LB_URL ?? 'http://localhost:5317';
const out = arg('out', 'artifacts/moments');
const at = Number(arg('at', '380'));
mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({
  viewport: { width: 390, height: 844 },
  colorScheme: arg('theme', 'day') === 'night' ? 'dark' : 'light',
});
await p.goto(`${url}/?debug=1&seed=${arg('seed', '7')}`);
await p.waitForFunction(() => (window as any).__atoll);
await p.waitForTimeout(600);
const tally: Record<string, number> = {};
let caps = 0;
for (let i = 0; i < Number(arg('moves', '40')); i++) {
  const st = await p.evaluate(() => (window as any).__atoll.revealState());
  if (st) await p.evaluate(() => (window as any).__atoll.revealSkip());
  const plan = await p.evaluate((bot) => (window as any).__atoll.plan(bot), arg('bot', 'human'));
  if (!plan) break;
  const before = await p.evaluate(() => (window as any).__atoll.state());
  await p.mouse.move(plan.down.x, plan.down.y);
  await p.mouse.down();
  await p.mouse.move(plan.up.x, plan.up.y, { steps: 5 });
  await p.evaluate(() => (window as any).__atoll.freezeNow());
  await p.mouse.up();
  const after = await p.evaluate(() => (window as any).__atoll.state());
  await p.evaluate((t) => (window as any).__atoll.freeze(t), at);
  for (let k = 0; k < 3; k++) await p.evaluate(() => new Promise(requestAnimationFrame));
  const captured = after.captures > before.captures;
  if (captured) {
    caps++;
    const word: string = (await p.evaluate(() => (window as any).__atoll.celebrateWord?.())) ?? '';
    tally[word || '(none)'] = (tally[word || '(none)'] ?? 0) + 1;
    await p.screenshot({
      path: `${out}/m${String(i).padStart(2, '0')}-c${after.streak}-${(word || 'none').replace(/[^A-Za-z0-9]+/g, '')}.png`,
      clip: { x: 0, y: 0, width: 390, height: 640 },
    });
  }
  await p.evaluate(() => (window as any).__atoll.freeze(null));
  await p.waitForTimeout(150);
  if (after.over) break;
}
await b.close();
console.log('captures', caps, 'words', tally);
