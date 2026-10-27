/**
 * Moray Eel — LONG class (profile, level head). Silhouette: a thick eel leaning 30° up out of a dark
 * hole in a stone ring, with a big blunt level head and a wide grin with two upper fangs (R10: the
 * head and the grin). A lighter frill band rides the back; five yellow spots in three sizes.
 * CRITIQUE-3 (croc toy on a potato / dog bone at 24 px → moray in its hole): the rock is a 40 × 30 u
 * ring with a dark opening, the eel emerges from it, the body is 15 % slimmer behind the head, and
 * the golden variant never gilds the rock (the ring is the shared white under an ink wash).
 * Personality: toothy, grinning, friendly — a sunny grin whose rear corner curls up.
 * Signature: leans further out of its hole, the grin opens wide, then a wink.
 * Groups: rock (with the hole) behind, then the eel (shaded where it is still inside the hole).
 */
import { blob, circle, defineArt, ellipse, join, tube } from '../kit.ts';

// a lumpy boulder 40 x 30 u with a big dark opening facing us
const rock = blob([
  [-46, 10],
  [-43, -3],
  [-35, -8],
  [-25, -6],
  [-15, -8],
  [-7, -2],
  [-5, 10],
  [-7, 21],
  [-25, 23],
  [-44, 21],
]);
const hole = ellipse(-25, 8.5, 12, 8.5, -6);
// out of the hole at 30°, then the neck bends level into the big head
const body = tube([
  [-25, 9.5, 5],
  [-15, 5, 7],
  [-6, 1, 8.2],
  [4, -4, 8.8],
  [12, -7, 9.4],
]);
const head = ellipse(22, -10, 15.5, 14, -4);
const frill = tube([
  [-16, -1, 2.6],
  [-7, -6.5, 4],
  [2, -11, 4.2],
  [10, -17, 3],
]);
const spots = join(circle(-15, 9, 3.2), circle(-5, 4, 4.4), circle(5, 1, 3.2), circle(10, -11, 3.4), circle(-19, 2, 3));

export default defineArt({
  id: 'moray',
  klass: 'long',
  size: 'L',
  feature: 'a thick eel leaning out of a dark hole in a stone ring, big blunt head, wide two-fang grin',
  personality: ['toothy', 'grinning', 'friendly'],
  // the stone ring is the shared white under an ink wash and the opening is ink: golden remaps
  // body/belly/accent only, so the golden moray never gilds its rock
  palette: { body: '#668A42', accent: '#E8D84A' },
  groups: [
    {
      id: 'rock',
      pivot: [-26, 26],
      parts: [
        { d: rock, role: 'white' },
        { d: rock, role: 'ink', kind: 'pattern', alpha: 0.42 },
        { d: ellipse(-37, -1.5, 5, 2.4, -25), role: 'white', kind: 'pattern', alpha: 0.45 },
        { d: ellipse(-24, 21, 16, 4), role: 'ink', kind: 'pattern', alpha: 0.2 },
        { d: hole, role: 'ink', kind: 'pattern', alpha: 0.92 },
        // a 4 u light lip around the opening: the hole survives at 24 px (CRITIQUE-4: a sock)
        { d: ellipse(-25, 8.5, 14, 10.5, -6), role: 'white', kind: 'line', w: 4, alpha: 0.85 },
      ],
    },
    {
      id: 'body',
      pivot: [-24, 12],
      parts: [
        { d: frill, role: 'body' },
        { d: body, role: 'body' },
        { d: head, role: 'body' },
        { d: frill, role: 'white', kind: 'pattern', alpha: 0.3 },
        // the part of the eel still inside the opening sits in its shadow
        { d: hole, role: 'ink', kind: 'pattern', alpha: 0.55 },
        {
          d: tube([
            [-22, 18, 3.2],
            [-8, 10, 3.4],
            [8, 4, 3.8],
            [26, 2, 5.5],
          ]),
          role: 'accent',
          kind: 'pattern',
          alpha: 0.35,
        },
        { d: spots, role: 'accent', kind: 'pattern' },
        // the grin's rear corner rises: a smile crease, never a scowl
        { d: 'M19 -1.6Q15.6 -2.8 14.4 -8', role: 'ink', kind: 'line', w: 3.4 },
      ],
    },
  ],
  shine: ellipse(17, -20, 7, 2.6, -10),
  face: {
    eyes: [[22.5, -16.5]],
    eye: 10.5,
    zone: [7, -38, 32, 38],
    mouth: { at: [27, -1], w: 14, shape: 'grin' },
    sweet: true,
  },
  ground: true,
  deviations: {
    R5T: 'CRITIQUE-3 asks the eel to emerge 30° up from its hole; the head itself rests level',
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
  leap: { hide: ['rock'] },
});
