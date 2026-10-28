/**
 * Smoke-test the release build served under a sub-path, the way GitHub Pages serves it
 * (https://<user>.github.io/Atoll/). Start a server first:
 *   npm run build && npx vite preview --base /Atoll/ --port 8765
 *   npx tsx scripts/pages-check.ts [url]
 */
import { chromium } from '@playwright/test';

const url = process.argv[2] ?? 'http://localhost:8765/Atoll/';
const b = await chromium.launch({ args: ['--mute-audio'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const errors: string[] = [];
p.on('pageerror', (e) => errors.push(String(e)));
p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
p.on('response', (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
await p.goto(url);
await p.waitForTimeout(3000);
await p.screenshot({ path: 'artifacts/pages-check.png' });
const fonts = await p.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').length);
console.log(JSON.stringify({ url, title: await p.title(), fontsLoaded: fonts, errors }, null, 1));
await b.close();
if (errors.length) process.exit(1);
