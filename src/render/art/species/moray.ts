/**
 * Moray Eel — LONG class (profile, level). Silhouette: a thick eel leaning out of a dark hole in a
 * round rock, with a huge blunt head (1.4× the body's thickness) and a wide toothy grin (R10: the
 * head and the grin). A lighter frill band rides the back; four big yellow spots in three sizes.
 * Personality: toothy, grinning, friendly — a sunny grin whose rear corner curls up 6 u.
 * Signature: leans further out of its hole, the grin opens wide, then a wink.
 * Groups: rock (with the hole) behind, the eel, then the rock's front lip that hides its tail.
 */
import { blob, circle, defineArt, ellipse, join, tube } from '../kit.ts';

const rock = blob([
  [-43, 8],
  [-40, -9],
  [-31, -15],
  [-21, -12],
  [-16, 0],
  [-16, 17],
  [-23, 26],
  [-36, 26],
  [-43, 19],
]);
const lip = blob([
  [-36, 16],
  [-26, 13],
  [-16, 15],
  [-17, 22],
  [-24, 26],
  [-35, 25],
]);
// out of the hole, a small dip, then the head rises: the body narrows at the hole (a neck)
const body = tube([
  [-24, 3, 8],
  [-12, 5, 9],
  [0, 5, 10],
  [9, 4, 11],
  [15, 1, 11.5],
]);
const head = ellipse(23.5, -2, 16.4, 15.5, -4);
const frill = tube([
  [-18, -2.5, 2.8],
  [-8, -1.5, 3.4],
  [3, -2, 3.4],
  [10, -9, 2.6],
]);
const spots = join(circle(-12, 7, 3.4), circle(-1, 4, 4.6), circle(9, 9, 3.2), circle(13, -5, 3.6));

export default defineArt({
  id: 'moray',
  klass: 'long',
  size: 'L',
  feature: 'a thick eel leaning out of a hole in a round rock, with a huge blunt head and a wide toothy grin',
  personality: ['toothy', 'grinning', 'friendly'],
  palette: { body: '#668A42', accent: '#E8D84A', belly: '#B7A58E' },
  groups: [
    {
      id: 'rock',
      pivot: [-26, 26],
      parts: [
        { d: rock, role: 'belly' },
        { d: ellipse(-25, 4, 7.5, 13), role: 'ink', kind: 'pattern', alpha: 0.85 },
        { d: ellipse(-35, -7, 4, 2.2, -30), role: 'white', kind: 'pattern', alpha: 0.35 },
      ],
    },
    {
      id: 'body',
      pivot: [-22, 4],
      parts: [
        { d: frill, role: 'body' },
        { d: body, role: 'body' },
        { d: head, role: 'body' },
        { d: frill, role: 'white', kind: 'pattern', alpha: 0.3 },
        {
          d: tube([
            [-24, 13, 3.4],
            [-6, 16, 3.6],
            [10, 14, 4],
            [26, 11, 6],
          ]),
          role: 'accent',
          kind: 'pattern',
          alpha: 0.35,
        },
        { d: spots, role: 'accent', kind: 'pattern' },
        // the grin's rear corner rises 6 u: a smile crease, never a scowl
        { d: 'M20.6 5.4Q17 4.2 15.6 -1.6', role: 'ink', kind: 'line', w: 3.4 },
      ],
    },
    { id: 'lip', pivot: [-22, 26], parts: [{ d: lip, role: 'belly' }] },
  ],
  shine: ellipse(18, -13, 7, 2.6, -10),
  face: {
    eyes: [[23.5, -9]],
    eye: 10.5,
    zone: [7, -31, 34, 38],
    mouth: { at: [28, 6], w: 14, shape: 'grin' },
    sweet: true,
  },
  ground: true,
  deviations: {
    R7: 'long class (R5): the eye sits in the huge head (the front 30 %), not 34 % back along the body and rock',
    R8: "the moray's wide grin is the guide's named signature exception (R8: grin with two rounded teeth)",
  },
  idle: {
    ambient: [
      { m: 'sway', g: 'body', amp: 3, period: 2.8 },
      { m: 'breathe', g: 'body', amp: 0.015, period: 3.2 },
    ],
    signature: {
      dur: 1.4,
      every: [5, 8],
      tracks: [
        {
          g: 'body',
          p: 'tx',
          k: [
            [0, 0],
            [0.15, -3],
            [0.35, 5],
            [0.75, 5],
            [1, 0],
          ],
        },
        {
          g: 'body',
          p: 'rot',
          k: [
            [0, 0],
            [0.15, 3],
            [0.35, -6],
            [0.75, -6],
            [1, 0],
          ],
        },
        {
          g: 'body',
          p: 's',
          k: [
            [0, 1],
            [0.35, 1.05],
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
  leap: { hide: ['rock', 'lip'] },
});
