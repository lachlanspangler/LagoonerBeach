/**
 * Lionfish — the reef's diva (fish class, profile view).
 * Silhouette (R10): a small striped body inside a huge fan: five plump dorsal spines radiating up
 * and five feathery pectoral rays fanning down and back, all with rounded tips (R3: danger played
 * for comedy). The gaps between the rays are the 24 px feature: no other fish has them.
 * Personality: fabulous, vain, dramatic. Signature: fans everything open like a peacock, holds
 * the pose with a `proud` face.
 */
import { blob, capsule, defineArt, ellipse, join, tube } from '../kit.ts';

const body = blob([
  [30, 2],
  [26, -9],
  [14, -17],
  [-2, -19],
  [-16, -15],
  [-25, -6],
  [-25, 6],
  [-16, 14],
  [-2, 18],
  [14, 17],
  [26, 11],
]);
// five dorsal spines fanning up and back (filled tapered capsules, rounded tips)
const ray = (x1: number, y1: number, x2: number, y2: number) => capsule(x1, y1, 3.4, x2, y2, 2.7);
const spines = join(
  ray(14, -12, 21, -33),
  ray(7, -15, 10, -37.5),
  ray(-1, -16, -3, -38.5),
  ray(-9, -15, -15, -36.5),
  ray(-16, -12, -26, -31),
);
// five pectoral rays fanning down and back from behind the head
const rays = join(
  ray(-4, 6, -38, 6),
  ray(-4, 6, -36, 17.5),
  ray(-4, 6, -30, 28),
  ray(-4, 6, -21, 35.5),
  ray(-4, 6, -10, 39),
);
const tail = blob(
  [
    [-22, -6],
    [-32, -12],
    [-40, -10],
    [-42, 0],
    [-39, 9],
    [-32, 12],
    [-22, 6],
  ],
  0.9,
);
// cream bands (R18 bands) behind the eye, following the body's curve
const band = (x: number, w: number) =>
  tube([
    [x + 2, -22, w * 0.8],
    [x, -8, w],
    [x, 8, w],
    [x + 2, 22, w * 0.8],
  ]);
const bands = join(band(-2, 1.8), band(-9, 1.9), band(-16, 1.9), band(-23, 1.6));
// cream tips on every ray
const tip = (x: number, y: number) => ellipse(x, y, 3.2, 3.2);
const spineTips = join(tip(21, -33), tip(10, -37.5), tip(-3, -38.5), tip(-15, -36.5), tip(-26, -31));
const rayTips = join(tip(-38, 6), tip(-36, 17.5), tip(-30, 28), tip(-21, 35.5), tip(-10, 39));

export default defineArt({
  id: 'lionfish',
  klass: 'fish',
  size: 'M',
  feature: 'a huge fan of plump, round-tipped spines and feathery pectoral rays',
  personality: ['fabulous', 'vain', 'dramatic'],
  palette: { body: '#C9503A', accent: '#FFF1E6' },
  groups: [
    {
      id: 'tail',
      pivot: [-24, 0],
      parts: [
        { d: tail, role: 'body' },
        { d: ellipse(-36, 0, 3, 10), role: 'accent', kind: 'pattern', alpha: 0.8 },
      ],
    },
    {
      id: 'spines',
      pivot: [0, -14],
      parts: [
        { d: spines, role: 'body' },
        { d: spineTips, role: 'accent', kind: 'pattern' },
      ],
    },
    {
      id: 'fan',
      pivot: [-4, 6],
      parts: [
        { d: rays, role: 'body' },
        { d: rayTips, role: 'accent', kind: 'pattern' },
      ],
    },
    {
      id: 'body',
      parts: [
        { d: body, role: 'body' },
        { d: ellipse(4, 18, 26, 7), role: 'belly', kind: 'pattern' },
        { d: bands, role: 'accent', kind: 'pattern' },
      ],
    },
  ],
  shine: ellipse(14, -10, 8, 3, -18),
  face: {
    eyes: [[8, 1]],
    eye: 7.8,
    zone: [-4, -19, 34, 36],
    mouth: { at: [26, 6], w: 5.6, shape: 'smile' },
    blushInk: true,
  },
  idle: {
    ambient: [
      { m: 'bob', amp: 2, period: 2.8 },
      { m: 'wag', g: 'tail', amp: 7, period: 1 },
      { m: 'sway', g: ['fan', 'spines'], amp: 5, period: 2.4, lag: 0.3 },
    ],
    signature: {
      dur: 1.4,
      every: [5, 8],
      tracks: [
        {
          g: 'fan',
          p: 'rot',
          k: [
            [0, 0],
            [0.12, 6],
            [0.3, -16],
            [0.75, -16],
            [1, 0],
          ],
        },
        {
          g: 'fan',
          p: 's',
          k: [
            [0, 1],
            [0.3, 1.1],
            [0.75, 1.1],
            [1, 1],
          ],
        },
        {
          g: 'spines',
          p: 's',
          k: [
            [0, 1],
            [0.12, 0.92],
            [0.3, 1.12],
            [0.75, 1.12],
            [1, 1],
          ],
        },
        {
          p: 'rot',
          k: [
            [0, 0],
            [0.3, -6],
            [0.75, -6],
            [1, 0],
          ],
        },
      ],
      face: [[0.25, 0.9, 'proud']],
    },
  },
  catch: {
    dur: 0.5,
    tracks: [
      {
        g: 'fan',
        p: 'rot',
        k: [
          [0, 0],
          [0.4, -18],
          [1, 0],
        ],
      },
      {
        g: 'spines',
        p: 's',
        k: [
          [0, 1],
          [0.4, 1.12],
          [1, 1],
        ],
      },
    ],
    face: [[0, 1, 'proud']],
  },
});
