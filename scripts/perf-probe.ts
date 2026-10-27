/**
 * Perf probe for the biggest celebration: per-frame draw times (cold run, then warm run) and a CPU
 * profile of the cold run's hot functions. Needs a preview build on :4399 (`npx vite preview --port 4399`).
 *   npx tsx scripts/perf-probe.ts
 */
import { chromium } from '@playwright/test';
import { BOARDS, boardString } from '../tests/e2e/celebrate-boards.ts';
const url = process.env.LB_URL ?? 'http://localhost:4399';
const b0 = await chromium.launch({ args: ['--mute-audio'] });
const page = await b0.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625 });
await page.goto(`${url}/?debug=1&seed=11`);
await page.waitForFunction(() => (window as any).__atoll);
await page.waitForTimeout(1500);
const cdp = await page.context().newCDPSession(page);
const runs: Map<string, number>[] = [];
for (let r = 0; r < 2; r++) {
  const b = BOARDS.biggest!;
  await page.evaluate(([board, tray]) => (window as any).__atoll.setup(board, tray), [boardString(b), b.tray] as const);
  await page.evaluate((n) => (window as any).__atoll.stageCombo(n), b.combo);
  await page.waitForTimeout(800);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.evaluate(() => (window as any).__atoll.clearFrames());
  {
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
    await cdp.send('Profiler.start');
  }
  const path = await page.evaluate((m) => (window as any).__atoll.pathFor(m), b.move);
  await page.mouse.move(path.down.x, path.down.y);
  await page.mouse.down();
  await page.mouse.move(path.up.x, path.up.y, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(1600);
  {
    const { profile } = (await cdp.send('Profiler.stop')) as any;
    const self = new Map<string, number>();
    const dt = profile.timeDeltas as number[];
    const byId = new Map<number, any>(profile.nodes.map((n: any) => [n.id, n]));
    (profile.samples as number[]).forEach((id, i) => {
      const n = byId.get(id);
      const k = `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').pop()}:${n.callFrame.lineNumber}`;
      self.set(k, (self.get(k) ?? 0) + (dt[i] ?? 0) / 1000);
    });
    runs.push(self);
    if (r === 1) {
      const [c0, w1] = runs as [Map<string, number>, Map<string, number>];
      const diff = [...c0].map(([k, v]) => [k, v - (w1.get(k) ?? 0)] as const).sort((a, c) => c[1] - a[1]);
      console.log(
        'cold − warm self time:\n' +
          diff
            .slice(0, 14)
            .map(([k, v]) => `${v.toFixed(1)}ms ${k}`)
            .join('\n'),
      );
    }
    // who calls the hot natives: parent chains of fillText/strokeText/measureText samples
    const parent = new Map<number, number>();
    for (const n of profile.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
    const chains = new Map<string, number>();
    (profile.samples as number[]).forEach((id, i) => {
      const n = byId.get(id);
      if (!/Text$/.test(n.callFrame.functionName)) return;
      const names: string[] = [];
      let p = parent.get(id);
      while (p && names.length < 4) {
        const pn = byId.get(p);
        names.push(`${pn.callFrame.functionName || '(anon)'}:${pn.callFrame.columnNumber}`);
        p = parent.get(p);
      }
      const k = `${n.callFrame.functionName} <- ${names.join(' <- ')}`;
      chains.set(k, (chains.get(k) ?? 0) + (dt[i] ?? 0) / 1000);
    });
    console.log(
      [...chains]
        .sort((a, c) => c[1] - a[1])
        .slice(0, 6)
        .map(([k, v]) => `${v.toFixed(1)}ms ${k}`)
        .join('\n'),
    );
  }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const draws: number[] = await page.evaluate(() => (window as any).__atoll.drawTimes());
  console.log(r ? 'warm' : 'cold', draws.map((d) => d.toFixed(1)).join(' '));
}
await b0.close();
