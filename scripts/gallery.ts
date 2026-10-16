/**
 * Screenshot the dev creature gallery into artifacts/art/ (needs a dev server; LB_URL, default :5317):
 *   gallery-all.png        every species: old vs new, Day/Night, 24 px, silhouette, locked, expressions, golden
 *   compare-day/night.png  BEFORE/AFTER for every species with new art
 *   silhouettes.png        24 px fill-only masks by habitat
 *   film-<id>-<mode>.png   with --film <id> [--frames N] [--mode idle|signature|catch|release]
 * Legacy contact sheets (artifacts/film/creatures-*.png) are still written with --legacy.
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const argv = process.argv.slice(2);
const opt = (k: string) => {
  const i = argv.indexOf(k);
  return i >= 0 ? argv[i + 1] : undefined;
};
const base = process.env.LB_URL ?? 'http://localhost:5317';
mkdirSync('artifacts/art', { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
const errors: string[] = [];
p.on('pageerror', (e) => errors.push(String(e)));
const shot = async (query: string, out: string) => {
  await p.goto(`${base}/tools/gallery.html?${query}`);
  await p.waitForFunction(() => (window as any).__ready, null, { timeout: 15_000 });
  await p.locator('#c').screenshot({ path: out });
  console.log('wrote', out);
};
const film = opt('--film');
if (film) {
  const mode = opt('--mode') ?? 'idle';
  await shot(`film=${film}&frames=${opt('--frames') ?? 10}&mode=${mode}`, `artifacts/art/film-${film}-${mode}.png`);
} else {
  await shot('static', 'artifacts/art/gallery-all.png');
  await shot('compare', 'artifacts/art/compare-day.png');
  await shot('compare&night', 'artifacts/art/compare-night.png');
  await shot('sil', 'artifacts/art/silhouettes.png');
  for (const id of ['clownfish', 'octopus', 'sanddollar', 'hermit', 'turtle'])
    for (const mode of ['idle', 'signature'])
      await shot(`film=${id}&frames=10&mode=${mode}`, `artifacts/art/film-${id}-${mode}.png`);
}
if (argv.includes('--legacy')) {
  mkdirSync('artifacts/film', { recursive: true });
  await shot('static', 'artifacts/film/creatures-all.png');
}
await b.close();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
