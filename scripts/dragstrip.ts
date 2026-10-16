/** Frames of a slow drag (pickup → across the board → over a sealing spot) for feel review. */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const out = 'artifacts/film/drag';
mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
await p.goto(`${process.env.LB_URL ?? 'http://localhost:5317'}/?debug=1&seed=42`);
await p.waitForFunction(() => (window as any).__atoll);
await p.waitForTimeout(400);
// stage a cup so the tri-h can seal it
await p.evaluate(() =>
  (window as any).__atoll.setup('0'.repeat(26) + '10100000' + '11100000'.padEnd(30, '0'), ['tri-h', 'square', 'dot']),
);
await p.waitForTimeout(300);
const path = await p.evaluate(() => (window as any).__atoll.pathFor({ slot: 0, x: 2, y: 2 }));
await p.mouse.move(path.down.x, path.down.y);
await p.mouse.down();
const pts = [0, 0.15, 0.4, 0.7, 0.85, 0.93, 1];
for (const [i, t] of pts.entries()) {
  const x = path.down.x + (path.up.x - path.down.x) * t + (t < 1 ? 13 : 0);
  const y = path.down.y + (path.up.y - path.down.y) * t + (t < 1 && t > 0.8 ? 9 : 0);
  await p.mouse.move(x, y, { steps: 3 });
  await p.waitForTimeout(i === 0 ? 40 : 140);
  await p.screenshot({ path: `${out}/f${i}.png`, clip: { x: 0, y: 140, width: 390, height: 600 } });
}
await p.mouse.up();
await b.close();
