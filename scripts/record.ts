/**
 * Short real-time recordings of the big moments (Playwright video → mp4 via ffmpeg).
 *   npx tsx scripts/record.ts [--theme night]   → docs/media/video/*.mp4 (needs the dev server + ffmpeg)
 * Clips: a COMBO lagoon, a cascade, the biggest moment, a Spotless clear, uncommon + legendary
 * discoveries, NEW HIGH SCORE results, a Daily → name entry → leaderboard. Moves are real pointer drags.
 */
import { chromium, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { BOARDS, boardString } from '../tests/e2e/celebrate-boards.ts';

const url = process.env.LB_URL ?? 'http://localhost:5317';
const night = process.argv.includes('--theme') && process.argv[process.argv.indexOf('--theme') + 1] === 'night';
const OUT = 'docs/media/video';
const RAW = 'artifacts/video';
mkdirSync(OUT, { recursive: true });
mkdirSync(RAW, { recursive: true });
const b = await chromium.launch();

async function clip(name: string, run: (p: Page) => Promise<void>) {
  const dir = `${RAW}/${name}`;
  rmSync(dir, { recursive: true, force: true });
  const ctx = await b.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    colorScheme: night ? 'dark' : 'light',
    recordVideo: { dir, size: { width: 390, height: 844 } },
  });
  const p = await ctx.newPage();
  await p.goto(`${url}/?debug=1&seed=42`);
  await p.waitForFunction(() => (window as any).__atoll);
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => ((window as any).__atoll.profile().firstRunDone = true));
  await p.waitForTimeout(600);
  await run(p);
  await ctx.close();
  const webm = readdirSync(dir).find((f) => f.endsWith('.webm'))!;
  renameSync(`${dir}/${webm}`, `${dir}/clip.webm`);
  const out = `${OUT}/${name}${night ? '-night' : ''}.mp4`;
  // trim the boot second, scale for docs, h264 so it plays everywhere
  execFileSync('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    '-ss',
    '0.9',
    '-i',
    `${dir}/clip.webm`,
    '-vf',
    'fps=30,scale=390:-2',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-crf',
    '28',
    '-movflags',
    '+faststart',
    out,
  ]);
  console.log('wrote', out);
}

async function drag(p: Page, m: { slot: number; x: number; y: number }) {
  const path = await p.evaluate((mv) => (window as any).__atoll.pathFor(mv), m);
  await p.mouse.move(path.down.x, path.down.y);
  await p.mouse.down();
  await p.mouse.move(path.up.x, path.up.y, { steps: 18 });
  await p.waitForTimeout(250);
  await p.mouse.up();
}

async function staged(p: Page, key: string, combo?: number) {
  const s = BOARDS[key]!;
  await p.evaluate(([board, tray]) => (window as any).__atoll.setup(board, tray), [boardString(s), s.tray] as const);
  const c = combo ?? s.combo ?? 0;
  if (c) await p.evaluate((n) => (window as any).__atoll.stageCombo(n, 0), c);
  await p.waitForTimeout(900);
  await drag(p, s.move);
  await p.waitForTimeout(2600);
}

await clip('combo-lagoon', (p) => staged(p, 'lagoon', 6));
await clip('cascade', (p) => staged(p, 'cascade', 3));
await clip('biggest', (p) => staged(p, 'biggest'));
await clip('spotless', (p) => staged(p, 'spotless', 9));
await clip('discovery-uncommon', async (p) => {
  await p.evaluate(() => (window as any).__atoll.revealSpecies('seahorse', { size: 12.5 }));
  await p.waitForTimeout(3600);
});
await clip('discovery-legendary', async (p) => {
  await p.evaluate(() => (window as any).__atoll.revealSpecies('kraken', { size: 64 }));
  await p.waitForTimeout(4200);
});
await clip('new-high-score', async (p) => {
  await p.evaluate(() => (window as any).__atoll.showResults({ score: 5230, prevBest: 4100 }));
  await p.waitForTimeout(3800);
});
await clip('daily-leaderboard', async (p) => {
  await p.evaluate(() => (window as any).__atoll.switchMode('daily'));
  await p.waitForTimeout(500);
  await p.evaluate(() => (window as any).__atoll.autoplay('human', 400));
  await p.waitForTimeout(3200);
  await p.locator('#lb-open').click();
  await p.getByTestId('lb-slots').waitFor();
  await p.waitForTimeout(500);
  for (const k of 'PEARL') {
    await p.keyboard.press(k);
    await p.waitForTimeout(160);
  }
  await p.waitForTimeout(400);
  await p.getByTestId('lb-post').click();
  await p.waitForTimeout(2600);
});
await b.close();
