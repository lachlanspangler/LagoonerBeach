/**
 * Moray Eel — LONG class (profile). Silhouette: a thick sinuous tube that rises like a "~" into a
 * big blunt head held high, with a pale frill fin riding the back (R10: the raised head and the wide
 * toothy grin). Personality: toothy, grinning, friendly — a grumpy brow over a sunny grin.
 * Signature: the grin opens wide, then a wink.
 */
import { circle, defineArt, ellipse, join, tube } from '../kit.ts';

const tail = tube([
  [-12, 21, 7.8],
  [-24, 24.5, 5.8],
  [-34, 24, 4.2],
  [-40, 20, 2.8],
]);
const body = tube([
  [-14, 21, 8],
  [-2, 15, 9.4],
  [6, 4, 10.4],
  [11, -6, 11],
]);
const head = ellipse(24, -14, 17, 13.5, -16);
const frillBack = tube([
  [-38, 16, 2],
  [-30, 17.5, 2.8],
  [-18, 13.5, 3.4],
]);
const frillFront = tube([
  [-20, 13.5, 3.4],
  [-8, 7, 3.6],
  [-2, -2, 3.2],
  [1, -10, 2.6],
]);
const spots = join(circle(-4, 17, 3.4), circle(6, 7, 2.8), circle(4, -4, 2.4), circle(14, -22, 2.6), circle(13, -6, 3));

export default defineArt({
  id: 'moray',
  klass: 'long',
  size: 'L',
  feature: 'a thick sinuous tube rising into a big blunt raised head with a wide toothy grin and a back frill',
  personality: ['toothy', 'grinning', 'friendly'],
  palette: { body: '#6E8F48', accent: '#E3DB82' },
  groups: [
    {
      // one group: a separate tail layer would draw a seam across the tube
      id: 'body',
      pivot: [-14, 22],
      parts: [
        { d: frillBack, role: 'body' },
        { d: frillFront, role: 'body' },
        { d: tail, role: 'body' },
        { d: body, role: 'body' },
        { d: head, role: 'body' },
        {
          d: tube([
            [-36, 28, 2],
            [-24, 31, 2.6],
            [-12, 29, 2.8],
            [2, 24, 3],
            [14, 10, 3.4],
            [26, 0, 4.6],
          ]),
          role: 'belly',
          kind: 'pattern',
        },
        { d: join(spots, circle(-24, 21, 3), circle(-34, 21, 2.2)), role: 'accent', kind: 'pattern' },
        { d: 'M-38 13C-28 11 -16 8 -8 1C-4 -3 -1 -8 1 -13', role: 'ink', kind: 'line', w: 1.3, alpha: 0.4 },
        // the grumpy brow: a short ink ridge sloping down toward the snout
        { d: 'M18.5 -24C23 -27 28 -27 32.5 -23', role: 'ink', kind: 'line', w: 2.8 },
      ],
    },
  ],
  shine: ellipse(18, -21, 6.5, 2.6, -18),
  face: {
    eyes: [[25, -16]],
    eye: 8,
    zone: [8, -32, 32, 32],
    mouth: { at: [30, -6], w: 10, shape: 'grin' },
  },
  deviations: {
    R7: 'long class (R5): the eye sits in the big raised head (the front 30 %), not 34 % back along the S',
    R8: "the moray's wide grin is the guide's named signature exception (R8: grin with two rounded teeth)",
  },
  idle: {
    ambient: [
      { m: 'bob', amp: 1.8, period: 2.6 },
      { m: 'sway', g: 'body', amp: 3, period: 2.8, phase: 0.3 },
    ],
    signature: {
      dur: 1.4,
      every: [5, 8],
      tracks: [
        {
          g: 'body',
          p: 'rot',
          k: [
            [0, 0],
            [0.15, 5],
            [0.35, -9],
            [0.75, -9],
            [1, 0],
          ],
        },
        {
          p: 'sy',
          k: [
            [0, 1],
            [0.15, 0.92],
            [0.35, 1.08],
            [0.5, 1],
            [1, 1],
          ],
        },
        {
          p: 'sx',
          k: [
            [0, 1],
            [0.15, 1.06],
            [0.35, 0.95],
            [0.5, 1],
            [1, 1],
          ],
        },
      ],
      face: [
        [0.08, 0.3, 'blink'],
        [0.35, 0.78, 'happy'],
        [0.8, 1, 'wink'],
      ],
    },
  },
});
