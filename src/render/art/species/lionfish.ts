/**
 * Lionfish — the reef's diva (fish class, profile view).
 * Silhouette (R10): a big striped body (≥ 45 % of the silhouette) crowned by five plump dorsal spines
 * radiating ±60° from one hub, and one scalloped pectoral wing sweeping back and down with cream ray
 * lines, all tips rounded (R3: danger played for comedy). A crown and a fan, never a hand.
 * Personality: fabulous, vain, dramatic. Signature: fans everything open like a peacock, holds
 * the pose with a `proud` face.
 */
import { blob, capsule, defineArt, ellipse, join, tube } from '../kit.ts';

// the body: a big plump ellipse (≥ 45 % of the silhouette), snout at +36, tail root at −30
const body = blob([
  [33, 1.5],
  [29.5, -9],
  [18, -18],
  [2, -20.5],
  [-14, -17.5],
  [-24, -9],
  [-27, 0],
  [-24, 9],
  [-14, 16.5],
  [2, 19.5],
  [18, 18],
  [29.5, 10],
]);
// five dorsal spines radiating ±60° from one hub inside the body: a crown, never a hand of
// parallel fingers (filled tapered capsules, rounded tips)
const ray = (x1: number, y1: number, x2: number, y2: number) => capsule(x1, y1, 5, x2, y2, 3.3);
const spines = join(
  ray(-14, -9.5, -35, -21.5),
  ray(-8.5, -15, -20, -35),
  ray(-1, -17, -1, -39),
  ray(6.5, -15, 18, -35),
  ray(12, -9.5, 33, -21.5),
);
// the pectoral fan: one big scalloped wing sweeping back and down (feathery, not five fingers)
const fan = blob(
  [
    [-3, 3],
    [-25, 6],
    [-45.5, 18.5],
    [-33, 19],
    [-39, 29],
    [-27, 25.5],
    [-29.5, 36],
    [-20, 29.5],
    [-19, 39],
    [-12.5, 30.5],
    [-9, 39],
    [3, 25],
  ],
  0.8,
);
// cream ray lines fanning through it
const rayLines = join('M-6 9L-39.5 16.5', 'M-6 9L-34.5 25.5', 'M-6 9L-26.5 31.5', 'M-6 9L-17.5 34.5', 'M-6 9L-9 34');
const tail = blob(
  [
    [-24, -5],
    [-31, -10],
    [-38, -12],
    [-42, -5],
    [-42, 5],
    [-38, 12],
    [-31, 10],
    [-24, 5],
  ],
  0.9,
);
// four broad cream bands (R18 bands, ≥ 4 units) behind the eye (the fifth is on the tail), following the body's curve
const band = (x: number, w: number) =>
  tube([
    [x + 2, -26, w * 0.9],
    [x, -9, w],
    [x, 9, w],
    [x + 2, 26, w * 0.9],
  ]);
const bands = join(band(-0.5, 2.5), band(-8.5, 2.5), band(-16.5, 2.5), band(-24, 2.3));
// cream tips on every ray
const tip = (x: number, y: number) => ellipse(x, y, 3.6, 3.6);
const spineTips = join(tip(-35, -21.5), tip(-20, -35), tip(-1, -39), tip(18, -35), tip(33, -21.5));
const rayTips = join(tip(-45.5, 18.5), tip(-39, 29), tip(-29.5, 36), tip(-19, 39), tip(-9, 39));

export default defineArt({
  id: 'lionfish',
  klass: 'fish',
  size: 'M',
  feature: 'a huge fan of plump, round-tipped spines and feathery pectoral rays',
  personality: ['fabulous', 'vain', 'dramatic'],
  palette: { body: '#A0363C', accent: '#FFF1E6' },
  deviations: {
    R16: 'dark maroon identity L 0.49 (CRITIQUE-3 maroon-red, off the box crab hex; the dark-body rim carries Night)',
  },
  groups: [
    {
      id: 'tail',
      pivot: [-25, 0],
      parts: [
        { d: tail, role: 'body' },
        { d: ellipse(-39, 0, 3.5, 10), role: 'accent', kind: 'pattern', alpha: 0.8 },
      ],
    },
    {
      id: 'spines',
      pivot: [-1, -6],
      parts: [
        { d: spines, role: 'body' },
        { d: spineTips, role: 'accent', kind: 'pattern' },
      ],
    },
    {
      id: 'fan',
      pivot: [-8, 7],
      parts: [
        { d: fan, role: 'body' },
        { d: rayLines, role: 'accent', kind: 'line', w: 3 },
        { d: rayTips, role: 'accent', kind: 'pattern' },
      ],
    },
    {
      id: 'body',
      parts: [
        { d: body, role: 'body' },
        { d: ellipse(6, 23, 30, 8), role: 'belly', kind: 'pattern' },
        { d: bands, role: 'accent', kind: 'pattern' },
      ],
    },
  ],
  shine: ellipse(20, -13, 8, 3.2, -18),
  face: {
    eyes: [[11, 3]],
    eye: 9.9,
    zone: [-2, -23, 38, 45],
    mouth: { at: [31, 8], w: 6, shape: 'smile' },
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
