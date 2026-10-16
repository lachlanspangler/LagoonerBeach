/** Rasterize public/icon.svg into the PNG sizes the manifest and iOS need. */
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
const svg = readFileSync('public/icon.svg', 'utf8');
const b = await chromium.launch();
for (const size of [180, 192, 512]) {
  const p = await b.newPage({ viewport: { width: size, height: size } });
  await p.setContent(
    `<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`,
  );
  await p.screenshot({ path: `public/icon-${size}.png`, omitBackground: true });
  await p.close();
}
await b.close();
console.log('icons written');
