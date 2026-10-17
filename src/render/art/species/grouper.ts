/**
 * Grouper — the lagoon's enormous, unbothered uncle (fish class, profile view, level).
 * Silhouette (R10): a front-heavy wedge — a massive head (60 % of the length) with big pouty lips
 * centred on the snout, tapering to a narrow tail root and a rounded fan tail.
 * Personality: unbothered, enormous, grumpy-sweet; rests `drowsy` (heavy half-lids, its personality).
 * Signature: a slow, huge yawn — the lower lip drops — then it settles back into its half-lids.
 */
import { blob, defineArt, ellipse, join } from '../kit.ts';

// the wedge: a tall, blunt head and jowls at the front, narrowing to the tail root at −24
const body = blob([
  [27, -4],
  [27, -19],
  [18, -31],
  [4, -32],
  [-4, -22],
  [-12, -9],
  [-20, -5],
  [-29, -4.5],
  [-29, 3.5],
  [-20, 4],
  [-12, 7],
  [-4, 15],
  [6, 19],
  [18, 19.5],
  [26, 14],
]);
// rounded fan tail
const tail = blob(
  [
    [-27, -3],
    [-33, -10],
    [-38, -17],
    [-41.5, -11],
    [-42.5, 0],
    [-41.5, 11],
    [-38, 17],
    [-33, 10],
    [-27, 3],
  ],
  0.95,
);
// a low spiny-soft dorsal along the back
const dorsal = blob(
  [
    [12, -28],
    [2, -35],
    [-8, -27],
    [-9, -16],
  ],
  0.95,
);
// big pouty lips centred on the snout: a thick upper lip on the body, the lower lip on the jaw
const upperLip = ellipse(30.5, 1, 8, 5.4, -6);
const lowerLip = ellipse(30.5, 10.5, 8.6, 6, 6);
const pectoral = ellipse(-2, 12, 6, 3.2, 28);
// three large, soft saddles (R18 saddle), placed by hand, well behind the face
const saddles = join(ellipse(2, -31, 12, 10, 0), ellipse(-14, -15, 8, 8, 20), ellipse(-7, 11, 7, 6, 0));

export default defineArt({
  id: 'grouper',
  klass: 'fish',
  size: 'L',
  feature: 'a front-heavy wedge: massive head, big pouty lips on the snout, rounded fan tail',
  personality: ['unbothered', 'enormous', 'grumpy-sweet'],
  palette: { body: '#A8703F', accent: '#CDAE84', belly: '#D9A98E' },
  restExpression: 'drowsy',
  groups: [
    {
      id: 'tail',
      pivot: [-25, 0],
      parts: [
        { d: tail, role: 'body' },
        { d: ellipse(-38, -7, 4, 4), role: 'accent', kind: 'pattern' },
        { d: ellipse(-39, 7, 3.6, 3.6), role: 'accent', kind: 'pattern' },
      ],
    },
    {
      id: 'body',
      parts: [
        { d: dorsal, role: 'body' },
        { d: body, role: 'body' },
        { d: upperLip, role: 'belly' },
        { d: ellipse(10, 27, 26, 8), role: 'belly', kind: 'pattern', alpha: 0.7 },
        { d: saddles, role: 'accent', kind: 'pattern' },
      ],
    },
    { id: 'finA', pivot: [-5, 10], parts: [{ d: pectoral, role: 'body' }] },
    { id: 'jaw', pivot: [29, 6], parts: [{ d: lowerLip, role: 'belly' }] },
  ],
  shine: ellipse(18, -18, 9, 3.6, -20),
  face: {
    eyes: [[13, -2]],
    eye: 11,
    zone: [-2, -31, 40, 50],
    mouth: { at: [35, 6], w: 6, shape: 'flat' },
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
            [0.4, 28],
            [0.62, 28],
            [0.78, 0],
          ],
        },
        {
          g: 'jaw',
          p: 'ty',
          k: [
            [0.15, 0],
            [0.4, 3],
            [0.62, 3],
            [0.78, 0],
          ],
        },
        {
          p: 'rot',
          k: [
            [0, 0],
            [0.4, -5],
            [0.62, -5],
            [0.82, 1],
            [1, 0],
          ],
        },
        {
          p: 'sy',
          k: [
            [0, 1],
            [0.4, 1.04],
            [0.62, 1.04],
            [0.82, 0.97],
            [1, 1],
          ],
        },
      ],
      face: [
        [0.2, 0.7, 'happy'],
        [0.72, 1, 'drowsy'],
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
