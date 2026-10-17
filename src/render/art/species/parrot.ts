/**
 * Parrotfish — the reef's happy little sand-maker (fish class, profile view).
 * Silhouette (R10): a chunky body with a steep forehead, a rounded beak jutting from the front, and
 * a tall crescent (lunate) tail whose two horns curve back. Two pink stripes along the side.
 * Personality: crunchy, busy, chill. Signature: chomps twice on a bit of coral and leaves a little
 * puff of sand.
 */
import { blob, circle, defineArt, ellipse, join, snap, tube } from '../kit.ts';

// chunky body: a bumped, steep forehead over the beak, narrow tail root at −27
const body = blob([
  [27, -2],
  [29, -14],
  [23, -29],
  [10, -34],
  [-6, -28],
  [-16, -16],
  [-24, -8],
  [-29, -3.5],
  [-29, 3.5],
  [-24, 8],
  [-14, 17],
  [0, 20],
  [16, 19],
  [26, 13],
]);
// the beak: a rounded parrot bill in a lighter tone (belly), its own group so it can chomp
const beak = blob([
  [23, 0],
  [32, -1],
  [40, 3],
  [40, 10],
  [33, 14],
  [23, 12],
]);
// crescent tail: two curved horns with rounded tips around a shallow, round notch
const tail = blob(
  [
    [-26, -5],
    [-32, -15],
    [-36, -28],
    [-42, -33],
    [-41, -19],
    [-35, 0],
    [-41, 19],
    [-42, 33],
    [-36, 28],
    [-32, 15],
    [-26, 5],
  ],
  0.9,
);
const pectoral = ellipse(-4, 10, 5.5, 2.8, 24);
// two pink stripes along the side (R18 stripes, 2), behind the eye
const stripes = join(
  tube([
    [4, -7, 1.6],
    [-10, -8, 2.4],
    [-26, -4, 1.8],
  ]),
  tube([
    [6, 13, 1.6],
    [-8, 11, 2.4],
    [-24, 4, 1.8],
  ]),
);
// the sand puff (prop): three little grains drifting off the beak
const sand = join(circle(44, 12, 3.4), circle(40, 18, 2.6), circle(47, 19, 2.2));

export default defineArt({
  id: 'parrot',
  klass: 'fish',
  size: 'M',
  feature: 'chunky body with a rounded beak and a tall crescent tail',
  personality: ['crunchy', 'busy', 'chill'],
  palette: { body: '#3BC9A0', accent: '#E86FB0', belly: '#CDEFE0' },
  groups: [
    {
      id: 'tail',
      pivot: [-27, 0],
      parts: [
        { d: tail, role: 'body' },
        { d: join(ellipse(-40, -28, 4, 5, 20), ellipse(-40, 28, 4, 5, -20)), role: 'accent', kind: 'pattern' },
      ],
    },
    {
      id: 'body',
      parts: [
        { d: body, role: 'body' },
        { d: ellipse(6, 20, 28, 7), role: 'belly', kind: 'pattern' },
        { d: stripes, role: 'accent', kind: 'pattern' },
      ],
    },
    {
      id: 'beak',
      pivot: [27, 4],
      parts: [
        { d: beak, role: 'belly' },
        { d: 'M28 4Q34 5.5 39.5 3', role: 'ink', kind: 'line', w: 1.2 },
      ],
    },
    { id: 'finA', pivot: [-3, 7], parts: [{ d: pectoral, role: 'body' }] },
    { id: 'sand', pivot: [42, 16], prop: true, parts: [{ d: sand, role: 'belly' }] },
  ],
  shine: ellipse(16, -14, 8, 3.2, -18),
  face: {
    eyes: [[12, -1]],
    eye: 8.6,
    zone: [0, -22, 40, 40],
    mouth: { at: [24, 7], w: 5.5, shape: 'smile' },
    sweet: true,
  },
  idle: {
    ambient: [
      { m: 'bob', amp: 2.2, period: 2.6 },
      { m: 'wag', g: 'tail', amp: 8, period: 0.9 },
      { m: 'flutter', g: 'finA', amp: 14, period: 0.5 },
    ],
    signature: {
      dur: 1.2,
      every: [5, 8],
      tracks: [
        snap('beak', 12),
        {
          p: 'tx',
          k: [
            [0, 0],
            [0.1, 2],
            [0.5, 2],
            [0.7, 0],
          ],
        },
        {
          g: 'sand',
          p: 's',
          k: [
            [0, 0],
            [0.42, 0],
            [0.55, 1.1],
            [0.85, 0.9],
            [1, 0],
          ],
        },
        {
          g: 'sand',
          p: 'ty',
          k: [
            [0.42, 0],
            [1, 8],
          ],
        },
      ],
      face: [
        [0.05, 0.5, 'happy'],
        [0.6, 0.95, 'proud'],
      ],
    },
  },
  catch: {
    dur: 0.5,
    tracks: [
      snap('beak', 14),
      {
        g: 'tail',
        p: 'rot',
        k: [
          [0, 0],
          [0.3, 18],
          [0.6, -18],
          [1, 0],
        ],
      },
    ],
    face: [[0, 1, 'happy']],
  },
});
