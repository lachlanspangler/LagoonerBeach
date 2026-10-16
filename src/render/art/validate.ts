/**
 * Machine-checkable parts of the Creature Style Guide (docs/research/CREATURE_ART.md §3). Pure.
 * Used by tests/unit/art.test.ts and shown on the review sheets. A rule can be waived per species
 * with `deviations: { R7: 'one-line reason' }` — the reason is the review trail the guide asks for.
 */
import type { Species } from '../../meta/creatures.ts';
import { sizeClassFor, type SpeciesArt } from './kit.ts';
import { boundsOf, flatten, parsePath, unionBox, type Box } from './path.ts';
import { blend, deriveInk, hueDelta, oklch, rimAlpha, SHARED } from './palette.ts';

export interface Issue {
  readonly rule: string;
  readonly msg: string;
}

/** Budgets (R2, R35). Fill parts are silhouette primitives; pattern/line details have their own budget. */
export const BUDGET = { fillParts: 12, allParts: 24, segments: 24, groups: 6, artboard: 50, bodyBox: 84 } as const;

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
}

export function metrics(art: SpeciesArt): Metrics {
  let fillParts = 0,
    allParts = 0,
    maxSegments = 0;
  let box: Box = { x: 0, y: 0, w: 0, h: 0 };
  let all = box;
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
        if (!p.extra) box = unionBox(box, b);
      }
    }
  const [L, C] = oklch(art.palette.body);
  const ink = deriveInk(art.palette.body);
  const dayL = oklch(SHARED.dayTile)[0];
  const nightL = oklch(SHARED.nightTile)[0];
  const rimL = oklch(blend(SHARED.nightTile, SHARED.rim, rimAlpha(art.palette.body)))[0];
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
  };
}

export function validateArt(art: SpeciesArt, sp?: Species): Issue[] {
  const out: Issue[] = [];
  const dev = art.deviations ?? {};
  const bad = (rule: string, msg: string) => {
    if (!dev[rule]) out.push({ rule, msg });
  };
  let m: Metrics;
  try {
    m = metrics(art);
  } catch (e) {
    return [{ rule: 'R2', msg: `path data does not parse: ${(e as Error).message}` }];
  }
  const ids = new Set(art.groups.map((g) => g.id));

  // identity & spec completeness
  if (sp && sp.id !== art.id) bad('id', `art id ${art.id} ≠ species ${sp.id}`);
  if (!art.feature.trim()) bad('R10', 'signature feature (R10) is empty');
  if (art.personality.length !== 3 || art.personality.some((w) => !w.trim())) bad('R10', 'personality needs 3 words');
  if (sp && art.size !== sizeClassFor(sp.size))
    bad('R27', `size class ${art.size} ≠ ${sizeClassFor(sp.size)} from the size range (add a deviation if deliberate)`);

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

  // palette (R16)
  const pal = art.palette;
  if (m.bodyL < 0.55 - 1e-3 || m.bodyL > 0.9 + 1e-3) bad('R16', `body lightness ${r2(m.bodyL)} outside 0.55–0.90`);
  if (m.bodyC < 0.03 - 1e-3 || m.bodyC > 0.18 + 1e-3) bad('R16', `body chroma ${r2(m.bodyC)} outside 0.03–0.18`);
  if (pal.accent) {
    const [la, ca, ha] = oklch(pal.accent);
    const dL = Math.abs(la - m.bodyL);
    const dH = ca > 0.02 && m.bodyC > 0.02 ? hueDelta(ha, oklch(pal.body)[2]) : 0;
    if (dL < 0.15 && dH < 60) bad('R16', `accent too close to body (ΔL ${r2(dL)}, Δhue ${Math.round(dH)}°)`);
  }
  if (m.inkDayDL < 0.45) bad('R16', `ink vs Day tile ΔL ${r2(m.inkDayDL)} < 0.45`);
  if (m.nightDL < 0.3) bad('R16', `body/rim vs Night tile ΔL ${r2(m.nightDL)} < 0.30`);

  // face (R6–R8)
  const f = art.face;
  if (!f.eyes.length || f.eye <= 0) bad('R6', 'no eyes: every species has a face');
  if (f.g && !ids.has(f.g)) bad('R20', `face group "${f.g}" does not exist`);
  const [zx, zy, zw, zh] = f.zone;
  const ratio = f.eye / zh;
  if (ratio < 0.14 - 1e-3 || ratio > 0.24 + 1e-3)
    bad('R7', `eye height ${r2(ratio * 100)} % of the face zone (14–24 %)`);
  for (const [ex, ey] of f.eyes) {
    if (ex < zx || ex > zx + zw || ey < zy || ey > zy + zh) bad('R7', `eye (${ex},${ey}) outside the face zone`);
    const pos = (ey - zy) / zh;
    if (pos < 0.52 || pos > 0.65) bad('R7', `eye at ${Math.round(pos * 100)} % of face-zone height (55–62 %, low-set)`);
  }
  const ew = f.eye * 0.85;
  if (f.eyes.length === 1) {
    const back = (m.box.x + m.box.w - f.eyes[0]![0]) / m.box.w;
    if (back < 0.27 || back > 0.41) bad('R7', `profile eye ${Math.round(back * 100)} % back from the snout (30–38 %)`);
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
  ];
  for (const r of refs) if (r && r !== 'root' && !ids.has(r)) bad('R20', `motion refers to unknown group "${r}"`);
  return out;
}
