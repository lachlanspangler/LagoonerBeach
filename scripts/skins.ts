/** Screenshot every skin in both themes after a few bot moves: artifacts/film/skins/. */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const ids = ['pebble', 'glyph', 'seaglass', 'coral', 'lantern', 'moonstone', 'atoll'];
mkdirSync('artifacts/film/skins', { recursive: true });
const b = await chromium.launch();
for (const theme of ['light', 'dark'] as const) {
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: theme });
  await p.goto('http://localhost:5317/?debug=1&seed=5');
  await p.waitForFunction(() => (window as any).__atoll);
  await p.evaluate(() => (window as any).__atoll.autoplay('random', 9));
  for (const id of ids) {
    await p.evaluate((i) => (window as any).__atoll.debugSkin(i), id);
    await p.waitForTimeout(450);
    await p.screenshot({
      path: `artifacts/film/skins/${theme}-${id}.png`,
      clip: { x: 0, y: 150, width: 390, height: 560 },
    });
  }
  await p.close();
}
await b.close();
