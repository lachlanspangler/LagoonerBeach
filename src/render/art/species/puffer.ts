/**
 * Pufferfish — FISH class (profile), size M.
 * Silhouette: a near-perfect ball ringed with short rounded spine nubs, a small fan tail
 * (R10: the ball itself, exaggerated round, with its spines).
 * Personality: nervous, dramatic, relatable. Signature: the puff — gulps, balloons to 1.35×
 * with the spines shooting out and a surprised face, then deflates, embarrassed.
 * Groups (back to front): tail, spines (behind the ball, so only their tips show), body, pectoral fin.
 */
import { blob, capsule, defineArt, ellipse, join } from '../kit.ts';

const CX = 4,
  CY = 0;
const ball = ellipse(CX, CY, 27, 30);
// spine nubs around the rim (angles in degrees, 0 = snout, clockwise with y down); none on the face
const spineAt = (a: number) => {
  const r = (a * Math.PI) / 180;
  const c = Math.cos(r),
    s = Math.sin(r);
  // short at the snout and tail, longer on the back and belly (where a real puffer bristles)
  const len = 3 + 7 * Math.abs(s);
  return capsule(CX + c * 20, CY + s * 21, 3.2, CX + c * (28 + len), CY + s * (29 + len), 2.6);
};
const spines = join(...[-38, -64, -90, -116, -142, 142, 116, 90, 64, 40].map((a) => spineAt(a)));
const tail = blob([
  [-22, -3],
  [-31, -12],
  [-36, -11],
  [-37, 0],
  [-36, 11],
  [-31, 12],
  [-22, 3],
]);
const pectoral = blob([
  [-2, 9],
  [-9, 5],
  [-15, 7],
  [-16, 13],
  [-12, 18],
  [-5, 16],
]);
const finRays = 'M-4 11L-12 9M-4 12L-13 14';
// brown spots on the back only (hand placed, R18)
const spots = join(
  ellipse(-8, -18, 4.2, 3.6),
  ellipse(6, -22, 3.8, 3.4),
  ellipse(-18, -6, 3.8, 3.5),
  ellipse(19, -15, 3.4, 3.2),
  ellipse(-5, -6, 3.4, 3.2),
  ellipse(-16, -23, 3.3, 3.1),
);

export default defineArt({
  id: 'puffer',
  klass: 'fish',
  size: 'M',
  feature: 'a perfect ball ringed with short rounded spines',
  personality: ['nervous', 'dramatic', 'relatable'],
  palette: { body: '#D9C27A', accent: '#8A6E3E', belly: '#F4ECCB' },
  groups: [
    { id: 'tail', pivot: [-25, 0], parts: [{ d: tail, role: 'body' }] },
    { id: 'spines', pivot: [CX, CY], parts: [{ d: spines, role: 'body' }] },
    {
      id: 'body',
      pivot: [CX, CY],
      parts: [
        { d: ball, role: 'body' },
        { d: ellipse(CX + 2, 24, 34, 15), role: 'belly', kind: 'pattern' },
        { d: spots, role: 'accent', kind: 'pattern' },
      ],
    },
    {
      id: 'finA',
      pivot: [-2, 11],
      parts: [
        { d: pectoral, role: 'body' },
        { d: finRays, role: 'ink', kind: 'line', w: 3, alpha: 0.3 },
      ],
    },
  ],
  shine: ellipse(14, -18, 9, 4.2, -30),
  face: {
    eyes: [[13, 2]],
    eye: 13,
    zone: [-2, -31, 41, 58],
    mouth: { at: [29, 9], w: 6, shape: 'pout' },
  },
  idle: {
    ambient: [
      { m: 'bob', amp: 2.5, period: 2.4 },
      { m: 'wag', g: 'tail', amp: 10, period: 0.8 },
      { m: 'flutter', g: 'finA', amp: 18, period: 0.4 },
      { m: 'breathe', g: 'spines', amp: 0.03, period: 2.4 },
    ],
    signature: {
      dur: 1.5,
      every: [5, 8],
      tracks: [
        {
          p: 's',
          k: [
            [0, 1],
            [0.1, 0.94],
            [0.24, 1.38],
            [0.3, 1.33],
            [0.62, 1.35],
            [0.8, 0.96],
            [0.9, 1.02],
            [1, 1],
          ],
        },
        {
          g: 'spines',
          p: 's',
          k: [
            [0, 1],
            [0.12, 1],
            [0.24, 1.16],
            [0.62, 1.14],
            [0.78, 1],
          ],
        },
        {
          p: 'rot',
          k: [
            [0.3, 0],
            [0.36, -3],
            [0.42, 3],
            [0.48, -3],
            [0.54, 2],
            [0.6, 0],
          ],
        },
        {
          g: 'finA',
          p: 'rot',
          k: [
            [0.3, 0],
            [0.34, -30],
            [0.38, 20],
            [0.42, -30],
            [0.46, 20],
            [0.5, -30],
            [0.54, 20],
            [0.6, 0],
          ],
        },
      ],
      face: [
        [0.08, 0.66, 'surprised'],
        [0.66, 1, 'shy'],
      ],
    },
  },
  catch: {
    dur: 0.5,
    tracks: [
      {
        p: 's',
        k: [
          [0, 1],
          [0.15, 0.92],
          [0.4, 1.2],
          [0.75, 1.15],
          [1, 1],
        ],
      },
      {
        g: 'spines',
        p: 's',
        k: [
          [0, 1],
          [0.4, 1.1],
          [0.8, 1.08],
          [1, 1],
        ],
      },
      {
        g: 'tail',
        p: 'rot',
        k: [
          [0, 0],
          [0.3, 20],
          [0.55, -20],
          [0.8, 14],
          [1, 0],
        ],
      },
    ],
    face: [[0, 1, 'happy']],
  },
});
