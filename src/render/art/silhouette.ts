/**
 * R12 silhouette test, Canvas-free: each species' fill-only mask with its body box scaled to 24 px,
 * aligned on its centroid, compared pairwise by soft IoU. The same numbers are re-measured with real
 * Path2D rendering in tests/e2e/art.spec.ts (Chromium + WebKit).
 */
import { bodyClassOf, type SpeciesArt } from './kit.ts';
import { boundsOf, flatten, rasterize, iou, unionBox, type Box, type Poly } from './path.ts';

export const SIL_PX = 24;
export const SIL_GRID = 48;
/** R12 thresholds. */
export const IOU_MAX = 0.8;
export const IOU_MAX_SAME_CLASS = 0.7;

export function silhouetteShapes(art: SpeciesArt): { shapes: Poly[][]; box: Box } {
  const shapes: Poly[][] = [];
  let box: Box = { x: 0, y: 0, w: 0, h: 0 };
  for (const g of art.groups) {
    if (g.prop) continue;
    for (const p of g.parts) {
      if ((p.kind ?? 'fill') !== 'fill' || p.outline === false) continue; // glow halos aren't silhouette
      const polys = flatten(p.d, 10);
      shapes.push(polys);
      if (!p.extra) box = unionBox(box, boundsOf(polys));
    }
  }
  return { shapes, box };
}

/** Coverage mask (SIL_GRID² px, 1 px cells) centred on the silhouette's centroid. */
export function silhouetteMask(art: SpeciesArt): Float32Array {
  const { shapes, box } = silhouetteShapes(art);
  const cell = Math.max(box.w, box.h) / SIL_PX; // units per px
  const half = (SIL_GRID / 2) * cell;
  const coarse = rasterize(shapes, box.x + box.w / 2 - half, box.y + box.h / 2 - half, cell, SIL_GRID, 2);
  let sx = 0,
    sy = 0,
    s = 0;
  for (let r = 0; r < SIL_GRID; r++)
    for (let c = 0; c < SIL_GRID; c++) {
      const v = coarse[r * SIL_GRID + c]!;
      sx += v * (c + 0.5);
      sy += v * (r + 0.5);
      s += v;
    }
  const cx = box.x + box.w / 2 - half + (sx / s) * cell;
  const cy = box.y + box.h / 2 - half + (sy / s) * cell;
  return rasterize(shapes, cx - half, cy - half, cell, SIL_GRID, 3);
}

/**
 * Rest-pose tilt (CRITIQUE-1 #3): principal axis of the `body` group's fill mask, in degrees away
 * from the nearest of horizontal/vertical (level fish and upright seahorses both measure ~0).
 * Returns 0 for near-round bodies (axis ratio < 1.3), where tilt isn't visible.
 */
export function restTilt(art: SpeciesArt): number {
  const body = art.groups.find((g) => g.id === 'body');
  if (!body) return 0;
  const shapes = body.parts
    .filter((p) => (p.kind ?? 'fill') === 'fill' && !p.extra && p.outline !== false)
    .map((p) => flatten(p.d, 10));
  if (!shapes.length) return 0;
  const box = shapes.map(boundsOf).reduce(unionBox);
  const N = 40;
  const cell = Math.max(box.w, box.h) / N;
  const m = rasterize(shapes, box.x + box.w / 2 - (N / 2) * cell, box.y + box.h / 2 - (N / 2) * cell, cell, N, 2);
  let s = 0,
    sx = 0,
    sy = 0;
  for (let i = 0; i < N * N; i++) {
    s += m[i]!;
    sx += m[i]! * (i % N);
    sy += m[i]! * Math.floor(i / N);
  }
  const cx = sx / s,
    cy = sy / s;
  let m20 = 0,
    m02 = 0,
    m11 = 0;
  for (let i = 0; i < N * N; i++) {
    const dx = (i % N) - cx,
      dy = Math.floor(i / N) - cy;
    m20 += m[i]! * dx * dx;
    m02 += m[i]! * dy * dy;
    m11 += m[i]! * dx * dy;
  }
  const tr = m20 + m02,
    det = Math.sqrt((m20 - m02) ** 2 + 4 * m11 * m11);
  const l1 = (tr + det) / 2,
    l2 = Math.max(1e-9, (tr - det) / 2);
  if (Math.sqrt(l1 / l2) < 1.3) return 0;
  const deg = Math.abs((0.5 * Math.atan2(2 * m11, m20 - m02) * 180) / Math.PI) % 90;
  return Math.min(deg, 90 - deg);
}

export interface PairScore {
  readonly a: string;
  readonly b: string;
  readonly iou: number;
  readonly sameClass: boolean;
  readonly limit: number;
}

export function pairScores(arts: readonly SpeciesArt[]): PairScore[] {
  const masks = arts.map(silhouetteMask);
  const out: PairScore[] = [];
  for (let i = 0; i < arts.length; i++)
    for (let j = i + 1; j < arts.length; j++) {
      const same = bodyClassOf(arts[i]!.klass) === bodyClassOf(arts[j]!.klass);
      out.push({
        a: arts[i]!.id,
        b: arts[j]!.id,
        iou: iou(masks[i]!, masks[j]!),
        sameClass: same,
        limit: same ? IOU_MAX_SAME_CLASS : IOU_MAX,
      });
    }
  return out;
}
