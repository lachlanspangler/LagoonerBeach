/**
 * Cleaner wrasse — the reef's tidy little spa attendant (fish class, profile view, level).
 * Silhouette (R10): a slim cigar with a tapered snout and a big rounded fan tail (no fork, no tall fins): between the
 * barracuda's needle and the minnow's forked torpedo. Bluestreak colours: a cream front half, an
 * electric blue-violet back half, and one near-black stripe that starts behind the eye (clear of the
 * face, R18E) and widens to 10 u into the tail.
 * Personality: helpful, busy, tidy. Signature: a little "scrub" wiggle with a bubble sparkle.
 */
import { blob, circle, defineArt, ellipse, join, tube } from '../kit.ts';

// slim cigar whose snout tapers over the front 15 % to a rounded point at +38 (CRITIQUE-4); tail
// root at −26
const body = blob([
  [38, 1.5],
  [33, -4],
  [26, -10],
  [13, -15],
  [-8, -12],
  [-18, -6.8],
  [-26, -3.5],
  [-26, 3.5],
  [-18, 6.8],
  [-8, 12],
  [13, 15],
  [26, 11],
  [33, 6],
]);
// a big round fan tail (1.2 × CRITIQUE-3's)
const tail = blob(
  [
    [-24, -3.6],
    [-30, -9.5],
    [-36, -15],
    [-41.5, -13.5],
    [-45, -7],
    [-46, 0],
    [-45, 7],
    [-41.5, 13.5],
    [-36, 15],
    [-30, 9.5],
    [-24, 3.6],
  ],
  0.9,
);
const pectoral = ellipse(-4, 7, 5, 2.6, 26);
// the pale front half over the blue body (pattern, follows the outline)
const front = blob([
  [8, -18],
  [46, -18],
  [46, 18],
  [-8, 18],
  [1, 0],
]);
// one bold ink stripe: starts 3 u behind the eye at 4 u, arcs gently with the body's midline and
// widens to 10 u at the tail root, then fans on into the tail (never a strip of tape)
const stripe = tube([
  [-4, 0.4, 2],
  [-9, 0, 2.4],
  [-17, -0.4, 3.2],
  [-25, 0, 4],
]);
const tailStripe = tube([
  [-25, 0, 4],
  [-35, 0, 4.8],
  [-47, 0, 5.4],
]);
const bubbles = join(circle(43, -12, 3.2), circle(38, -20, 2.2));

export default defineArt({
  id: 'wrasse',
  klass: 'fish',
  size: 'S',
  tileScale: 1.1,
  feature:
    'slim cigar with a tapered snout and a big round tail; pale front, blue back, one bold stripe widening to the tail',
  personality: ['helpful', 'busy', 'tidy'],
  palette: { body: '#7464DA', accent: '#1E2740', belly: '#F3EED8' },
  groups: [
    {
      id: 'tail',
      pivot: [-24, 0],
      parts: [
        { d: tail, role: 'body' },
        { d: tailStripe, role: 'accent', kind: 'pattern' },
      ],
    },
    {
      id: 'body',
      parts: [
        { d: body, role: 'body' },
        { d: front, role: 'belly', kind: 'pattern' },
        { d: stripe, role: 'accent', kind: 'pattern' },
      ],
    },
    { id: 'finA', pivot: [-6, 5], parts: [{ d: pectoral, role: 'belly' }] },
    {
      id: 'bubbles',
      pivot: [42, -20],
      prop: true,
      followRoot: true,
      parts: [{ d: bubbles, role: 'white', alpha: 0.85 }],
    },
  ],
  shine: ellipse(21, -8, 7, 2.4, -14),
  face: {
    eyes: [[12, 0]],
    eye: 10.6,
    zone: [2, -27, 38, 46],
    // helpful: the spa attendant's contented little cat-smile (CRITIQUE-3: its own resting mouth)
    mouth: { at: [32, 4], w: 7, shape: 'w' },
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
