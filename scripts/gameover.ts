/** Screenshot the game-over card (two quick games so a best exists). */
import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  colorScheme: (process.argv[2] as 'light' | 'dark') ?? 'light',
});
await p.goto('http://localhost:5317/?debug=1&seed=8&fast=1');
await p.waitForFunction(() => (window as any).__atoll);
await p.evaluate(() => (window as any).__atoll.autoplay('greedy', 400));
await p.waitForTimeout(300);
await p.locator('#play-again').click();
await p.evaluate(() => (window as any).__atoll.autoplay('random', 400));
await p.waitForTimeout(900);
await p.screenshot({ path: 'artifacts/shots/gameover.png' });
// a mid-game state with a misfit piece, if any
await b.close();
