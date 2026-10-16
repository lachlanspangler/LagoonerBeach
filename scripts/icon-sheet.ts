/**
 * Review sheet of the Tidemark icon set (outline + filled, 24 px and 48 px, Day and Night):
 *   LB_URL=http://localhost:5317 npx tsx scripts/icon-sheet.ts → artifacts/ux/icons.png
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const base = process.env.LB_URL ?? 'http://localhost:5317';
mkdirSync('artifacts/ux', { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 900, height: 600 }, deviceScaleFactor: 2 });
await p.goto(`${base}/?debug=1`);
await p.waitForFunction(() => (window as any).__atoll);
// a string body: tsx would inject `__name` helpers into a function passed to the page
await p.evaluate(`(async () => {
  const m = await import('/src/ui/icons.ts');
  const cell = (n, night) =>
    '<div style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px;color:' + (night ? '#A3B5C3' : '#6B5C4B') + '">' +
    '<div style="display:flex;gap:6px;align-items:center">' + m.icon(n, { size: 24 }) + m.icon(n, { size: 24, filled: true }) + m.icon(n, { size: 48 }) + '</div>' +
    '<span style="font:700 10px sans-serif">' + n + '</span></div>';
  document.body.innerHTML = ['day', 'night'].map((t) =>
    '<div style="--surface:' + (t === 'night' ? '#13253A' : '#FFFBF5') + ';background:var(--surface);display:grid;grid-template-columns:repeat(8,1fr)">' +
    m.ICON_NAMES.map((n) => cell(n, t === 'night')).join('') + '</div>').join('');
  document.body.style.cssText = 'margin:0;overflow:visible';
})()`);
await p.screenshot({ path: 'artifacts/ux/icons.png', fullPage: true });
await b.close();
console.log('artifacts/ux/icons.png');
