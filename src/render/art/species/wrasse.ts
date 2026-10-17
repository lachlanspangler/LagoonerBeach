/**
 * Cleaner wrasse — the reef's tidy little spa attendant (fish class, profile view).
 * Silhouette (R10): a slim cigar with a rounded fan tail, always swimming nose-up at a jaunty tilt
 * (the level minnow and barracuda are its neighbours at 24 px). One bold ink stripe to the tail.
 * Personality: helpful, busy, tidy. Signature: a little "scrub" wiggle with a bubble sparkle.
 */
import { blob, circle, defineArt, ellipse, join, tube, xform } from '../kit.ts';

// The whole fish swims nose-up at a jaunty TILT (busy, on its way to a client): the pose is the
// silhouette feature that keeps the cigar apart from the level minnow and barracuda (R12).
const TILT = -14;
const T = (d: string) => xform(d, { rot: TILT });
// even cigar: rounded nose at +38, tail root at −27
const body = T(
  tube(
    [
      [31, 0, 9.5],
      [20, 0, 12.5],
      [4, 0, 13],
      [-12, 0, 11.5],
      [-22, 0, 8.5],
      [-26, 0, 6.5],
    ],
    1,
  ),
);
// rounded fan tail with a slightly convex trailing edge
const tail = T(
  blob(
    [
      [-23, -5],
      [-32, -11],
      [-39, -13.5],
      [-42.5, -7],
      [-43, 0],
      [-42.5, 7],
      [-39, 13.5],
      [-32, 11],
      [-23, 5],
    ],
    0.85,
  ),
);
const pectoral = T(ellipse(-2, 6.5, 4.8, 2.5, 24));
// one bold stripe: thin behind the eye, widening to the tail (R18 stripes, 1 line)
const stripe = T(
  tube([
    [3, -1, 1.2],
    [-8, -1, 3.2],
    [-20, -1, 4],
    [-30, -1, 4.2],
  ]),
);
const tailStripe = T(
  tube([
    [-26, -1, 4],
    [-46, -1, 3.6],
  ]),
);
const bubbles = join(circle(43, -20, 3.6), circle(37, -29, 2.4), circle(45, -35, 1.8));

export default defineArt({
  id: 'wrasse',
  klass: 'fish',
  size: 'S',
  feature: 'slim cigar swimming nose-up, rounded fan tail, one bold stripe',
  personality: ['helpful', 'busy', 'tidy'],
  palette: { body: '#3D9BE9', belly: '#BFE3FF' },
  groups: [
    {
      id: 'tail',
      pivot: [-25, 6],
      parts: [
        { d: tail, role: 'body' },
        { d: tailStripe, role: 'ink', kind: 'pattern', alpha: 0.85 },
      ],
    },
    {
      id: 'body',
      parts: [
        { d: body, role: 'body' },
        { d: T(ellipse(10, 13, 32, 6)), role: 'belly', kind: 'pattern' },
        { d: stripe, role: 'ink', kind: 'pattern', alpha: 0.85 },
      ],
    },
    { id: 'finA', pivot: [-1, 4.5], parts: [{ d: pectoral, role: 'body' }] },
    { id: 'bubbles', pivot: [40, -20], prop: true, parts: [{ d: bubbles, role: 'white', alpha: 0.85 }] },
  ],
  shine: T(ellipse(22, -7, 8, 2.6, -6)),
  face: {
    eyes: [[12, -1.5]],
    eye: 8,
    zone: [2, -22, 40, 36],
    mouth: { at: [31, -1.5], w: 5.5, shape: 'smile' },
    sweet: true,
  },
  idle: {
    ambient: [
      { m: 'bob', amp: 2, period: 2 },
      { m: 'wag', g: 'tail', amp: 9, period: 0.7 },
      { m: 'flutter', g: 'finA', amp: 20, period: 0.35 },
    ],
    signature: {
      dur: 1.2,
      every: [4, 7],
      tracks: [
        {
          p: 'rot',
          k: [
            [0, 0],
            [0.1, 6],
            [0.2, -6],
            [0.3, 6],
            [0.4, -6],
            [0.5, 6],
            [0.6, 0],
          ],
        },
        {
          p: 'tx',
          k: [
            [0, 0],
            [0.1, 2],
            [0.2, -2],
            [0.3, 2],
            [0.4, -2],
            [0.5, 2],
            [0.6, 0],
          ],
        },
        {
          g: 'bubbles',
          p: 's',
          k: [
            [0, 0],
            [0.5, 0],
            [0.62, 1.15],
            [0.72, 1],
            [0.92, 1],
            [1, 0],
          ],
        },
        {
          g: 'bubbles',
          p: 'ty',
          k: [
            [0.5, 4],
            [1, -6],
          ],
        },
      ],
      face: [
        [0.05, 0.55, 'happy'],
        [0.6, 0.95, 'proud'],
      ],
    },
  },
  catch: {
    dur: 0.5,
    tracks: [
      {
        p: 'rot',
        k: [
          [0, 0],
          [0.2, 8],
          [0.4, -8],
          [0.6, 6],
          [0.8, -4],
          [1, 0],
        ],
      },
      {
        p: 'sy',
        k: [
          [0, 1],
          [0.2, 0.88],
          [0.45, 1.1],
          [1, 1],
        ],
      },
    ],
    face: [[0, 1, 'happy']],
  },
});
