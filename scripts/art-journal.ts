/**
 * The creatures in the real game UI: stage a journal (found = the given ids, or every species with
 * new art plus a few legacy ones), open the Beach Journal and a species page, Day and Night.
 *   npx tsx scripts/art-journal.ts [id …]   → artifacts/art/journal-{day,night}.png, species-{day,night}.png
 * Needs a dev server (LB_URL, default :5317).
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const ids = process.argv.slice(2);
const base = process.env.LB_URL ?? 'http://localhost:5317';
mkdirSync('artifacts/art', { recursive: true });
const b = await chromium.launch();
for (const scheme of ['light', 'dark'] as const) {
  const tag = scheme === 'light' ? 'day' : 'night';
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme });
  await p.goto(`${base}/?debug=1&seed=3`);
  await p.waitForFunction(() => (window as any).__atoll && (window as any).__lbArt, null, { timeout: 15_000 });
  const found: string[] = await p.evaluate((ids) => {
    const art = (window as any).__lbArt.ART as Map<string, unknown>;
    const list = ids.length ? ids : [...art.keys(), 'minnow', 'periwinkle', 'limpet', 'shrimp', 'seahorse', 'puffer'];
    (window as any).__atoll.stageJournal(list);
    return list;
  }, ids);
  await p.getByRole('button', { name: 'Menu' }).click();
  await p.getByRole('button', { name: 'Beach Journal' }).click();
  await p.waitForTimeout(500);
  await p.screenshot({ path: `artifacts/art/journal-${tag}.png` });
  const first = (await p.evaluate(() => [...(window as any).__lbArt.ART.keys()][0])) as string;
  const name = await p.evaluate((id) => {
    const tiles = [...document.querySelectorAll('.j-tile.got')] as HTMLElement[];
    const t = tiles.find((x) => x.getAttribute('aria-label')?.toLowerCase().includes(id.slice(0, 5))) ?? tiles[0];
    t?.click();
    return t?.getAttribute('aria-label');
  }, ids[0] ?? first);
  await p.waitForTimeout(700);
  await p.screenshot({ path: `artifacts/art/species-${tag}.png` });
  console.log(tag, 'found', found.length, 'opened', name);
  await p.close();
}
await b.close();
