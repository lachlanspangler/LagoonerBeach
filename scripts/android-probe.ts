/**
 * Drive the real app inside the Android emulator's WebView over raw CDP (debug builds only).
 *   adb forward tcp:9333 localabstract:webview_devtools_remote_<pid>
 *   npx tsx scripts/android-probe.ts        → JSON report + artifacts/shots/android-*.png
 * Reloads the app with ?debug=1 so the __atoll hooks exist, then checks fonts, an endless reef
 * from the worker, and a daily → leaderboard flow, with screenshots.
 */
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const { ws: WS } = require('playwright-core/lib/utilsBundle');
const targets = (await (await fetch('http://localhost:9333/json')).json()) as {
  type: string;
  webSocketDebuggerUrl: string;
}[];
const page = targets.find((t) => t.type === 'page')!;
const sock = new WS(page.webSocketDebuggerUrl, { perMessageDeflate: false });
await new Promise((r) => sock.on('open', r));
let id = 0;
const pending = new Map<number, (v: any) => void>();
sock.on('message', (m: Buffer) => {
  const msg = JSON.parse(m.toString());
  if (msg.id && pending.has(msg.id)) pending.get(msg.id)!(msg);
});
const send = (method: string, params: object = {}) =>
  new Promise<any>((r) => {
    const i = ++id;
    pending.set(i, r);
    sock.send(JSON.stringify({ id: i, method, params }));
  });
const ev = async (expr: string) => {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400));
  return r.result?.result?.value;
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// CDP screenshots of a WebView miss GPU canvases (they come out blank) → use the device's screencap
const ADB = `${process.env.HOME}/Library/Android/sdk/platform-tools/adb`;
const shot = async (name: string) => {
  writeFileSync(`artifacts/shots/android-${name}.png`, execFileSync(ADB, ['exec-out', 'screencap', '-p']));
};
await send('Page.enable');
await ev(`location.href = 'https://localhost/?debug=1&seed=7'`);
await sleep(3500);
const report: Record<string, unknown> = {};
report.hooks = await ev(`typeof window.__atoll`);
report.fonts = await ev(`[...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight)`);
await ev(`window.__atoll.switchMode('puzzle')`);
await sleep(500);
const t0 = Date.now();
await ev(`window.__atoll.loadPuzzle(400)`);
for (let i = 0; i < 60; i++) {
  const st = await ev(`JSON.stringify(window.__atoll.reefStats?.() ?? null)`);
  report.reefStats = st;
  const label = await ev(`document.title`);
  void label;
  if (await ev(`window.__atoll.reefReady ? window.__atoll.reefReady(400) : true`)) break;
  await sleep(200);
}
report.reef401ms = Date.now() - t0;
await sleep(800);
await shot('reef401');
await ev(`window.__atoll.switchMode('daily')`);
await sleep(500);
await ev(`window.__atoll.autoplay('human', 400)`);
await sleep(3000);
await shot('daily-over');
report.score = await ev(`window.__atoll.state().score`);
// a legendary discovery reveal, then the journal (new art from the lazy chunk)
await ev(`window.__atoll.restart()`);
await sleep(600);
await ev(`window.__atoll.revealSpecies('kraken', { size: 64 })`);
await sleep(2600);
await shot('reveal');
report.drawP95 = await ev(
  `(() => { const d = window.__atoll.drawTimes().slice().sort((a, b) => a - b); return d[Math.floor(d.length * 0.95)] ?? null; })()`,
);

console.log(JSON.stringify(report, null, 1));
sock.close();
