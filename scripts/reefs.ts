/** Screenshot several reef puzzles (by index) for review: artifacts/film/reefs/. */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
mkdirSync('artifacts/film/reefs', { recursive: true });
const idx = (process.argv[2] ?? '0,20,50,80,110,119').split(',').map(Number);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
await p.goto('http://localhost:5317/?debug=1');
await p.waitForFunction(() => (window as any).__atoll);
await p.evaluate(() => (window as any).__atoll.switchMode('puzzle'));
await p.waitForTimeout(500);
for (const i of idx) {
  await p.evaluate((k) => (window as any).__atoll.loadPuzzle(k), i);
  await p.waitForTimeout(500);
  await p.screenshot({ path: `artifacts/film/reefs/r${String(i).padStart(3, '0')}.png` });
}
await b.close();
