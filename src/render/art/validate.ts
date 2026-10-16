/**
 * Machine-checkable parts of the Creature Style Guide (docs/research/CREATURE_ART.md §3) and of the
 * art director's CRITIQUE-1 (docs/art/CRITIQUE-1.md). Pure. Used by tests/unit/art.test.ts, the lint
 * report (docs/art/LINT.md, `npm run art:lint`) and the review sheets.
 *
 * Levels: `error` fails `make check`. `warn` is listed in LINT.md; it fails only in strict mode
 * (`LINT_AS_ERRORS` below, or `ART_LINT_STRICT=1` in tests). Every CRITIQUE-1 rule starts as a
 * warning; the lead flips them to errors after the fleet's redo.
 *
 * A rule can be waived per species with `deviations: { R7: 'one-line reason' }`. Family keys waive a
 * group of checks (`R16` waives R16L/R16C/R16A), but the contrast checks (`R16K`) are only waived by
 * name, so a dark-identity deviation never hides a contrast failure.
 */
import type { Species } from '../../meta/creatures.ts';
import {
  defaultEye,
  eyeFloorUnits,
  FRAME_BREAK,
  sizeClassFor,
  TILE_BLEED,
  TILE_FILL,
  TILE_PX,
  type SpeciesArt,
} from './kit.ts';
import { boundsOf, flatten, parsePath, polyArea, unionBox, type Box, type Poly } from './path.ts';
import { blend, deriveBelly, deriveInk, hueDelta, oklch, rimAlpha, SHARED } from './palette.ts';
import { restTilt } from './silhouette.ts';

export type Level = 'error' | 'warn';
export interface Issue {
  readonly rule: string;
  readonly msg: string;
  readonly level: Level;
}

/** Flip to `true` (or run tests with ART_LINT_STRICT=1) to make every warning an error. */
export const LINT_AS_ERRORS = false;
export const failing = (issues: readonly Issue[], strict = LINT_AS_ERRORS) =>
  issues.filter((i) => i.level === 'error' || strict);

/** Budgets (R2, R35). Fill parts are silhouette primitives; pattern/line details have their own budget. */
export const BUDGET = { fillParts: 12, allParts: 24, segments: 24, groups: 6, artboard: 50, bodyBox: 84 } as const;
/** CRITIQUE-1 thresholds. */
export const LINT = {
  tiltMax: 10,
  chromaMin: 0.08,
  patternStripMin: 4,
  patternDotMin: 6,
  lineMin: 3,
  eyeNear: 1.5,
  mintDE: 0.1,
} as const;
/** The real journal tile surface for found species (`.j-tile.got`: water 16 % over the panel). */
export const MINT = { day: '#E5F2EF', night: '#183D50' } as const;

const r2 = (n: number) => Math.round(n * 100) / 100;

export interface Metrics {
  readonly fillParts: number;
  readonly allParts: number;
  readonly maxSegments: number;
  readonly box: Box;
  readonly all: Box;
  readonly bodyL: number;
  readonly bodyC: number;
  readonly inkDayDL: number;
  readonly nightDL: number;
  readonly tilt: number;
  /** Authored (or default) eye height and the absolute floor, units. */
  readonly eye: number;
  readonly eyeFloor: number;
  /** XL frame-break past the 54 px art box at the tile fill, CSS px (max over the 4 sides). */
  readonly overhang: number;
}

export function metrics(art: SpeciesArt): Metrics {
  let fillParts = 0,
    allParts = 0,
    maxSegments = 0;
  let box: Box = { x: 0, y: 0, w: 0, h: 0 };
  let all = box;
  let drawn = box; // non-prop fills incl. extras: what the tile shows
  for (const g of art.groups)
    for (const p of g.parts) {
      allParts++;
      const parsed = parsePath(p.d);
      maxSegments = Math.max(maxSegments, parsed.maxSubpath);
      const b = boundsOf(flatten(parsed, 8));
      // patterns and lines are clipped to the fills, so only fills can leave the artboard
      if ((p.kind ?? 'fill') === 'fill') all = unionBox(all, b);
      if ((p.kind ?? 'fill') === 'fill' && !g.prop) {
        fillParts++;
        drawn = unionBox(drawn, b);
        if (!p.extra && p.outline !== false) box = unionBox(box, b);
      }
    }
  const [L, C] = oklch(art.palette.body);
  const ink = deriveInk(art.palette.body);
  const dayL = oklch(SHARED.dayTile)[0];
  const nightL = oklch(SHARED.nightTile)[0];
  const rimL = oklch(blend(SHARED.nightTile, SHARED.rim, rimAlpha(art.palette.body)))[0];
  const long = Math.max(box.w, box.h) || 1;
  const ppu = (TILE_FILL[art.size] * TILE_PX) / long;
  const cx = box.x + box.w / 2,
    cy = box.y + box.h / 2,
    half = TILE_PX / 2;
  const overhang = Math.max(
    (cx - drawn.x) * ppu - half,
    (drawn.x + drawn.w - cx) * ppu - half,
    (cy - drawn.y) * ppu - half,
    (drawn.y + drawn.h - cy) * ppu - half,
  );
  return {
    fillParts,
    allParts,
    maxSegments,
    box,
    all,
    bodyL: L,
    bodyC: C,
    inkDayDL: dayL - oklch(ink)[0],
    nightDL: Math.max(L, rimL) - nightL,
    tilt: restTilt(art),
    eye: art.face.eye ?? defaultEye(art.klass, art.face),
    eyeFloor: eyeFloorUnits(art.size, long, box.h),
    overhang,
  };
}

/** OKLab distance between two colours. */
function okDist(a: string, b: string): number {
  const lab = (h: string) => {
    const [L, C, H] = oklch(h);
    return [L, C * Math.cos((H * Math.PI) / 180), C * Math.sin((H * Math.PI) / 180)] as const;
  };
  const [p, q] = [lab(a), lab(b)];
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

/** Per subpath: a roundish dot's diameter, or a strip's mean width (2A/P). */
function featureSizes(polys: readonly Poly[]): { dot: boolean; size: number }[] {
  return polys.map((p) => {
    const A = Math.abs(polyArea(p));
    let P = 0;
    for (let i = 0; i < p.length; i += 2) {
      const j = (i + 2) % p.length;
      P += Math.hypot(p[j]! - p[i]!, p[j + 1]! - p[i + 1]!);
    }
    const round = (P * P) / (4 * Math.PI * Math.max(A, 1e-9)) < 1.5;
    return round ? { dot: true, size: 2 * Math.sqrt(A / Math.PI) } : { dot: false, size: (2 * A) / Math.max(P, 1e-9) };
  });
}

export function validateArt(art: SpeciesArt, sp?: Species): Issue[] {
  const out: Issue[] = [];
  const dev = art.deviations ?? {};
  const issue = (level: Level) => (rule: string, msg: string, family?: string) => {
    if (!dev[rule] && !(family && dev[family])) out.push({ rule, msg, level });
  };
  const bad = issue('error');
  const warn = issue('warn');
  let m: Metrics;
  try {
    m = metrics(art);
  } catch (e) {
    return [{ rule: 'R2', msg: `path data does not parse: ${(e as Error).message}`, level: 'error' }];
  }
  const ids = new Set(art.groups.map((g) => g.id));

  // identity & spec completeness
  if (sp && sp.id !== art.id) bad('id', `art id ${art.id} ≠ species ${sp.id}`);
  if (!art.feature.trim()) bad('R10', 'signature feature (R10) is empty');
  if (art.personality.length !== 3 || art.personality.some((w) => !w.trim())) bad('R10', 'personality needs 3 words');
  if (sp && art.size !== sizeClassFor(sp.size))
    bad('R27', `size class ${art.size} ≠ ${sizeClassFor(sp.size)} from the size range (add a deviation if deliberate)`);
  if (art.restExpression === 'sleepy') bad('R32', 'restExpression "sleepy" is the theme rule’s job, not a rest face');

  // construction
  if (!ids.has('body')) bad('R35', 'a group named "body" is required');
  if (art.groups.length > BUDGET.groups) bad('R35', `${art.groups.length} groups > ${BUDGET.groups} cached layers`);
  if (m.fillParts > BUDGET.fillParts) bad('R2', `${m.fillParts} fill parts > ${BUDGET.fillParts}`);
  if (m.allParts > BUDGET.allParts) bad('R2', `${m.allParts} parts > ${BUDGET.allParts} (fills + patterns + lines)`);
  if (m.maxSegments > BUDGET.segments) bad('R2', `a path has ${m.maxSegments} segments > ${BUDGET.segments}`);
  const A = BUDGET.artboard;
  if (m.all.x < -A || m.all.y < -A || m.all.x + m.all.w > A || m.all.y + m.all.h > A)
    bad('R1', `drawing leaves the 100-unit artboard (${r2(m.all.x)},${r2(m.all.y)} ${r2(m.all.w)}×${r2(m.all.h)})`);
  if (m.box.w > BUDGET.bodyBox + 0.5 || m.box.h > BUDGET.bodyBox + 0.5)
    bad('R1', `body box ${r2(m.box.w)}×${r2(m.box.h)} exceeds 84×84`);
  if (Math.max(m.box.w, m.box.h) < 60)
    bad('R1', `body box ${r2(m.box.w)}×${r2(m.box.h)}: draw "full" (long side ≥ 60)`);

  // palette (R16). Lightness: the guide's 0.55–0.90, or down to 0.45 for dark-identity species with a note.
  const pal = art.palette;
  if (m.bodyL < 0.45 - 1e-3) bad('R16L', `body lightness ${r2(m.bodyL)} < 0.45 (the floor even for dark identities)`);
  else if (m.bodyL < 0.55 - 1e-3 || m.bodyL > 0.9 + 1e-3)
    bad('R16L', `body lightness ${r2(m.bodyL)} outside 0.55–0.90 (0.45+ needs a deviation note)`, 'R16');
  if (m.bodyC < 0.03 - 1e-3 || m.bodyC > 0.18 + 1e-3)
    bad('R16C', `body chroma ${r2(m.bodyC)} outside 0.03–0.18`, 'R16');
  if (pal.accent) {
    const [la, ca, ha] = oklch(pal.accent);
    const dL = Math.abs(la - m.bodyL);
    const dH = ca > 0.02 && m.bodyC > 0.02 ? hueDelta(ha, oklch(pal.body)[2]) : 0;
    if (dL < 0.15 && dH < 60) bad('R16A', `accent too close to body (ΔL ${r2(dL)}, Δhue ${Math.round(dH)}°)`, 'R16');
  }
  if (m.inkDayDL < 0.45) bad('R16K', `ink vs Day tile ΔL ${r2(m.inkDayDL)} < 0.45`);
  if (m.nightDL < 0.3) bad('R16K', `body/rim vs Night tile ΔL ${r2(m.nightDL)} < 0.30`);

  // face (R6–R8)
  const f = art.face;
  if (!f.eyes.length || !(m.eye > 0)) bad('R6', 'no eyes: every species has a face');
  if (f.g && !ids.has(f.g)) bad('R20', `face group "${f.g}" does not exist`);
  if (art.restExpression && !['idle', 'drowsy', 'proud', 'shy'].includes(art.restExpression))
    bad('R19', `restExpression "${art.restExpression}" (use idle, drowsy, proud or shy)`);
  const [zx, zy, zw, zh] = f.zone;
  const ratio = m.eye / zh;
  // the absolute floor (CRITIQUE-1 #2) outranks R7's 24 % cap: small heads may need bigger eyes
  if (ratio < 0.14 - 1e-3 || (ratio > 0.24 + 1e-3 && m.eye > m.eyeFloor * 1.1))
    bad('R7', `eye height ${r2(ratio * 100)} % of the face zone (14–24 %, or up to the absolute floor)`);
  for (const [ex, ey] of f.eyes) {
    if (ex < zx || ex > zx + zw || ey < zy || ey > zy + zh) bad('R7', `eye (${ex},${ey}) outside the face zone`);
    const pos = (ey - zy) / zh;
    if (pos < 0.52 || pos > 0.65) bad('R7', `eye at ${Math.round(pos * 100)} % of face-zone height (55–62 %, low-set)`);
  }
  const ew = m.eye * 0.85;
  const profile = f.eyes.length === 1 || !!f.profile;
  if (f.eyes.length === 1) {
    const back = (m.box.x + m.box.w - f.eyes[0]![0]) / m.box.w;
    if (back < 0.27 || back > 0.41) bad('R7', `profile eye ${Math.round(back * 100)} % back from the snout (30–38 %)`);
  }
  if (profile) {
    if (f.mouth.w > 0.9 * ew + 1e-6) bad('R8', `mouth ${f.mouth.w} wider than 0.9 × eye width (${r2(0.9 * ew)})`);
  } else if (f.eyes.length === 2) {
    const sp2 = Math.abs(f.eyes[1]![0] - f.eyes[0]![0]) / ew;
    if (sp2 < 1.6 - 1e-3 || sp2 > 2.2 + 1e-3) bad('R7', `eyes ${r2(sp2)} eye-widths apart (1.6–2.2)`);
    if (f.mouth.w > 0.5 * sp2 * ew + 1e-6) bad('R8', 'mouth wider than 0.5 × eye spacing');
  }

  // motion (R22–R24)
  if (!art.idle.ambient.length) bad('R22', 'no ambient idle');
  const sig = art.idle.signature;
  if (!sig.tracks.length) bad('R22', 'no signature idle');
  if (sig.dur < 0.6 - 1e-6 || sig.dur > 1.5 + 1e-6) bad('R23', `signature lasts ${sig.dur} s (0.6–1.5 s)`);
  if (sig.every && (sig.every[0] < 4 || sig.every[1] > 8)) bad('R23', 'signature interval outside 4–8 s');
  const refs = [
    ...art.idle.ambient.flatMap((c) => (c.g === undefined ? [] : typeof c.g === 'string' ? [c.g] : c.g)),
    ...[sig, art.catch, art.release].flatMap((mo) => mo?.tracks.map((t) => t.g) ?? []),
    ...(art.leap?.hide ?? []),
  ];
  for (const r of refs) if (r && r !== 'root' && !ids.has(r)) bad('R20', `motion refers to unknown group "${r}"`);
  for (const g of art.groups)
    for (const p of g.parts)
      if (p.cycle && p.cycle.length < 2) bad('R18', `a cycling part in "${g.id}" needs ≥ 2 colours`);

  // ── CRITIQUE-1 lints (warnings until the fleet redo) ─────────────────────────────────────────
  // #2 absolute eye floor
  if (m.eye + 1e-6 < m.eyeFloor && f.eyeFloor !== false)
    warn(
      'R7F',
      `eye ${r2(m.eye)} u < floor ${r2(m.eyeFloor)} u (4 px in the 54 px tile / 9 % of box height); the renderer raises it, author it`,
    );
  // #3 tilt at rest
  if (['fish', 'shark', 'horse', 'long'].includes(art.klass) && m.tilt > LINT.tiltMax)
    warn('R5T', `body tilts ${Math.round(m.tilt)}° at rest (≤ ${LINT.tiltMax}°; signatures may tilt)`);
  // #4 frame-break (XL must break the 54 px art box by 2–4 px; nobody else may be clipped by the bleed)
  if (art.size === 'XL' && (m.overhang < FRAME_BREAK[0] - 0.25 || m.overhang > FRAME_BREAK[1] + 0.25))
    warn('R28', `XL frame-break ${r2(m.overhang)} px past the art box (needs ${FRAME_BREAK[0]}–${FRAME_BREAK[1]} px)`);
  if (art.size !== 'XXL' && m.overhang > TILE_BLEED)
    warn('R28', `${r2(m.overhang)} px past the art box: clipped by the ${TILE_BLEED} px tile bleed`);
  // #5 patterns: eye-coloured patterns near the eye, hairlines, chroma floor
  const eyeL = oklch(SHARED.eye)[0];
  const colorOf = (role: string): string => {
    const belly = pal.belly ?? deriveBelly(pal.body);
    const accent = pal.accent ?? belly;
    return (
      { body: pal.body, belly, accent, ink: deriveInk(pal.body), white: '#FFFFFF', light: accent } as Record<
        string,
        string
      >
    )[role]!;
  };
  for (const g of art.groups)
    for (const p of g.parts) {
      const kind = p.kind ?? 'fill';
      if (kind === 'line' && (p.w ?? 0) < LINT.lineMin && (p.alpha ?? 1) >= 0.5)
        warn('R2L', `"${g.id}" line ${p.w ?? 'default'} u wide (detail lines ≥ ${LINT.lineMin} u)`);
      if (kind !== 'pattern') continue;
      const polys = flatten(p.d, 10);
      for (const fs of featureSizes(polys)) {
        if (fs.dot && fs.size < LINT.patternDotMin - 0.1) {
          warn('R18W', `"${g.id}" ${p.role} dot ${r2(fs.size)} u across (≥ ${LINT.patternDotMin} u)`);
          break;
        }
        if (!fs.dot && fs.size < LINT.patternStripMin - 0.1) {
          warn('R18W', `"${g.id}" ${p.role} stroke ${r2(fs.size)} u wide (≥ ${LINT.patternStripMin} u)`);
          break;
        }
      }
      const col = p.cycle?.[0] ?? colorOf(p.role);
      if ((p.alpha ?? 1) < 0.5 || Math.abs(oklch(col)[0] - eyeL) > 0.15) continue;
      if (g.id !== (f.g ?? 'body')) continue;
      const near = f.eyes.some(([ex, ey]) =>
        polys.some((q) => {
          for (let i = 0; i < q.length; i += 2)
            if (Math.hypot(q[i]! - ex, q[i + 1]! - ey) < LINT.eyeNear * ew) return true;
          return false;
        }),
      );
      if (near)
        warn('R18E', `"${g.id}" ${p.role} pattern is eye-coloured and within ${LINT.eyeNear} eye-widths of an eye`);
    }
  if (m.bodyC < LINT.chromaMin)
    warn('R16S', `body chroma ${r2(m.bodyC)} < ${LINT.chromaMin}: sinks into sand/mint on Day`);
  // the real journal tile (mint) — CRITIQUE-1: some species only fail there
  for (const [theme, mint] of Object.entries(MINT))
    if (okDist(pal.body, mint) < LINT.mintDE)
      warn(
        'R16M',
        `body ΔE ${r2(okDist(pal.body, mint))} from the ${theme} journal tile (mint ${mint}) < ${LINT.mintDE}`,
      );
  return out;
}
