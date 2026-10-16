/** Screenshot the dev creature gallery: artifacts/film/creatures-*.png */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
mkdirSync('artifacts/film', { recursive: true });
const b = await chromium.launch();
for (const q of ['', 'night', 'golden&sil']) {
  const p = await b.newPage({ viewport: { width: 960, height: 760 } });
  await p.goto(`${process.env.LB_URL ?? 'http://localhost:5317'}/tools/gallery.html?${q}`);
  await p.waitForFunction(() => (window as any).__ready);
  await p.screenshot({ path: `artifacts/film/creatures-${q || 'day'}.png`, fullPage: true });
  await p.close();
}
await b.close();
