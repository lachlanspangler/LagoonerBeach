/**
 * Block contact sheet through the REAL sprite code (ADR 0014): every colour × 22/28/40/64 px ×
 * normal/lit/ghost × per-cell variants, CVD-simulated (deutan/protan/tritan) and greyscale columns,
 * board snippets (as seen, deutan, grey), every skin, plus measured mean colours, pair ΔE and the
 * sprite warm-up cost at dpr 3 (1× and 4× CPU throttle).
 *
 *   LB_URL=http://localhost:5319 npx tsx scripts/blocks-sheet.ts [label]
 *   → artifacts/blocks/<label>-day.png, -night.png, <label>.json
 *
 * Works against any dev server of this repo (it imports /src/render/*.ts in the page), including
 * older code with the same SpriteCache.pebble(palette, color, size, state) API: the 5th argument
 * (per-cell variant) is ignored there.
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const base = process.env.LB_URL ?? 'http://localhost:5319';
const label = process.argv[2] ?? 'now';
const dir = 'artifacts/blocks';
mkdirSync(dir, { recursive: true });

// Runs in the page (plain JS string: no bundler helpers leak into it).
const PAGE = String.raw`
window.sheet = async (theme, dpr) => {
  const S = await import('/src/render/sprites.ts');
  const T = await import('/src/render/theme.ts');
  const K = await import('/src/render/skins.ts');
  const C = await import('/src/render/color.ts');
  const P = theme === 'night' ? T.NIGHT : T.DAY;
  const GEOM = T.GEOM;
  const NAMES = ['', 'coral', 'sun', 'kelp', 'lagoon', 'orchid', 'shell'];
  const MAT = K.LOOKS.pebble.style === 'reef'
    ? ['', 'brain coral', 'golden sandstone', 'sea glass', 'blue coral', 'wet porphyry', 'coralline crust']
    : ['', 'pebble', 'pebble', 'pebble', 'pebble', 'pebble', 'pebble'];
  const cache = new S.SpriteCache(dpr);
  cache.setLook(K.LOOKS.pebble);
  const spr = (c, size, st = 'normal', v = 0) => cache.pebble(P, c, size, st, v);
  const cols = [
    ['22', 22], ['28', 28], ['40', 40], ['64', 64],
    ['40 lit', 40, 'lit'], ['40 ghost', 40, 'ghost'], ['40 v1', 40, 'normal', 1], ['40 v2', 40, 'normal', 2],
    ['24 deutan', 24, 'deutan'], ['24 protan', 24, 'protan'], ['24 tritan', 24, 'tritan'], ['24 grey', 24, 'grey'],
  ];
  const LW = 150, rowH = 80, colW = (c) => Math.max(c[1], 40) + 14;
  const W0 = LW + cols.reduce((a, c) => a + colW(c), 0) + 10;
  const BC = 28, boardW = 8 * BC + 12;
  const W = Math.max(W0, 3 * (boardW + 16) + 20 + 8 * 40 + 12);
  const H = 40 + 6 * rowH + 30 + 8 * 40 + 20 + 30 + Object.keys(K.LOOKS).length * 36 + 20;
  const cv = document.createElement('canvas');
  cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px';
  document.body.replaceChildren(cv);
  document.body.style.margin = '0';
  const g = cv.getContext('2d');
  g.scale(dpr, dpr);
  g.fillStyle = P.bg; g.fillRect(0, 0, W, H);
  g.fillStyle = P.text; g.font = '600 13px sans-serif';
  g.fillText('Lagooner Beach · blocks · ' + theme.toUpperCase() + ' · ' + location.host, 10, 20);
  // a board cell like drawPanel's: inset + face
  const cell = (gg, x, y, size) => {
    const gut = size * GEOM.gutter, s = size - gut * 2;
    gg.fillStyle = P.cellInset; gg.beginPath(); gg.roundRect(x + gut, y + gut, s, s, s * GEOM.cellRadius); gg.fill();
    gg.fillStyle = P.cell; gg.beginPath(); gg.roundRect(x + gut, y + gut + s * 0.05, s, s * 0.95, s * GEOM.cellRadius); gg.fill();
  };
  const toGrey = (r, gg, b) => { const y = 0.2126 * r + 0.7152 * gg + 0.0722 * b; return [y, y, y]; };
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const srgb = (v) => Math.max(0, Math.min(255, (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055) * 255));
  const simPx = (rgb, k) => {
    if (k === 'grey') { const y = srgb(0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2])); return [y, y, y]; }
    return C.simulate(rgb, k);
  };
  const simRegion = (x, y, w, h, k) => {
    const d = g.getImageData(x * dpr, y * dpr, w * dpr, h * dpr);
    for (let i = 0; i < d.data.length; i += 4) {
      const o = simPx([d.data[i], d.data[i + 1], d.data[i + 2]], k);
      d.data[i] = o[0]; d.data[i + 1] = o[1]; d.data[i + 2] = o[2];
    }
    g.putImageData(d, x * dpr, y * dpr);
  };
  let x = LW; g.font = '10px sans-serif';
  for (const c of cols) { g.fillText(c[0], x, 36); x += colW(c); }
  for (let i = 1; i <= 6; i++) {
    const y0 = 46 + (i - 1) * rowH;
    g.fillStyle = P.text; g.font = '600 11px sans-serif';
    g.fillText(NAMES[i] + ' ' + K.LOOKS.pebble.colors[i], 10, y0 + 20);
    g.font = '11px sans-serif'; g.fillText(MAT[i], 10, y0 + 36);
    let x = LW;
    for (const [, sz, st = 'normal', v = 0] of cols) {
      g.fillStyle = P.board; g.fillRect(x - 5, y0 - 5, Math.max(sz, 40) + 10, rowH - 8);
      cell(g, x, y0, sz);
      if (st === 'ghost') { g.globalAlpha = 0.38; g.drawImage(spr(i, sz), x, y0, sz, sz); g.globalAlpha = 1; }
      else if (st === 'lit') g.drawImage(spr(i, sz, 'lit'), x, y0, sz, sz);
      else g.drawImage(spr(i, sz, 'normal', v), x, y0, sz, sz);
      if (['deutan', 'protan', 'tritan', 'grey'].includes(st)) { g.drawImage(spr(i, sz), x, y0, sz, sz); simRegion(x - 5, y0 - 5, Math.max(sz, 40) + 10, rowH - 8, st); }
      x += colW([0, sz]);
    }
  }
  // board snippets: 8×8 at 28 px (as seen · deutan · grey) and 8×8 at 40 px with a lit ring
  const BOARD = ['112.5556', '1.2.5..6', '33.4446.', '3..4..66', '222.11.4', '.5..113.', '66.44.22', '6..4..25'];
  const RING = new Set([18, 19, 20, 26, 28, 34, 35, 36]);
  const BIG = ['..3333..', '.5....1.', '.5.44.1.', '.5.4..1.', '.5.444..', '.6....22', '.666..2.', '........'];
  const by = 46 + 6 * rowH + 12;
  g.fillStyle = P.text; g.font = '11px sans-serif';
  g.fillText('board 28 px: as seen · deutan · grey      board 40 px: lit ring (the capture preview) + ghost piece', 10, by);
  const drawBoard = (gg, ox, oy, cs, rows, ring, ghost) => {
    gg.fillStyle = P.board; gg.beginPath(); gg.roundRect(ox, oy, 8 * cs + 12, 8 * cs + 12, 10); gg.fill();
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      const X = ox + 6 + c * cs, Y = oy + 6 + r * cs, ch = rows[r][c], i = r * 8 + c;
      cell(gg, X, Y, cs);
      if (ghost && ghost.has(i)) { gg.globalAlpha = 0.38; gg.drawImage(spr(+ghost.get(i), cs, 'normal', S.cellVariant ? S.cellVariant(i) : 0), X, Y, cs, cs); gg.globalAlpha = 1; }
      if (ch === '.') continue;
      const v = S.cellVariant ? S.cellVariant(i) : 0;
      gg.drawImage(spr(+ch, cs, ring && ring.has(i) ? 'lit' : 'normal', v), X, Y, cs, cs);
    }
  };
  for (let k = 0; k < 3; k++) {
    const ox = 10 + k * (boardW + 16);
    drawBoard(g, ox, by + 8, BC, BOARD);
    if (k) simRegion(ox, by + 8, boardW, boardW, k === 1 ? 'deutan' : 'grey');
  }
  const ghost = new Map([[59, '3'], [60, '3'], [61, '3']]);
  drawBoard(g, 10 + 3 * (boardW + 16), by + 8, 40, BIG, RING, ghost);
  // skins: every look at 28 px
  let sy = by + 8 + 8 * 40 + 34;
  g.fillStyle = P.text; g.fillText('skins at 28 px', 10, sy - 8);
  for (const L of Object.values(K.LOOKS)) {
    const sc = new S.SpriteCache(dpr); sc.setLook(L);
    g.fillStyle = P.text; g.fillText(L.id + ' (' + L.style + ')', 10, sy + 18);
    g.fillStyle = P.board; g.fillRect(LW - 6, sy - 2, 6 * 34 + 8 + 2 * 34 + 10, 32);
    for (let c = 1; c <= 6; c++) { cell(g, LW + (c - 1) * 34, sy, 28); g.drawImage(sc.pebble(P, c, 28, 'normal', 1), LW + (c - 1) * 34, sy, 28, 28); }
    for (let c = 1; c <= 2; c++) { cell(g, LW + (c + 5) * 34 + 8, sy, 28); g.drawImage(sc.pebble(P, c, 28, 'lit'), LW + (c + 5) * 34 + 8, sy, 28, 28); }
    sy += 36;
  }
  // measurements: mean of opaque face pixels (all three variants) at 24 and 40 px
  const mean = (c, size) => {
    let r = 0, gg = 0, b = 0, n = 0;
    for (let v = 0; v < 3; v++) {
      const im = spr(c, size, 'normal', v);
      const t = new OffscreenCanvas(im.width, im.height); const q = t.getContext('2d'); q.drawImage(im, 0, 0);
      const d = q.getImageData(0, 0, im.width, im.height).data;
      // face only: the top 88% of the stone (the lip and shadow are excluded)
      const gut = GEOM.gutter, lim = (gut + (1 - 2 * gut) * 0.88) * im.height;
      for (let y = 0; y < lim; y++) for (let x = 0; x < im.width; x++) { const k = (y * im.width + x) * 4; if (d[k + 3] > 250) { r += d[k]; gg += d[k + 1]; b += d[k + 2]; n++; } }
    }
    return [r / n, gg / n, b / n];
  };
  const hex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
  const minPair = (cs, k) => {
    const s = cs.map((c) => (k ? simPx(c, k) : c)); let m = 1e9, pair = '';
    for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) { const e = C.deltaE(s[i], s[j]); if (e < m) { m = e; pair = NAMES[i + 1] + '/' + NAMES[j + 1]; } }
    return +m.toFixed(1) + ' ' + pair;
  };
  const out = {};
  for (const size of [24, 40]) {
    const ms = [1, 2, 3, 4, 5, 6].map((c) => mean(c, size));
    out['mean' + size] = ms.map(hex);
    // drift of each material's mean from its hex (ΔE, and L* difference)
    out['drift' + size] = ms.map((m, i) => {
      const hx = C.hexToRgb(K.LOOKS.pebble.colors[i + 1]);
      const L = (c) => C.deltaE(c, [0, 0, 0]) ? 116 * Math.cbrt(0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2])) - 16 : 0;
      return NAMES[i + 1] + ' dE ' + C.deltaE(m, hx).toFixed(1) + ' dL ' + (L(m) - L(hx)).toFixed(1);
    });
    out['dE' + size] = Object.fromEntries(['normal', 'deutan', 'protan', 'tritan', 'grey'].map((k) => [k, minPair(ms, k === 'normal' ? null : k)]));
  }
  return { W, H, ...out };
};
window.perf = (reps) => {
  const run = async () => {
    const S = await import('/src/render/sprites.ts');
    const T = await import('/src/render/theme.ts');
    const K = await import('/src/render/skins.ts');
    const res = {};
    for (const P of [T.DAY, T.NIGHT]) {
      const ts = [];
      let n = 0;
      for (let r = 0; r < reps; r++) {
        const sc = new S.SpriteCache(3); sc.setLook(K.LOOKS.pebble);
        const sink = new OffscreenCanvas(4, 4).getContext('2d');
        const t0 = performance.now(); n = 0;
        // what Scene.warmSprites builds on a 390 px phone (cell 46, tray cell 25)
        for (let c = 1; c <= 6; c++) for (const [s, nv] of [[46, S.VARIANTS ?? 1], [25, 1]]) for (let v = 0; v < nv; v++)
          for (const st of ['normal', 'lit']) { sink.drawImage(sc.pebble(P, c, s, st, v), 0, 0, 4, 4); n++; }
        sink.getImageData(0, 0, 1, 1);
        ts.push(performance.now() - t0);
      }
      ts.sort((a, b) => a - b);
      res[P.name] = { sprites: n, warmMedianMs: +ts[reps >> 1].toFixed(1), perSpriteMs: +(ts[reps >> 1] / n).toFixed(3) };
    }
    return res;
  };
  return run();
};
`;

const b = await chromium.launch({ args: ['--mute-audio'] });
const result: Record<string, unknown> = { url: base };

/**
 * `--moments`: the blocks in play, through the real game (debug hooks): the lit ring while a piece
 * is held over its spot, then a staged capture on a frozen clock through the ring burst and the
 * celebration (Atoll ×5, a 2-wave cascade, the biggest board), Day and Night →
 * artifacts/blocks/<label>-moments/<theme>-<board>-<ms>.png (board crop).
 */
if (process.argv.includes('--moments')) {
  const { BOARDS, boardString } = await import('../tests/e2e/celebrate-boards.ts');
  const out = `${dir}/${label}-moments`;
  mkdirSync(out, { recursive: true });
  for (const theme of ['light', 'dark'] as const) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: theme });
    const p = await ctx.newPage();
    for (const name of ['atoll', 'cascade', 'biggest'] as const) {
      const s = BOARDS[name]!;
      await p.goto(`${base}/?debug=1&seed=42`);
      await p.waitForFunction(() => (window as any).__atoll);
      await p.evaluate(() => document.fonts.ready);
      await p.evaluate(([bd, t]) => (window as any).__atoll.setup(bd, t), [boardString(s), s.tray] as const);
      if (s.combo) await p.evaluate((n) => (window as any).__atoll.stageCombo(n), s.combo);
      await p.waitForTimeout(900);
      const l = await p.evaluate(() => (window as any).__atoll.layout());
      const clip = { x: 0, y: Math.max(0, l.board.y - 110), width: 390, height: l.board.h + 220 };
      // held over its spot: the ring (and the held cells that will pop) wear the lit outline
      const path = await p.evaluate((m) => (window as any).__atoll.pathFor(m), s.move);
      await p.mouse.move(path.down.x, path.down.y);
      await p.mouse.down();
      await p.mouse.move(path.up.x, path.up.y, { steps: 8 });
      await p.waitForTimeout(350);
      await p.screenshot({ path: `${out}/${theme}-${name}-0000-held.png`, clip });
      await p.mouse.move(path.down.x, path.down.y, { steps: 4 });
      await p.mouse.up();
      await p.waitForTimeout(500);
      await p.evaluate(([bd, t]) => (window as any).__atoll.setup(bd, t), [boardString(s), s.tray] as const);
      if (s.combo) await p.evaluate((n) => (window as any).__atoll.stageCombo(n), s.combo);
      await p.waitForTimeout(700);
      await p.evaluate((m) => {
        const a = (window as any).__atoll;
        a.freezeNow();
        a.commitMove(m);
      }, s.move);
      for (const t of [120, 260, 420, 600, 900]) {
        await p.evaluate((t) => (window as any).__atoll.freeze(t), t);
        for (let i = 0; i < 3; i++) await p.evaluate(() => new Promise(requestAnimationFrame));
        await p.screenshot({ path: `${out}/${theme}-${name}-${String(t).padStart(4, '0')}.png`, clip });
      }
      await p.evaluate(() => (window as any).__atoll.freeze(null));
    }
    await ctx.close();
  }
  await b.close();
  console.log(out);
  process.exit(0);
}
for (const theme of ['day', 'night'] as const) {
  const p = await b.newPage({ deviceScaleFactor: 2 });
  p.on('pageerror', (e) => console.error('pageerror', e));
  // any module URL of the dev server gives us its origin without booting the game
  await p.goto(`${base}/src/render/theme.ts`);
  await p.addScriptTag({ content: PAGE });
  const r = (await p.evaluate(([t]) => (window as any).sheet(t, 2), [theme])) as { W: number; H: number };
  result[theme] = r;
  await p.setViewportSize({ width: r.W, height: r.H });
  await p.locator('canvas').screenshot({ path: `${dir}/${label}-${theme}.png` });
  if (theme === 'day' && !process.argv.includes('--noperf')) {
    result.perf1x = await p.evaluate(() => (window as any).perf(5));
    const cdp = await p.context().newCDPSession(p);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    result.perf4x = await p.evaluate(() => (window as any).perf(5));
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  }
  await p.close();
}
await b.close();
writeFileSync(`${dir}/${label}.json`, JSON.stringify(result, null, 1));
console.log(JSON.stringify(result, null, 1));
