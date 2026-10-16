/**
 * Grouper — the lagoon's enormous, unbothered uncle (fish class, profile view).
 * Silhouette (R10): a wedge — a massive tall head with big downturned lips, tapering to a narrow
 * tail root and a rounded fan tail. Front-heavy, unlike every other fish in the cast.
 * Personality: unbothered, enormous, grumpy-sweet. Signature: a slow, huge yawn (the lower lip
 * drops), then heavy half-lids.
 */
import { blob, defineArt, ellipse, join, xform } from '../kit.ts';

// drawn on a round grid, then flattened top-to-bottom so the wedge is long and low (R12: it must not
// read as the plump clownfish)
const SY = 0.74;
const Y = (d: string) => xform(d, { sy: SY });

// the wedge: tall forehead and jowls at the front, narrowing to the tail root at −24
const body = blob([
  [34, 2],
  [32, -20],
  [20, -34],
  [4, -32],
  [-10, -18],
  [-22, -7],
  [-29, -4],
  [-29, 4],
  [-22, 6],
  [-10, 13],
  [4, 26],
  [20, 30],
  [30, 20],
]);
const tail = blob(
  [
    [-25, -5],
    [-32, -13],
    [-39, -13],
    [-42.5, -5],
    [-42.5, 5],
    [-39, 13],
    [-32, 13],
    [-25, 5],
  ],
  0.9,
);
// a long, low dorsal along the back
const dorsal = blob(
  [
    [8, -28],
    [-2, -31],
    [-12, -24],
    [-20, -13],
    [-12, -14],
  ],
  0.95,
);
const anal = blob(
  [
    [-8, 15],
    [-14, 21],
    [-21, 18],
    [-22, 8],
  ],
  0.95,
);
// the big lips: a thick upper lip over the snout and a heavy, downturned lower lip (the jaw group)
// the big lips: a thick, downturned lower lip that juts forward (the jaw group, it drops to yawn)
const lowerLip = blob([
  [22, 6],
  [32, 4],
  [39, 7],
  [40, 15],
  [33, 20],
  [22, 16],
]);
const pectoral = ellipse(0, 12, 6, 3.2, 24);
// tan saddle blotches (R18 saddle), placed by hand
const saddles = join(
  ellipse(4, -22, 9, 6, 0),
  ellipse(-12, -14, 7, 5, 20),
  ellipse(-22, -2, 5, 6, 0),
  ellipse(-6, 6, 5, 4, 0),
);

export default defineArt({
  id: 'grouper',
  klass: 'fish',
  size: 'L',
  feature: 'a front-heavy wedge: massive head, big downturned lips, rounded fan tail',
  personality: ['unbothered', 'enormous', 'grumpy-sweet'],
  palette: { body: '#94735A', accent: '#D2B48A' },
  groups: [
    {
      id: 'tail',
      pivot: [-27, 0],
      parts: [
        { d: Y(tail), role: 'body' },
        { d: Y(ellipse(-36, -6, 4, 4)), role: 'accent', kind: 'pattern' },
        { d: Y(ellipse(-37, 7, 3.4, 3.4)), role: 'accent', kind: 'pattern' },
      ],
    },
    {
      id: 'body',
      parts: [
        { d: Y(dorsal), role: 'body' },
        { d: Y(anal), role: 'body' },
        { d: Y(body), role: 'body' },
        { d: Y(ellipse(10, 25, 28, 9)), role: 'belly', kind: 'pattern' },
        { d: Y(saddles), role: 'accent', kind: 'pattern', alpha: 0.85 },
      ],
    },
    { id: 'finA', pivot: [-2, 7.5], parts: [{ d: Y(pectoral), role: 'body' }] },
    { id: 'jaw', pivot: [24, 6.5], parts: [{ d: Y(lowerLip), role: 'body' }] },
  ],
  shine: Y(ellipse(20, -16, 9, 3.6, -20)),
  face: {
    eyes: [[13, 1]],
    eye: 10,
    zone: [0, -27, 41, 50],
    mouth: { at: [35, 5.5], w: 6.5, shape: 'flat' },
    sweet: true,
  },
  idle: {
    ambient: [
      { m: 'bob', amp: 1.5, period: 3.2 },
      { m: 'breathe', amp: 0.02, period: 3.2 },
      { m: 'wag', g: 'tail', amp: 6, period: 1.4 },
      { m: 'flutter', g: 'finA', amp: 10, period: 0.9 },
    ],
    signature: {
      dur: 1.5,
      every: [6, 8],
      tracks: [
        {
          g: 'jaw',
          p: 'rot',
          k: [
            [0, 0],
            [0.15, 0],
            [0.4, 34],
            [0.6, 34],
            [0.75, 0],
          ],
        },
        {
          g: 'jaw',
          p: 's',
          k: [
            [0.15, 1],
            [0.4, 1.15],
            [0.6, 1.15],
            [0.75, 1],
          ],
        },
        {
          p: 'rot',
          k: [
            [0, 0],
            [0.4, -5],
            [0.6, -5],
            [0.8, 1],
            [1, 0],
          ],
        },
        {
          p: 'sy',
          k: [
            [0, 1],
            [0.4, 1.04],
            [0.6, 1.04],
            [0.8, 0.97],
            [1, 1],
          ],
        },
      ],
      face: [
        [0.2, 0.68, 'happy'],
        [0.7, 1, 'sleepy'],
      ],
    },
  },
  catch: {
    dur: 0.6,
    tracks: [
      {
        g: 'jaw',
        p: 'rot',
        k: [
          [0, 0],
          [0.4, 18],
          [1, 0],
        ],
      },
      {
        p: 'sy',
        k: [
          [0, 1],
          [0.3, 0.94],
          [0.6, 1.05],
          [1, 1],
        ],
      },
    ],
    face: [[0, 1, 'happy']],
  },
});
