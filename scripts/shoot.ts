/**
 * Screenshot/play tool for the running app (dev server or preview).
 *   npx tsx scripts/shoot.ts [--url http://localhost:5317] [--moves 12] [--bot greedy] [--w 390 --h 844]
 *        [--theme day|night] [--out artifacts/shots/name] [--midDrag]
 * Plays real pointer drags chosen by a bot, saves screenshots, prints console errors.
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const arg = (k: string, d: string) => {
  const i = process.argv.indexOf(`--${k}`);
  return i >= 0 ? process.argv[i + 1]! : d;
};
const url = arg('url', 'http://localhost:5317');
const moves = Number(arg('moves', '12'));
const out = arg('out', 'artifacts/shots/play');
const theme = arg('theme', 'day');
mkdirSync(out.replace(/\/[^/]*$/, ''), { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: Number(arg('w', '390')), height: Number(arg('h', '844')) },
  deviceScaleFactor: 2,
  hasTouch: true,
  colorScheme: theme === 'night' ? 'dark' : 'light',
});
const errors: string[] = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`${url}/?debug=1&seed=${arg('seed', '42')}${arg('extra', '')}`);
await page.waitForFunction(() => (window as any).__atoll, null, { timeout: 15000 });
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}-0.png` });
for (let i = 0; i < moves; i++) {
  const plan = await page.evaluate((b) => (window as any).__atoll.plan(b), arg('bot', 'greedy'));
  if (!plan) break;
  await page.mouse.move(plan.down.x, plan.down.y);
  await page.mouse.down();
  await page.mouse.move(plan.up.x, plan.up.y, { steps: 8 });
  if (process.argv.includes('--midDrag') && i === moves - 1) await page.screenshot({ path: `${out}-drag.png` });
  await page.mouse.up();
  await page.waitForTimeout(Number(arg('wait', '650')));
}
await page.screenshot({ path: `${out}-end.png` });
const s = await page.evaluate(() => {
  const st = (window as any).__atoll.state();
  return { moves: st.moves, score: st.score, over: st.over, captures: st.captures };
});
console.log(JSON.stringify({ ...s, errors }));
await browser.close();
