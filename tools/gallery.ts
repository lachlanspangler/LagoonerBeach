// Dev-only creature review pages (served by the dev server, never built). Modes (query string):
//   (none)               every species: OLD vs NEW tiles Day/Night, 24 px, silhouette, locked tile,
//                        every expression, golden, and a live animated idle
//   ?compare[&night]     BEFORE/AFTER sheet for species with new art
//   ?sheet=id,id         full review sheet per species (sizes, themes, expressions, frames, checks)
//   ?film=id&frames=N[&mode=idle|signature|catch|release][&dur=S][&px=P][&night]  filmstrip
//   ?sil                 24 px fill-only silhouettes of every species with new art, by habitat
// scripts/gallery.ts and scripts/art-sheet.ts screenshot these into artifacts/art/.
import { HABITATS, SPECIES, SPECIES_BY_ID, type Species } from '../src/meta/creatures.ts';
import { drawLegacy } from '../src/render/creatures.ts';
import { ART, drawSpecies, renderCreature, type DrawOpts } from '../src/render/art/creature-art.ts';
import { EXPRESSIONS, TILE_FILL, type SpeciesArt } from '../src/render/art/kit.ts';
import { metrics, validateArt } from '../src/render/art/validate.ts';
import { SHARED } from '../src/render/art/palette.ts';
import { DISPLAY_FONT, FONT } from '../src/render/scene.ts';

const q = new URLSearchParams(location.search);
const DAY = { bg: '#F4EDE2', tile: SHARED.dayTile, text: '#3B3229', dim: '#8A7B69' };
const NIGHT = { bg: '#0B1622', tile: SHARED.nightTile, text: '#E8EEF2', dim: '#7F95A6' };
type Theme = typeof DAY;
const DPR = Math.min(3, window.devicePixelRatio || 1);
const root = document.getElementById('c') as HTMLCanvasElement;
const animated: (() => void)[] = [];

function sheet(w: number, h: number, theme: Theme): CanvasRenderingContext2D {
  root.width = Math.ceil(w * DPR);
  root.height = Math.ceil(h * DPR);
  root.style.width = `${w}px`;
  root.style.height = `${h}px`;
  const g = root.getContext('2d')!;
  g.scale(DPR, DPR);
  g.fillStyle = theme.bg;
  g.fillRect(0, 0, w, h);
  document.body.style.background = theme.bg;
  return g;
}
function tile(g: CanvasRenderingContext2D, x: number, y: number, s: number, theme: Theme, r = 0.2): void {
  g.fillStyle = theme.tile;
  g.beginPath();
  g.roundRect(x, y, s, s, s * r);
  g.fill();
}
function label(
  g: CanvasRenderingContext2D,
  t: string,
  x: number,
  y: number,
  theme: Theme,
  size = 11,
  align: CanvasTextAlign = 'center',
  weight = 600,
  display = false,
): void {
  g.fillStyle = theme.text;
  g.font = `${weight} ${size}px ${display ? DISPLAY_FONT : FONT}`;
  g.textAlign = align;
  g.fillText(t, x, y);
}
/** A creature in a tile exactly as the journal draws it (clipped to the rounded tile). */
function inTile(
  g: CanvasRenderingContext2D,
  sp: Species,
  x: number,
  y: number,
  s: number,
  theme: Theme,
  o: DrawOpts,
): void {
  tile(g, x, y, s, theme);
  g.save();
  g.beginPath();
  g.roundRect(x, y, s, s, s * 0.2);
  g.clip();
  const art = ART.get(sp.id);
  if (art) drawSpecies(g, sp, art, x + s / 2, y + s / 2, s, 0, { fit: 'tile', night: theme === NIGHT, ...o });
  else
    drawLegacy(g, sp, x + s / 2, y + s / 2, s * 0.82, 0, {
      silhouette: o.silhouette ? theme.dim : undefined,
      golden: o.golden,
    });
  g.restore();
}
function old(g: CanvasRenderingContext2D, sp: Species, x: number, y: number, s: number, theme: Theme): void {
  tile(g, x, y, s, theme);
  drawLegacy(g, sp, x + s / 2, y + s / 2, s * 0.82, 0, {});
}
/** Draw new art filling `px` (body long side) centred at x,y. */
function art(
  g: CanvasRenderingContext2D,
  a: SpeciesArt,
  x: number,
  y: number,
  px: number,
  theme: Theme,
  o: Partial<Parameters<typeof renderCreature>[4]> = {},
): void {
  renderCreature(g, a, x, y, { size: px, night: theme === NIGHT, ...o });
}

const ready = () => ((window as unknown as { __ready: boolean }).__ready = true);
const newSpecies = () => SPECIES.filter((sp) => ART.has(sp.id));

// ─── overview: every species ──────────────────────────────────────────────────────────────────
function overview(): void {
  const cols = ['old', 'new D', 'new N', '24 D', '24 N', 'sil', 'locked', ...EXPRESSIONS, 'gold', 'live'];
  const T = 54,
    gap = 6,
    nameW = 116,
    rowH = T + gap;
  const W = nameW + cols.length * (T + gap) + gap;
  const H = 30 + SPECIES.length * rowH + gap;
  const g = sheet(W, H, DAY);
  cols.forEach((c, i) => label(g, c, nameW + i * (T + gap) + T / 2, 20, DAY, 10));
  SPECIES.forEach((sp, r) => {
    const y = 30 + r * rowH;
    const a = ART.get(sp.id);
    label(g, sp.name, 8, y + T / 2 + 4, DAY, 12, 'left', 600, true);
    let x = nameW;
    const next = () => ((x += T + gap), x - T - gap);
    old(g, sp, next(), y, T, DAY);
    if (!a) {
      label(g, 'no new art yet', x + 8, y + T / 2 + 4, DAY, 11, 'left', 400);
      return;
    }
    inTile(g, sp, next(), y, T, DAY, {});
    const xn = next();
    g.fillStyle = NIGHT.bg;
    g.fillRect(xn - 3, y - 3, T + 6, T + 6);
    inTile(g, sp, xn, y, T, NIGHT, {});
    const x24 = next();
    tile(g, x24, y, T, DAY);
    art(g, a, x24 + T / 2, y + T / 2, 24, DAY);
    const x24n = next();
    tile(g, x24n, y, T, NIGHT);
    art(g, a, x24n + T / 2, y + T / 2, 24, NIGHT);
    const xs = next();
    tile(g, xs, y, T, DAY);
    art(g, a, xs + T / 2, y + T / 2, 24, DAY, { silhouette: '#3B3229' });
    inTile(g, sp, next(), y, T, DAY, { silhouette: 'x' });
    for (const e of EXPRESSIONS) inTile(g, sp, next(), y, T, DAY, { expression: e });
    inTile(g, sp, next(), y, T, DAY, { golden: true });
    const xl = next();
    animated.push(() => {
      g.fillStyle = DAY.bg;
      g.fillRect(xl - 1, y - 1, T + 2, T + 2);
      inTile(g, sp, xl, y, T, DAY, { t: performance.now() / 1000 });
    });
  });
}

// ─── compare: before / after ──────────────────────────────────────────────────────────────────
function compare(): void {
  const theme = q.has('night') ? NIGHT : DAY;
  const list = newSpecies();
  const T = 96,
    gap = 10,
    per = 4;
  const cellW = T * 2 + gap * 3;
  const rows = Math.max(1, Math.ceil(list.length / per));
  const W = per * cellW + gap,
    H = 40 + rows * (T + 34) + gap;
  const g = sheet(W, H, theme);
  label(
    g,
    `BEFORE → AFTER (${list.length} of ${SPECIES.length} species redrawn) · ${theme === NIGHT ? 'Night' : 'Day'}`,
    12,
    24,
    theme,
    14,
    'left',
    700,
  );
  list.forEach((sp, i) => {
    const x = gap + (i % per) * cellW,
      y = 40 + Math.floor(i / per) * (T + 34);
    tile(g, x, y, T, theme);
    drawLegacy(g, sp, x + T / 2, y + T / 2, T * 0.82, 0, {});
    inTile(g, sp, x + T + gap, y, T, theme, {});
    label(g, `${sp.name}`, x + T + gap / 2, y + T + 18, theme, 14, 'center', 600, true);
  });
}

// ─── silhouettes ──────────────────────────────────────────────────────────────────────────────
function silhouettes(): void {
  const list = newSpecies();
  const T = 40,
    gap = 8;
  const W = 900;
  const g = sheet(W, 60 + HABITATS.length * (T + 34), DAY);
  label(g, '24 px fill-only silhouettes (R12) — name each one', 12, 24, DAY, 14, 'left', 700);
  HABITATS.forEach((h, r) => {
    const y = 44 + r * (T + 34);
    label(g, h.name, 12, y + T / 2 + 4, DAY, 12, 'left');
    list
      .filter((sp) => sp.habitat === h.id)
      .forEach((sp, i) => {
        const x = 120 + i * (T + gap);
        tile(g, x, y, T, DAY);
        art(g, ART.get(sp.id)!, x + T / 2, y + T / 2, 24, DAY, { silhouette: '#3B3229' });
        label(g, sp.id, x + T / 2, y + T + 12, DAY, 9, 'center', 400);
      });
  });
}

// ─── filmstrip ────────────────────────────────────────────────────────────────────────────────
function film(id: string): void {
  const sp = SPECIES_BY_ID.get(id)!;
  const a = ART.get(id);
  const theme = q.has('night') ? NIGHT : DAY;
  const n = +(q.get('frames') ?? 10);
  const mode = q.get('mode') ?? 'idle';
  const px = +(q.get('px') ?? 96);
  const dur = +(q.get('dur') ?? (mode === 'idle' ? 3 : (a?.idle.signature.dur ?? 1)));
  const T = Math.round(px / TILE_FILL.M);
  const W = n * (T + 6) + 6,
    H = T + 30;
  const g = sheet(W, H, theme);
  for (let i = 0; i < n; i++) {
    const x = 6 + i * (T + 6);
    tile(g, x, 6, T, theme);
    if (!a) continue;
    const u = n > 1 ? i / (n - 1) : 0;
    const o =
      mode === 'idle'
        ? { t: 1 + u * dur }
        : mode === 'signature'
          ? { t: 0.001, signatureAt: u }
          : { action: { kind: mode as 'catch' | 'release', u } };
    art(g, a, x + T / 2, 6 + T / 2, px, theme, o);
    label(
      g,
      mode === 'idle' ? `${(u * dur).toFixed(2)}s` : `u ${u.toFixed(2)}`,
      x + T / 2,
      T + 22,
      theme,
      10,
      'center',
      400,
    );
  }
  void sp;
}

// ─── per-species review sheet ─────────────────────────────────────────────────────────────────
function speciesSheet(ids: string[]): void {
  const W = 1180;
  const per = 900;
  const g = sheet(W, per * ids.length, DAY);
  ids.forEach((id, k) => {
    const sp = SPECIES_BY_ID.get(id);
    const a = ART.get(id);
    const y0 = k * per;
    if (k) {
      g.fillStyle = '#D2C2AA';
      g.fillRect(0, y0, W, 2);
    }
    if (!sp || !a) {
      label(g, `${id}: no new art`, 20, y0 + 30, DAY, 16, 'left', 700);
      return;
    }
    const m = metrics(a);
    const issues = validateArt(a, sp);
    label(g, `${sp.name}  ·  ${a.size} · ${a.klass} · ${sp.rarity}`, 16, y0 + 28, DAY, 22, 'left', 900, true);
    label(g, `${a.personality.join(', ')} — feature: ${a.feature}`, 16, y0 + 46, DAY, 12, 'left', 400);
    label(
      g,
      `parts ${m.fillParts} fill / ${m.allParts} total · max segs ${m.maxSegments} · box ${m.box.w.toFixed(0)}×${m.box.h.toFixed(0)} · body L ${m.bodyL.toFixed(2)} C ${m.bodyC.toFixed(2)} · ink/Day ΔL ${m.inkDayDL.toFixed(2)} · Night ΔL ${m.nightDL.toFixed(2)}`,
      16,
      y0 + 64,
      DAY,
      11,
      'left',
      400,
    );
    g.fillStyle = issues.length ? '#C0392B' : '#2E8B57';
    g.font = `700 12px ${FONT}`;
    g.textAlign = 'left';
    g.fillText(
      issues.length ? `✗ ${issues.map((i) => `${i.rule}: ${i.msg}`).join(' · ')}` : '✓ style-guide checks pass',
      16,
      y0 + 82,
    );

    // hero: detail size Day / Night / golden / locked Day / locked Night / old
    const H = 160,
      gap = 12;
    let x = 16;
    const y1 = y0 + 96;
    const hero = (t: Theme, o: DrawOpts, cap: string) => {
      if (t === NIGHT) {
        g.fillStyle = NIGHT.bg;
        g.fillRect(x - gap / 2, y1 - 6, H + gap, H + 26);
      }
      tile(g, x, y1, H, t, 0.12);
      g.save();
      g.beginPath();
      g.roundRect(x, y1, H, H, H * 0.12);
      g.clip();
      drawSpecies(g, sp, a, x + H / 2, y1 + H / 2, H, 0, { fit: 'detail', night: t === NIGHT, ...o });
      g.restore();
      label(g, cap, x + H / 2, y1 + H + 14, t, 11);
      x += H + gap;
    };
    hero(DAY, {}, 'detail · Day');
    hero(NIGHT, {}, 'detail · Night');
    hero(DAY, { golden: true, expression: 'proud' }, 'golden · proud');
    hero(DAY, { silhouette: 'x' }, 'locked · Day');
    hero(NIGHT, { silhouette: 'x' }, 'locked · Night');
    tile(g, x, y1, H, DAY, 0.12);
    drawLegacy(g, sp, x + H / 2, y1 + H / 2, H * 0.82, 0, {});
    label(g, 'before', x + H / 2, y1 + H + 14, DAY, 11);

    // expressions (Day) at 84, then (Night) at 54
    const y2 = y1 + H + 30;
    const E = 84;
    EXPRESSIONS.forEach((e, i) => {
      const ex = 16 + i * (E + 8);
      tile(g, ex, y2, E, DAY);
      art(g, a, ex + E / 2, y2 + E / 2, E * 0.62, DAY, { expression: e });
      label(g, e, ex + E / 2, y2 + E + 13, DAY, 10);
    });
    const xr = 16 + 7 * (E + 8) + 8;
    g.fillStyle = NIGHT.bg;
    g.fillRect(xr - 6, y2 - 6, W - xr, E + 24);
    EXPRESSIONS.forEach((e, i) => {
      const ex = xr + i * 58;
      tile(g, ex, y2 + 15, 54, NIGHT);
      art(g, a, ex + 27, y2 + 42, 54 * 0.62, NIGHT, { expression: e });
    });

    // in-game sizes: journal tiles (with size-class fill) and raw sizes 24–64, Day + Night
    const y3 = y2 + E + 26;
    label(
      g,
      'journal tile 54 · new D / N · 24 32 48 64 px · 24 px silhouette · lineup with the redrawn cast',
      16,
      y3 + 10,
      DAY,
      11,
      'left',
      600,
    );
    let x3 = 16;
    const y3b = y3 + 18;
    inTile(g, sp, x3, y3b, 54, DAY, {});
    x3 += 60;
    g.fillStyle = NIGHT.bg;
    g.fillRect(x3 - 3, y3b - 3, 60, 60);
    inTile(g, sp, x3, y3b, 54, NIGHT, {});
    x3 += 66;
    for (const px of [24, 32, 48, 64]) {
      tile(g, x3, y3b, Math.max(54, px + 14), DAY);
      art(g, a, x3 + Math.max(54, px + 14) / 2, y3b + Math.max(54, px + 14) / 2, px, DAY);
      x3 += Math.max(54, px + 14) + 6;
    }
    for (const px of [24, 32]) {
      g.fillStyle = NIGHT.bg;
      g.fillRect(x3 - 3, y3b - 3, 60, 60);
      tile(g, x3, y3b, 54, NIGHT);
      art(g, a, x3 + 27, y3b + 27, px, NIGHT);
      x3 += 60;
    }
    tile(g, x3 + 6, y3b, 54, DAY);
    art(g, a, x3 + 33, y3b + 27, 24, DAY, { silhouette: '#3B3229' });
    x3 += 70;
    for (const other of newSpecies()) {
      if (x3 > W - 60) break;
      inTile(g, other, x3, y3b, 54, DAY, {});
      x3 += 58;
    }

    // frames: ambient idle (10 over 3 s), signature (8), catch (5), release (5)
    const y4 = y3b + 78;
    const F = 86;
    const strip = (
      yy: number,
      n: number,
      cap: string,
      at: (u: number) => Partial<Parameters<typeof renderCreature>[4]>,
    ) => {
      label(g, cap, 16, yy + 10, DAY, 11, 'left', 600);
      for (let i = 0; i < n; i++) {
        const fx = 16 + i * (F + 6);
        tile(g, fx, yy + 16, F, DAY);
        art(g, a, fx + F / 2, yy + 16 + F / 2, F * 0.6, DAY, at(n > 1 ? i / (n - 1) : 0));
      }
    };
    strip(y4, 12, 'ambient idle · 12 frames over 3 s (tempo scaled by size class)', (u) => ({
      t: 1.6 + u * 3,
      noSignature: true,
    }));
    strip(y4 + F + 26, 12, `signature idle · ${a.idle.signature.dur}s`, (u) => ({ t: 0.001, signatureAt: u }));
    const y5 = y4 + 2 * (F + 26);
    label(g, 'catch hook (leap apex) · release hook', 16, y5 + 10, DAY, 11, 'left', 600);
    for (let i = 0; i < 6; i++) {
      const fx = 16 + i * (F + 6);
      tile(g, fx, y5 + 16, F, DAY);
      art(g, a, fx + F / 2, y5 + 16 + F / 2, F * 0.6, DAY, { action: { kind: 'catch', u: i / 5 } });
      const rx = 16 + (i + 6) * (F + 6);
      tile(g, rx, y5 + 16, F, DAY);
      art(g, a, rx + F / 2, y5 + 16 + F / 2, F * 0.6, DAY, { action: { kind: 'release', u: i / 5 } });
    }
  });
}

await Promise.all(
  ['600 12px "Lagoon Display"', '900 12px "Lagoon Display"', '400 12px "Lagoon UI"'].map((f) => document.fonts.load(f)),
);
const mode = q.has('sheet')
  ? 'sheet'
  : q.has('film')
    ? 'film'
    : q.has('compare')
      ? 'compare'
      : q.has('sil')
        ? 'sil'
        : 'all';
if (mode === 'sheet') speciesSheet((q.get('sheet') || [...ART.keys()].join(',')).split(',').filter(Boolean));
else if (mode === 'film') film(q.get('film')!);
else if (mode === 'compare') compare();
else if (mode === 'sil') silhouettes();
else overview();
ready();
if (animated.length && !q.has('static')) {
  const tick = () => {
    for (const f of animated) f();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
