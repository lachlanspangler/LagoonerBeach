/**
 * Automated playtest of the throwaway prototypes with real pointer drags (Playwright).
 * Usage: npx tsx prototypes/play/playtest.ts <mechId> <bot> <moves> <shotEvery>
 */
import { chromium } from '@playwright/test';
const [mech = 'hollow8-ramp2', bot = 'greedy', movesS = '40', everyS = '10'] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 400, height: 760 }, deviceScaleFactor: 2 });
await page.goto('http://localhost:5174/?seed=42');
await page.selectOption('#mech', mech);
const box = (await page.locator('canvas').boundingBox())!;
for (let i = 0; i < Number(movesS); i++) {
  const plan = await page.evaluate((b) => (window as any).__proto.plan(b), bot);
  if (!plan) break;
  await page.mouse.move(box.x + plan.down.x, box.y + plan.down.y);
  await page.mouse.down();
  await page.mouse.move(box.x + plan.up.x, box.y + plan.up.y, { steps: 6 });
  if (i % Number(everyS) === Number(everyS) - 1) await page.screenshot({ path: `prototypes/play/shots/${mech}-${i + 1}-drag.png` });
  await page.mouse.up();
  await page.waitForTimeout(220);
}
await page.screenshot({ path: `prototypes/play/shots/${mech}-end.png` });
console.log(JSON.stringify(await page.evaluate(() => { const p = (window as any).__proto; return { score: p.s.score, moves: p.s.moves, over: p.over, log: p.log.slice(-60) }; })));
await browser.close();
