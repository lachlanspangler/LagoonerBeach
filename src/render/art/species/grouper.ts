/**
 * Grouper — the big, unbothered boss of the reef (fish class, profile view, level).
 * Silhouette (R10): an enormous helmet of a head (70 u tall, the tallest head in the fish family)
 * on a thick, even body that never thins to a stalk (tail root 31 u = 45 % of the depth, never a
 * trumpet), a long low dorsal, and a broad rounded fan tail; small pouty lips sat on the snout.
 * Coral-grouper red with pale-blue spots.
 * Personality: unbothered, enormous, grumpy-sweet; rests `drowsy` with a pout (half-lids are its
 * personality; no blush, which read tipsy at tile size). Signature: a slow, huge yawn — the lower
 * lip drops — then a moment of heavy half-lids before it settles.
 */
import { blob, circle, defineArt, ellipse, join } from '../kit.ts';

// the helmet head: tall and blunt, with the snout set low; behind the gill the body steps down
// to a thick, level trunk that runs straight to the tail root
const body = blob([
  [39, 11],
  [36.5, -5],
  [29.2, -24.6],
  [20, -35.1],
  [6, -30.9],
  [-9, -17.5],
  [-25, -15.7],
  [-29.5, 0],
  [-25, 15.7],
  [-9, 17.5],
  [6, 30.9],
  [23, 35.1],
  [37.5, 22.5],
]);
// a broad rounded fan tail, slightly cupped at the trailing edge
const tail = blob(
  [
    [-24, -11.7],
    [-30, -15.7],
    [-37, -23.5],
    [-41.5, -13.5],
    [-40, 0],
    [-41.5, 13.5],
    [-37, 23.5],
    [-30, 15.7],
    [-24, 11.7],
  ],
  0.9,
);
// the dorsal: a long, low soft fin hugging the back, nape to tail root (three soft scallops)
const dorsal = blob(
  [
    [16, -32],
    [9, -37.5],
    [1, -33.5],
    [-7, -23.5],
    [-17, -19.6],
    [-24, -17],
    [-22, -14],
    [-8, -17],
    [2, -25],
  ],
  0.85,
);
// small pouty lips sat on the snout (≤ 0.9 eye widths): the upper on the head, the lower on
// the jaw (it juts a little: the grumpy underbite) so it can drop for the yawn
const upperLip = ellipse(37.3, 4.5, 5, 3.2, -14);
const lowerLip = ellipse(37.6, 10.5, 5, 3.5, 10);
// the pectoral: an unoutlined belly-tone fan behind the gill line (an outlined one under the eye
// read as a second mouth)
const pectoral = ellipse(-4, 7, 8, 3.6, 24);
// pale-blue spots (R18 spots, ≥ 6 u), placed by hand on the flank, clear of the eye
const spots = join(
  circle(-4, -11, 3.4),
  circle(-15, -2, 3.3),
  circle(-6, 1.5, 3),
  circle(-20, -11, 3),
  circle(4, -18, 3),
);

export default defineArt({
  id: 'grouper',
  klass: 'fish',
  size: 'L',
  feature: 'an enormous helmet head on a thick trunk, small pouty lips, pale-blue spots, rounded fan tail',
  personality: ['unbothered', 'enormous', 'grumpy-sweet'],
  restExpression: 'drowsy',
  palette: { body: '#C0674A', accent: '#BFE6F7', belly: '#C9A08A' },
  groups: [
    {
      id: 'tail',
      pivot: [-26, 0],
      parts: [
        { d: tail, role: 'body' },
        { d: join(circle(-37, -7, 3.2), circle(-38, 6.5, 3.1)), role: 'accent', kind: 'pattern' },
      ],
    },
    {
      id: 'body',
      parts: [
        { d: dorsal, role: 'body' },
        { d: body, role: 'body' },
        { d: upperLip, role: 'belly' },
        { d: ellipse(8, 21, 28, 6.5), role: 'belly', kind: 'pattern', alpha: 0.6 },
        // the open mouth behind the lower lip, only seen when it drops for the yawn
        { d: ellipse(36.5, 9.5, 3.6, 3), role: 'ink', kind: 'pattern' },
        { d: spots, role: 'accent', kind: 'pattern' },
      ],
    },
    { id: 'finA', pivot: [3, 4], parts: [{ d: pectoral, role: 'belly', outline: false }] },
    { id: 'jaw', pivot: [36, 8], parts: [{ d: lowerLip, role: 'belly' }] },
  ],
  shine: ellipse(20, -15, 9, 3.6, -20),
  face: {
    eyes: [[14, -5]],
    eye: 12.6, // CRITIQUE-4: +15 % (was 11)
    zone: [-2, -35, 42, 53],
    // grumpy-sweet: the pout is the lips themselves; a short seam between them
    mouth: { at: [39.5, 7.6], w: 5, shape: 'flat' },
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
        [0.2, 0.62, 'happy'],
        [0.66, 0.92, 'drowsy'],
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
