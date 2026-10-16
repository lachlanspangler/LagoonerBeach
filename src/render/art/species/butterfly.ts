/**
 * Butterflyfish — the reef's little trickster (fish class, profile view).
 * Silhouette (R10): a disc taller than it is long (tall dorsal and anal fins), a long tweezer snout,
 * and a small rounded tail. The false eye-spot near the tail is the joke.
 * Personality: dainty, tricky, sunny. Signature: turns around to show off its false eye, turns back
 * and winks with the real one.
 */
import { blob, capsule, circle, defineArt, ellipse, join, tube, xform } from '../kit.ts';

// it hovers nose-down at a dainty TILT, tweezer snout picking at the reef: the pose that keeps the
// tall disc apart from the sunfish and the round jellies at 24 px (R12)
const TILT = 17;
const R = (d: string) => xform(d, { rot: TILT });
const tc = Math.cos((TILT * Math.PI) / 180),
  ts = Math.sin((TILT * Math.PI) / 180);
/** An anchor on the drawing grid, mapped like the paths. */
const P = (x: number, y: number): [number, number] => [x * tc - y * ts, x * ts + y * tc];

// the disc: a deep, nearly round body
const body = blob([
  [17, 0],
  [13, -15],
  [1, -25],
  [-14, -26],
  [-26, -16],
  [-30, 0],
  [-26, 16],
  [-14, 26],
  [1, 25],
  [13, 15],
]);
// tall soft dorsal and anal fins, swept back: together the silhouette is taller than it is long
const dorsal = blob(
  [
    [9, -18],
    [4, -32],
    [-6, -40],
    [-18, -38],
    [-28, -24],
    [-16, -22],
  ],
  0.95,
);
const anal = blob(
  [
    [8, 19],
    [3, 32],
    [-6, 39],
    [-18, 37],
    [-28, 23],
    [-16, 21],
  ],
  0.95,
);
// the tweezer snout (rounded tip, R3)
const snout = capsule(13, 3, 6, 34, 4, 3.2);
const tail = blob(
  [
    [-27, -8],
    [-34, -12],
    [-39.5, -8],
    [-40.5, 0],
    [-39.5, 8],
    [-34, 12],
    [-27, 8],
  ],
  0.9,
);
// the eye band sits just behind the real eye; the small false eye near the tail is ringed in white
const band = tube(
  [
    [-3, -38, 3.4],
    [-4, -16, 4.2],
    [-4, 6, 4.2],
    [-2, 26, 3.4],
  ],
  1,
);
const falseRing = circle(-21, -13, 6);
const falseEye = circle(-21, -13, 4);

export default defineArt({
  id: 'butterfly',
  klass: 'fish',
  size: 'M',
  feature: 'a tall disc (taller than long) with a long tweezer snout and a false eye-spot',
  personality: ['dainty', 'tricky', 'sunny'],
  palette: { body: '#F2D43B', accent: '#3B3229' },
  groups: [
    {
      id: 'tail',
      pivot: P(-27, 0),
      parts: [
        { d: R(tail), role: 'body' },
        { d: R(ellipse(-40.5, 0, 4, 12)), role: 'white', kind: 'pattern', alpha: 0.7 },
      ],
    },
    {
      id: 'body',
      parts: [
        { d: R(dorsal), role: 'body' },
        { d: R(anal), role: 'body' },
        { d: R(body), role: 'body' },
        { d: R(snout), role: 'body' },
        { d: R(ellipse(-6, 28, 26, 8)), role: 'belly', kind: 'pattern' },
        { d: R(band), role: 'accent', kind: 'pattern', alpha: 0.9 },
        { d: R(falseRing), role: 'white', kind: 'pattern' },
        { d: R(falseEye), role: 'accent', kind: 'pattern' },
        {
          d: R(join(ellipse(-8, -41, 14, 4, 14), ellipse(-8, 40, 13, 4, -14))),
          role: 'accent',
          kind: 'pattern',
          alpha: 0.35,
        },
      ],
    },
  ],
  shine: R(ellipse(0, -17, 9, 3.4, -24)),
  face: {
    eyes: [P(6, 1.5)],
    eye: 9.5,
    zone: [-8, -24, 41, 46],
    mouth: { at: P(33, 6), w: 5, shape: 'smile' },
    sweet: true,
  },
  idle: {
    ambient: [
      { m: 'bob', amp: 2.5, period: 2.6 },
      { m: 'wag', g: 'tail', amp: 8, period: 0.9 },
      { m: 'breathe', amp: 0.015, period: 2.6 },
    ],
    signature: {
      dur: 1.5,
      every: [5, 8],
      tracks: [
        {
          p: 'sx',
          k: [
            [0, 1],
            [0.14, -1],
            [0.5, -1],
            [0.64, 1],
            [1, 1],
          ],
        },
        {
          p: 'ty',
          k: [
            [0, 0],
            [0.1, -3],
            [0.2, 0],
            [0.56, -3],
            [0.68, 0],
          ],
        },
        {
          g: 'tail',
          p: 'rot',
          k: [
            [0.14, 0],
            [0.24, 16],
            [0.34, -16],
            [0.44, 0],
          ],
        },
      ],
      face: [
        [0.1, 0.56, 'happy'],
        [0.72, 0.96, 'wink'],
      ],
    },
  },
});
