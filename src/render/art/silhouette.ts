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
      if ((p.kind ?? 'fill') !== 'fill') continue;
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
