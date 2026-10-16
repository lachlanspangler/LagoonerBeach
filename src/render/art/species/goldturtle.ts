/**
 * Golden Turtle — LEGENDARY, TURTLE class (profile, gliding). Not a recolour of the sea turtle:
 * - silhouette: a three-jewel crown ridge on the dome, a raised head held chin-up, and a long
 *   wing-like front flipper (R10: crown + wing);
 * - pattern: gilded: a diamond medallion with a gem, a border of pearls along an ink-trimmed rim;
 * - expression: serene, regal (proud at the end of its performance), a sparkle signature.
 * Palette: sun gold `#E8B23E` shell, cream `#FFF1C2` medallion, pearls and jewels, ivory skin. Golden variant
 * is rose gold (R33), so a golden Golden Turtle still stands apart.
 * Signature: one slow, grand "flight" stroke with both flippers; it rises, and a little star
 * sparkle twinkles above the crown.
 */
import { blob, circle, defineArt, ellipse, join, tube, xform } from '../kit.ts';

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
// a tiara of three rounded points (R3: round tips), the middle one tallest
const point = (x: number, y: number, h: number, w: number, lean: number) =>
  blob(
    [
      [x - w, y + 4],
      [x + lean, y - h],
      [x + w, y + 4],
    ],
    0.75,
  );
const crown = join(point(-20, -20, 8, 6.5, -1), point(-5, -24, 11, 7, 0), point(10, -18, 8, 6.5, 1));
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
const frontFlipper = tube([
  [12, 6, 6.5],
  [4, 15, 6.4],
  [-8, 24, 5.4],
  [-20, 30, 4],
  [-29, 32, 3],
]);
const backFlipper = join(
  tube([
    [-26, 10, 5.4],
    [-32, 16, 4.6],
    [-39, 19, 3],
  ]),
  circle(-36, 3, 3.6),
);
// the gilded mosaic: a gem medallion, a pearl border along the rim, jewels on the crown
const plates = join(
  blob(
    [
      [-6, -17],
      [3, -9],
      [-6, -1],
      [-15, -9],
    ],
    0.8,
  ),
  circle(-29, 4, 3.3),
  circle(-20, 6.5, 3.3),
  circle(-10, 7.5, 3.3),
  circle(0, 7.5, 3.3),
  circle(10, 6.5, 3.3),
  circle(18, 4, 3.3),
);
const jewels = join(circle(-20.5, -23, 2.3), circle(-5, -28.5, 2.7), circle(10.5, -21, 2.3));
// the whole pose is drawn level, then tilted 10° nose-up: it glides upward, regal (and its
// silhouette leaves the sea turtle's)
const T = (d: string) => xform(d, { rot: -10 });
const sparkle = blob(
  [
    [26, -45],
    [27.6, -39.6],
    [33, -38],
    [27.6, -36.4],
    [26, -31],
    [24.4, -36.4],
    [19, -38],
    [24.4, -39.6],
  ],
  0.7,
);

export default defineArt({
  id: 'goldturtle',
  klass: 'turtle',
  size: 'L',
  feature: 'a three-jewel crown ridge on a gilded dome, chin-up head and a long wing flipper',
  personality: ['serene', 'radiant', 'rare'],
  palette: { body: '#E8B23E', accent: '#FFF1C2', belly: '#F5E2B0' },
  golden: 'rose',
  groups: [
    { id: 'flipB', pivot: [-25, 14.5], parts: [{ d: T(backFlipper), role: 'belly' }] },
    {
      id: 'head',
      pivot: [17.4, -5.1],
      parts: [
        { d: T(head), role: 'belly' },
        { d: T(join(circle(26, -14, 2), circle(30, 0, 1.8))), role: 'body', kind: 'pattern', alpha: 0.5 },
      ],
    },
    {
      id: 'body',
      parts: [
        { d: T(crown), role: 'body' },
        { d: T(shell), role: 'body' },
        { d: T(plates), role: 'accent', kind: 'pattern' },
        { d: T(jewels), role: 'accent', kind: 'pattern' },
        { d: T(circle(-6, -9, 3)), role: 'white', kind: 'pattern' },
        { d: T('M-34 0C-20 3 6 3 22 -1'), role: 'ink', kind: 'line', w: 1.4, alpha: 0.5 },
      ],
    },
    {
      id: 'flipF',
      pivot: [12.9, 3.8],
      parts: [
        { d: T(frontFlipper), role: 'belly' },
        { d: T(join(circle(-2, 19, 2), circle(-14, 27, 1.6))), role: 'body', kind: 'pattern', alpha: 0.5 },
      ],
    },
    { id: 'sparkle', pivot: [26, -38], prop: true, parts: [{ d: sparkle, role: 'light' }] },
  ],
  shine: T(ellipse(-14, -18, 9, 3.6, -14)),
  face: {
    g: 'head',
    eyes: [[29.6, -16.4]],
    eye: 6.6,
    zone: [15, -32.4, 26, 28],
    mouth: { at: [36.5, -9], w: 5, shape: 'smile' },
  },
  deviations: {
    R7: 'profile eye sits on the round head (its own face zone), as on the sea turtle pilot',
  },
  idle: {
    ambient: [
      { m: 'bob', amp: 2, period: 3.4 },
      { m: 'paddle', g: 'flipF', amp: 14, period: 2.4 },
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
