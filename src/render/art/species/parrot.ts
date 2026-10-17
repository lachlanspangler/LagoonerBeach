/**
 * Parrotfish — the reef's happy little sand-maker (fish class, profile view).
 * Silhouette (R10): a chunky oval with a blunt (never domed) forehead, a cream rounded-wedge beak with
 * a slight overbite, and a tall crescent (lunate) tail whose two horns curve back. Two pink stripes.
 * Personality: crunchy, busy, chill. Signature: chomps twice on a bit of coral and leaves a little
 * puff of sand.
 */
import { blob, capsule, circle, defineArt, ellipse, join, snap, tube } from '../kit.ts';

// chunky oval: a blunt, steep (not domed) forehead sloping straight down into the beak, tail root at −27
const body = blob([
  [26, -4],
  [23, -13],
  [15, -22],
  [2, -26],
  [-12, -23],
  [-21, -15],
  [-28, -4],
  [-28, 4],
  [-21, 13],
  [-9, 20],
  [6, 22],
  [19, 18],
  [26, 9],
]);
// the beak: a rounded cream wedge, the upper bill overhanging the lower (slight overbite)
const beak = blob(
  [
    [22, -7],
    [31, -5.5],
    [38, -1.5],
    [41, 3.5],
    [38.5, 8.5],
    [30, 11.5],
    [22, 11],
  ],
  0.85,
);
// one ink parting line that turns up at the back like a smile
const parting = 'M24.5 3.5Q31 7.5 38.5 5.5';
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
// a small swept-back pectoral in the cream tone, unoutlined (outlined, it read as a second mouth)
const pectoral = capsule(-3, 14, 3, -12, 16.5, 2.2);
// two pink stripes along the side (R18 stripes, 2), 5 units wide, starting behind the eye
const stripes = join(
  tube([
    [4, -9, 2.5],
    [-10, -10, 2.5],
    [-27, -6, 2.5],
  ]),
  tube([
    [6, 11, 2.5],
    [-9, 10, 2.5],
    [-27, 5, 2.5],
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
  palette: { body: '#3BC9A0', accent: '#F06AA0', belly: '#F5F1E6' },
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
        { d: stripes, role: 'accent', kind: 'pattern' },
      ],
    },
    {
      id: 'beak',
      pivot: [24, 4],
      parts: [
        { d: beak, role: 'belly' },
        { d: parting, role: 'ink', kind: 'line', w: 3 },
      ],
    },
    { id: 'finA', pivot: [-3, 14], parts: [{ d: pectoral, role: 'belly', outline: false }] },
    { id: 'sand', pivot: [42, 16], prop: true, parts: [{ d: sand, role: 'belly' }] },
  ],
  shine: ellipse(12, -17, 7, 3, -18),
  face: {
    eyes: [[13, -2]],
    eye: 9.6,
    zone: [2, -24, 38, 40],
    mouth: { at: [31, 7], w: 5, shape: 'none' },
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
        snap('beak', 18),
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
