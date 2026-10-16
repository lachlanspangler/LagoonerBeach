/**
 * App-store screenshots (1290×2796, iPhone 6.7") with a caption band, staged with debug hooks.
 *   npx tsx scripts/store-shots.ts   → artifacts/store/*.png
 */
import { chromium, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
mkdirSync('artifacts/store', { recursive: true });
const W = 430;
const H = 932; // ×3 = 1290×2796
const b = await chromium.launch();

async function shot(name: string, caption: string, theme: 'light' | 'dark', stage: (p: Page) => Promise<void>) {
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 3, colorScheme: theme });
  await p.goto('http://localhost:5317/?debug=1&seed=42');
  await p.waitForFunction(() => (window as any).__atoll);
  await p.waitForTimeout(300);
  await stage(p);
  await p.evaluate((c) => {
    const d = document.createElement('div');
    d.textContent = c;
    d.style.cssText =
      'position:fixed;left:0;right:0;bottom:0;padding:26px 28px 44px;font:800 30px ui-rounded,system-ui;text-align:center;color:var(--text);background:linear-gradient(transparent,var(--bg) 35%);pointer-events:none';
    document.body.append(d);
  }, caption);
  await p.waitForTimeout(120);
  await p.screenshot({ path: `artifacts/store/${name}.png` });
  await p.close();
}

// a 3×2 lagoon whose top wall has a 3-cell gap at (2..4, 1): the tri-h lid seals it
const LAGOON = '00000000' + '01000100' + '01000100' + '01000100' + '01111100' + '00000000' + '00000000' + '00000000';
const dragTo = async (p: Page, slot: number, x: number, y: number, frac = 1) => {
  const path = await p.evaluate((m) => (window as any).__atoll.pathFor(m), { slot, x, y });
  await p.mouse.move(path.down.x, path.down.y);
  await p.mouse.down();
  await p.mouse.move(path.down.x + (path.up.x - path.down.x) * frac, path.down.y + (path.up.y - path.down.y) * frac, {
    steps: 8,
  });
  await p.waitForTimeout(250);
};

await shot('1-seal', 'Close a loop.', 'light', async (p) => {
  await p.evaluate((bd) => (window as any).__atoll.setup(bd.replace(/1/g, '3'), ['tri-h', 'square', 'cup-up']), LAGOON);
  await dragTo(p, 0, 2, 1);
});
await shot('2-pop', 'Everything inside pops.', 'light', async (p) => {
  await p.evaluate((bd) => (window as any).__atoll.setup(bd.replace(/1/g, '5'), ['tri-h', 'square', 'cup-up']), LAGOON);
  await dragTo(p, 0, 2, 1);
  await p.mouse.up();
  await p.waitForTimeout(300);
});
await shot('3-night', 'Calm by day. Glowing by night.', 'dark', async (p) => {
  await p.evaluate(() => (window as any).__atoll.autoplay('random', 11));
  await p.waitForTimeout(1800);
});
await shot('4-reef', '120 reef puzzles. Every one solvable.', 'light', async (p) => {
  await p.evaluate(() => (window as any).__atoll.switchMode('puzzle'));
  await p.waitForTimeout(400);
  await p.evaluate(() => (window as any).__atoll.loadPuzzle(119));
  await p.waitForTimeout(500);
});
await shot('5-glyph', 'Made for every eye.', 'light', async (p) => {
  await p.evaluate(() => (window as any).__atoll.debugSkin('glyph'));
  await p.evaluate(() => (window as any).__atoll.autoplay('random', 10));
  await p.waitForTimeout(600);
});
await b.close();
console.log('store shots → artifacts/store');
