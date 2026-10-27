/**
 * Cleaner wrasse — the reef's tidy little spa attendant (fish class, profile view, level).
 * Silhouette (R10): a slim, even cigar with a rounded fan tail (no fork, no tall fins): between the
 * barracuda's needle and the minnow's forked torpedo. Bluestreak colours: a cream front half, an
 * electric blue-violet back half, and one near-black stripe that starts behind the eye (clear of the
 * face, R18E) and widens to 10 u into the tail.
 * Personality: helpful, busy, tidy. Signature: a little "scrub" wiggle with a bubble sparkle.
 */
import { blob, circle, defineArt, ellipse, join, tube } from '../kit.ts';

// even cigar: rounded nose at +40, tail root at −27
const body = blob([
  [40, 1],
  [35, -6],
  [24, -12],
  [8, -14],
  [-8, -11],
  [-20, -6],
  [-28, -3.5],
  [-28, 3.5],
  [-20, 6],
  [-8, 11],
  [8, 14],
  [24, 12.5],
  [35, 7.5],
]);
// rounded fan tail
const tail = blob(
  [
    [-26, -3],
    [-33, -9],
    [-40, -14],
    [-43.5, -7],
    [-44, 0],
    [-43.5, 7],
    [-40, 14],
    [-33, 9],
    [-26, 3],
  ],
  0.95,
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
  [-2, 0.4, 2],
  [-8, 0, 2.4],
  [-18, -0.4, 3.2],
  [-27, 0, 4],
]);
const tailStripe = tube([
  [-27, 0, 4],
  [-36, 0, 4.6],
  [-46, 0, 5],
]);
const bubbles = join(circle(45, -14, 3.2), circle(40, -22, 2.2));

export default defineArt({
  id: 'wrasse',
  klass: 'fish',
  size: 'S',
  tileScale: 1.1,
  feature: 'slim even cigar with a round tail; pale front, blue back, one bold stripe widening to the tail',
  personality: ['helpful', 'busy', 'tidy'],
  palette: { body: '#7464DA', accent: '#1E2740', belly: '#F3EED8' },
  groups: [
    {
      id: 'tail',
      pivot: [-27, 0],
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
  shine: ellipse(24, -8, 8, 2.6, -10),
  face: {
    eyes: [[14, 0]],
    eye: 10.6,
    zone: [4, -27, 38, 46],
    // helpful: the spa attendant's contented little cat-smile (CRITIQUE-3: its own resting mouth)
    mouth: { at: [34.5, 6], w: 8, shape: 'w' },
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
