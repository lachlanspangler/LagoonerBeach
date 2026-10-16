/**
 * Standard UX review set → artifacts/ux/<label>/ (before/after comparisons).
 *   npx tsx scripts/ux-shots.ts <label>
 * start-day, start-night, seal-preview (6-cell lagoon mid-drag), capture-t*.png (filmstrip of that
 * capture), mid-night (night board after 11 moves), first-capture-t* (teaching capture), gameover.
 */
import { chromium, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const label = process.argv[2] ?? 'now';
const dir = `artifacts/ux/${label}`;
mkdirSync(dir, { recursive: true });
const URL = `${process.env.LB_URL ?? 'http://localhost:5317'}/?debug=1&seed=42`;
const b = await chromium.launch();
const page = async (scheme: 'light' | 'dark') => {
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme });
  await p.goto(URL);
  await p.waitForFunction(() => (window as any).__atoll);
  await p.waitForTimeout(700);
  return p;
};
const LAGOON = '00000000' + '01000100' + '01000100' + '01000100' + '01111100' + '00000000' + '00000000' + '00000000';
async function dragHold(p: Page, slot: number, x: number, y: number) {
  const path = await p.evaluate((m) => (window as any).__atoll.pathFor(m), { slot, x, y });
  await p.mouse.move(path.down.x, path.down.y);
  await p.mouse.down();
  await p.mouse.move(path.up.x, path.up.y, { steps: 8 });
  await p.waitForTimeout(250);
}

for (const scheme of ['light', 'dark'] as const) {
  const p = await page(scheme);
  await p.screenshot({ path: `${dir}/start-${scheme === 'light' ? 'day' : 'night'}.png` });
  await p.close();
}
{
  const p = await page('light');
  await p.evaluate((bd) => (window as any).__atoll.setup(bd.replace(/1/g, '3'), ['tri-h', 'square', 'cup-up']), LAGOON);
  await p.waitForTimeout(300);
  await dragHold(p, 0, 2, 1);
  await p.screenshot({ path: `${dir}/seal-preview.png` });
  const t0 = Date.now();
  await p.mouse.up();
  for (const t of [80, 160, 260, 380, 520, 700, 950]) {
    const w = t - (Date.now() - t0);
    if (w > 0) await p.waitForTimeout(w);
    await p.screenshot({
      path: `${dir}/capture-t${String(t).padStart(4, '0')}.png`,
      clip: { x: 0, y: 0, width: 390, height: 600 },
    });
  }
  await p.close();
}
{
  const p = await page('light');
  // teaching game: cup then lid
  for (const [slot, x, y] of [
    [0, 2, 4],
    [1, 2, 3],
  ] as const) {
    await dragHold(p, slot, x, y);
    const t0 = Date.now();
    await p.mouse.up();
    if (slot === 1)
      for (const t of [100, 250, 450, 700]) {
        const w = t - (Date.now() - t0);
        if (w > 0) await p.waitForTimeout(w);
        await p.screenshot({
          path: `${dir}/first-capture-t${String(t).padStart(4, '0')}.png`,
          clip: { x: 0, y: 0, width: 390, height: 600 },
        });
      }
    else await p.waitForTimeout(500);
  }
  await p.close();
}
{
  const p = await page('dark');
  await p.evaluate(() => (window as any).__atoll.autoplay('random', 11));
  await p.waitForTimeout(1800);
  await p.screenshot({ path: `${dir}/mid-night.png` });
  await p.close();
}
{
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await p.goto(URL + '&fast=1');
  await p.waitForFunction(() => (window as any).__atoll);
  await p.evaluate(() => (window as any).__atoll.autoplay('random', 500));
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${dir}/gameover.png` });
  await p.close();
}
await b.close();
console.log('ux shots →', dir);
