/**
 * Box Crab — front-facing CHIBI (S).
 * Silhouette: a rounded-square shell with two flat claws folded across its front like a box lid
 * (R10: the lid, exaggerated), three stubby leg nubs a side.
 * Personality: tidy, neat, prim. Signature: lifts the lid (both claws swing open), waves one claw
 * hello, folds back neatly and looks pleased with itself.
 */
import { capsule, circle, defineArt, ellipse, join, rrect, xform } from '../kit.ts';

const shell = rrect(-28, -26, 56, 48, 12);
const legsL = join(
  capsule(-24, -12, 5, -35, -23, 4.6),
  capsule(-25, 0, 5, -37, 0, 4.6),
  capsule(-24, 12, 5, -35, 23, 4.6),
);
const mirror = (d: string) => xform(d, { sx: -1 });
const clawL = rrect(-35, 6, 36, 21, 10);

export default defineArt({
  id: 'boxcrab',
  klass: 'chibi',
  size: 'S',
  feature: 'rounded-square shell with both claws folded across the front like a box lid',
  personality: ['tidy', 'neat', 'prim'],
  palette: { body: '#C9503A', accent: '#F6C7A6' },
  groups: [
    {
      id: 'legs',
      pivot: [0, 0],
      parts: [
        { d: legsL, role: 'body' },
        { d: mirror(legsL), role: 'body' },
      ],
    },
    {
      id: 'body',
      parts: [
        { d: shell, role: 'body' },
        // two little eye-stalk bumps on the shell's top edge (box crabs peek over their lid)
        { d: join(capsule(-13, -20, 4.6, -15, -30, 5.4), capsule(13, -20, 4.6, 15, -30, 5.4)), role: 'body' },
        {
          d: join(circle(-18, -15, 5.2), circle(1, -19, 4.2), circle(19, -14, 4.8)),
          role: 'accent',
          kind: 'pattern',
        },
      ],
    },
    {
      id: 'clawL',
      pivot: [-30, 18],
      parts: [
        { d: clawL, role: 'body' },
        { d: 'M-24 16C-18 13 -10 13 -4 16M-14 26L-8 26', role: 'ink', kind: 'line', w: 3, alpha: 0.5 },
      ],
    },
    {
      id: 'clawR',
      pivot: [30, 18],
      parts: [
        { d: mirror(clawL), role: 'body' },
        { d: 'M24 16C18 13 10 13 4 16M14 26L8 26', role: 'ink', kind: 'line', w: 3, alpha: 0.5 },
      ],
    },
  ],
  shine: ellipse(-16, -19, 9, 4, -18),
  face: {
    eyes: [
      [-9, -3],
      [9, -3],
    ],
    eye: 11,
    zone: [-30, -30, 60, 46],
    mouth: { at: [0, 3.5], w: 5, shape: 'smile' },
    front: true,
    blushInk: true,
  },
  idle: {
    ambient: [
      { m: 'breathe', amp: 0.025, period: 3 },
      { m: 'sway', g: 'legs', amp: 3, period: 1.2 },
      { m: 'sway', g: ['clawL', 'clawR'], amp: 2, period: 3, lag: 0.09 },
    ],
    signature: {
      dur: 1.4,
      tracks: [
        {
          g: 'clawL',
          p: 'rot',
          k: [
            [0, 0],
            [0.16, -110],
            [0.7, -110],
            [0.86, 4],
            [0.94, 0],
          ],
        },
        {
          g: 'clawR',
          p: 'rot',
          k: [
            [0, 0],
            [0.16, 110],
            [0.3, 145],
            [0.4, 95],
            [0.5, 145],
            [0.6, 100],
            [0.72, 110],
            [0.86, -4],
            [0.94, 0],
          ],
        },
        {
          p: 'sy',
          k: [
            [0, 1],
            [0.08, 0.94],
            [0.18, 1.05],
            [0.3, 1],
            [0.86, 1],
            [0.92, 0.95],
            [1, 1],
          ],
        },
      ],
      face: [
        [0.16, 0.72, 'happy'],
        [0.86, 1, 'proud'],
      ],
    },
  },
});
