/**
 * Review sheet for one or more species (the artist's inner loop):
 *   npx tsx scripts/art-sheet.ts clownfish [octopus …] [--jpg docs/media/art/pilot-clownfish.jpg]
 * → artifacts/art/sheet-<id>.png: detail Day/Night/golden/locked/before, every expression (Day and
 * Night), journal tiles, 24–64 px, silhouette, lineup with the redrawn cast, idle/signature frames,
 * catch/release hooks, and the style-guide check results. Needs a dev server (LB_URL, default :5317).
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const args = process.argv.slice(2);
const jpgAt = args.indexOf('--jpg');
const jpg = jpgAt >= 0 ? args.splice(jpgAt, 2)[1] : undefined;
const ids = args.filter((a) => !a.startsWith('--'));
if (!ids.length) {
  console.error('usage: tsx scripts/art-sheet.ts <id> [id …] [--jpg out.jpg]');
  process.exit(2);
}
const base = process.env.LB_URL ?? 'http://localhost:5317';
mkdirSync('artifacts/art', { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1180, height: 800 }, deviceScaleFactor: jpg ? 1 : 2 });
const errors: string[] = [];
p.on('pageerror', (e) => errors.push(String(e)));
p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
for (const id of ids) {
  await p.goto(`${base}/tools/gallery.html?sheet=${id}`);
  await p.waitForFunction(() => (window as any).__ready, null, { timeout: 15_000 });
  const out = `artifacts/art/sheet-${id}.png`;
  await p.locator('#c').screenshot({ path: out });
  console.log('wrote', out);
}
if (jpg) {
  mkdirSync(dirname(jpg), { recursive: true });
  await p.goto(`${base}/tools/gallery.html?sheet=${ids.join(',')}`);
  await p.waitForFunction(() => (window as any).__ready);
  await p.locator('#c').screenshot({ path: jpg, type: 'jpeg', quality: 82 });
  console.log('wrote', jpg);
}
await b.close();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
