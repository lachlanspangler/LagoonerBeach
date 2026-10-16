/** Play a few quick games (bots), then screenshot the game-over card, journal and a species page. */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
mkdirSync('artifacts/ux/journal', { recursive: true });
const b = await chromium.launch();
for (const scheme of ['light', 'dark'] as const) {
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme });
  await p.goto(`${process.env.LB_URL ?? 'http://localhost:5317'}/?debug=1&seed=3&fast=1`);
  await p.waitForFunction(() => (window as any).__atoll);
  for (let g = 0; g < 4; g++) {
    await p.evaluate(() => {
      const a = (window as any).__atoll;
      if (a.state().over) a.restart();
      a.autoplay('human', 400);
    });
    await p.waitForTimeout(400);
  }
  await p.screenshot({ path: `artifacts/ux/journal/${scheme}-gameover.png` });
  const j = await p.evaluate(() => {
    const j = (window as any).__atoll.journal();
    return { found: Object.keys(j.entries).length, total: j.total };
  });
  console.log(scheme, JSON.stringify(j));
  await p.evaluate(() => (window as any).__atoll.restart());
  await p.getByRole('button', { name: 'Menu' }).click();
  await p.getByRole('button', { name: 'Beach Journal' }).click();
  await p.waitForTimeout(400);
  await p.screenshot({ path: `artifacts/ux/journal/${scheme}-journal.png` });
  await p.locator('.j-tile.got').first().click();
  await p.waitForTimeout(300);
  await p.screenshot({ path: `artifacts/ux/journal/${scheme}-species.png` });
  await p.close();
}
await b.close();
