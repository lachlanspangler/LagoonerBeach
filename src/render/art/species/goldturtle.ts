/**
 * Golden Turtle — LEGENDARY, TURTLE class (profile, flying). Not a recolour of the sea turtle:
 * - silhouette: three rounded jewel domes along the dome of the shell, the whole body tilted 10°
 *   nose-up, the head raised another 15°, and BOTH front flippers out like wings: the near one
 *   swept down-back, the far one raised up-back behind the shell (R10: domes + wings);
 * - pattern: gilded: cream domes with blue gem centres, a diamond medallion with a gem, a border of
 *   pearls along the rim (the pilot has scute spots);
 * - expression: serene and regal (proud at the end of its performance), a sparkle signature.
 * Palette: sun gold `#E8B23E` shell, cream `#FFF1C2` skin/domes/pearls, gem blue `#7FD1E8`.
 * Golden variant is rose gold (R33), so a golden Golden Turtle still stands apart.
 * Signature: one slow, grand "flight" stroke with both wings; it rises, and a star sparkle
 * twinkles above its head.
 */
import { blob, circle, defineArt, ellipse, join, tube, xform } from '../kit.ts';

// the pose: drawn level, then the body tilts 10° nose-up and the head lifts 15° more at the neck
const TILT = -10;
const T = (d: string) => xform(d, { rot: TILT });
const H = (d: string) => T(xform(d, { rot: -15, ox: 18, oy: -2 }));
const rot = ([x, y]: readonly [number, number], deg: number, ox = 0, oy = 0): [number, number] => {
  const a = (deg * Math.PI) / 180;
  const dx = x - ox,
    dy = y - oy;
  return [
    Math.round((ox + dx * Math.cos(a) - dy * Math.sin(a)) * 100) / 100,
    Math.round((oy + dx * Math.sin(a) + dy * Math.cos(a)) * 100) / 100,
  ];
};
const tp = (pt: readonly [number, number]) => rot(pt, TILT);
const hp = (pt: readonly [number, number]) => tp(rot(pt, -15, 18, -2));

const shell = blob([
  [-36, 6],
  [-33, -10],
  [-22, -21],
  [-6, -25],
  [10, -21],
  [20, -10],
  [22, 6],
  [8, 13],
  [-12, 14],
  [-28, 12],
]);
// three rounded jewel domes along the top (round, never spiked: CRITIQUE-1 originality note)
const DOMES: readonly (readonly [number, number, number])[] = [
  [-19, -21, 6.2],
  [-5, -25.5, 7.2],
  [9, -20, 6.2],
];
const domes = join(...DOMES.map(([x, y, r]) => circle(x, y, r)));
const gems = join(...DOMES.map(([x, y]) => circle(x, y - 0.8, 3.1)));
const head = blob([
  [18, -8],
  [24, -19],
  [34, -22],
  [41, -15],
  [41, -5],
  [36, 3],
  [26, 4],
  [18, 0],
]);
const nearWing = tube([
  [12, 6, 6.5],
  [4, 15, 6.4],
  [-8, 24, 5.4],
  [-20, 30, 4],
  [-29, 32, 3],
]);
// the far front flipper, raised: only its upper half shows above the back of the shell
const farWing = tube([
  [8, -6, 6.2],
  [-4, -21, 5.6],
  [-17, -30, 4.4],
  [-30, -33, 3.2],
  [-37, -30, 2.6],
]);
const backFlipper = join(
  tube([
    [-26, 10, 5.4],
    [-32, 16, 4.6],
    [-39, 19, 3],
  ]),
  circle(-36, 3, 3.6),
);
const medallion = blob(
  [
    [-6, -17],
    [3, -9],
    [-6, -1],
    [-15, -9],
  ],
  0.8,
);
const pearls = join(
  circle(-29, 4, 3.3),
  circle(-20, 6.5, 3.3),
  circle(-10, 7.5, 3.3),
  circle(0, 7.5, 3.3),
  circle(10, 6.5, 3.3),
  circle(18, 4, 3.3),
);
const sparkle = blob(
  [
    [30, -45],
    [31.6, -39.6],
    [37, -38],
    [31.6, -36.4],
    [30, -31],
    [28.4, -36.4],
    [23, -38],
    [28.4, -39.6],
  ],
  0.7,
);
const eye = hp([32, -11]);

export default defineArt({
  id: 'goldturtle',
  klass: 'turtle',
  size: 'L',
  feature: 'three jewel domes on a gilded shell, head raised, both front flippers out like wings',
  personality: ['serene', 'radiant', 'rare'],
  palette: { body: '#E8B23E', accent: '#7FD1E8', belly: '#FFF1C2' },
  golden: 'rose',
  groups: [
    { id: 'wing', pivot: tp([8, -6]), parts: [{ d: T(farWing), role: 'belly' }] },
    { id: 'flipB', pivot: tp([-27, 10]), parts: [{ d: T(backFlipper), role: 'belly' }] },
    { id: 'head', pivot: tp([18, -2]), parts: [{ d: H(head), role: 'belly' }] },
    {
      id: 'body',
      parts: [
        { d: T(domes), role: 'belly' },
        { d: T(shell), role: 'body' },
        { d: T(gems), role: 'accent', kind: 'pattern' },
        { d: T(join(medallion, pearls)), role: 'belly', kind: 'pattern' },
        { d: T(circle(-6, -9, 3.2)), role: 'accent', kind: 'pattern' },
        { d: T('M-34 0C-20 3 6 3 22 -1'), role: 'ink', kind: 'line', w: 3, alpha: 0.3 },
      ],
    },
    { id: 'flipF', pivot: tp([12, 6]), parts: [{ d: T(nearWing), role: 'belly' }] },
    { id: 'sparkle', pivot: [30, -38], prop: true, parts: [{ d: sparkle, role: 'white' }] },
  ],
  shine: T(ellipse(-14, -16, 9, 3.4, -14)),
  face: {
    g: 'head',
    eyes: [eye],
    eye: 7.4,
    zone: [eye[0] - 13, eye[1] - 18, 26, 31],
    mouth: { at: hp([37.5, -2.5]), w: 5, shape: 'smile' },
  },
  deviations: {
    R7: 'profile eye sits on the round head (its own face zone), as on the sea turtle pilot',
  },
  idle: {
    ambient: [
      { m: 'bob', amp: 2, period: 3.4 },
      { m: 'paddle', g: 'flipF', amp: 14, period: 2.4 },
      { m: 'paddle', g: 'wing', amp: -10, period: 2.4 },
      { m: 'paddle', g: 'flipB', amp: 14, period: 2.4, phase: 0.5 },
      { m: 'sway', g: 'head', amp: 2.5, period: 3.4, phase: 0.3 },
    ],
    signature: {
      dur: 1.5,
      every: [5, 8],
      tracks: [
        {
          g: 'flipF',
          p: 'rot',
          k: [
            [0, 0],
            [0.25, -40],
            [0.6, 26],
            [0.85, -4],
            [1, 0],
          ],
        },
        {
          g: 'flipB',
          p: 'rot',
          k: [
            [0, 0],
            [0.3, 24],
            [0.65, -16],
            [1, 0],
          ],
        },
        {
          g: 'wing',
          p: 'rot',
          k: [
            [0, 0],
            [0.25, -18],
            [0.6, 30],
            [0.85, 4],
            [1, 0],
          ],
        },
        {
          p: 'ty',
          k: [
            [0, 0],
            [0.25, 1.5],
            [0.6, -6],
            [1, 0],
          ],
        },
        {
          g: 'head',
          p: 'rot',
          k: [
            [0, 0],
            [0.55, -8],
            [0.9, -8],
            [1, 0],
          ],
        },
        {
          g: 'sparkle',
          p: 's',
          k: [
            [0.5, 0],
            [0.62, 1.25],
            [0.72, 0.8],
            [0.82, 1.1],
            [1, 0],
          ],
        },
        {
          g: 'sparkle',
          p: 'rot',
          k: [
            [0.5, 0],
            [1, 90],
          ],
        },
      ],
      face: [
        [0.2, 0.55, 'blink'],
        [0.55, 1, 'proud'],
      ],
    },
  },
  catch: {
    dur: 0.6,
    tracks: [
      {
        g: 'flipF',
        p: 'rot',
        k: [
          [0, 0],
          [0.3, -32],
          [0.65, 18],
          [1, 0],
        ],
      },
      {
        g: 'flipB',
        p: 'rot',
        k: [
          [0, 0],
          [0.3, 20],
          [0.65, -12],
          [1, 0],
        ],
      },
      {
        g: 'sparkle',
        p: 's',
        k: [
          [0, 0],
          [0.3, 1.2],
          [0.6, 0.9],
          [1, 0],
        ],
      },
      {
        p: 'sy',
        k: [
          [0, 1],
          [0.2, 0.92],
          [0.45, 1.06],
          [1, 1],
        ],
      },
    ],
    face: [[0, 1, 'happy']],
  },
});
