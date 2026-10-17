/**
 * Hammerhead — SHARK class, three-quarter front view (it swims toward us and a little right).
 * Silhouette: the signature T (R10, exaggerated): a wide horizontal hammer across the front, its
 * span ≈ 1.3× the body, with an eye on each round tip (`face.profile`: two eyes, profile rules);
 * the plump body recedes behind it with a tall rounded dorsal and a crescent tail. The right tip
 * breaks the XL tile frame by ~3 px (R28).
 * Personality: earnest, curious, wide-eyed. Signature: scans left and right with the hammer
 * ("sees every direction"), then a pleased little nod.
 */
import { blob, circle, defineArt, ellipse, join, tube } from '../kit.ts';

// the body seen from the front-left: a plump teardrop running back and up behind the hammer
const body = blob([
  [26, 2],
  [18, -10],
  [2, -16],
  [-16, -14],
  [-28, -7],
  [-33, 0],
  [-27, 6],
  [-12, 12],
  [6, 15],
  [20, 12],
]);
const dorsal = blob([
  [2, -14],
  [-4, -28],
  [-9, -37],
  [-14, -33],
  [-16, -13],
]);
const tail = blob([
  [-29, -3],
  [-36, -14],
  [-42, -25],
  [-45, -19],
  [-42, -4],
  [-44, 9],
  [-40, 11],
  [-31, 4],
]);
// the hammer: a wide bar, a touch smile-curved, with round lobes at the tips; the lobes are `extra`
// so the bar's span can break the frame without shrinking the shark
const bar = blob([
  [-14, -4],
  [4, -1.5],
  [12, -0.5],
  [22, -1.5],
  [35, -5],
  [35, 8],
  [22, 10.5],
  [12, 11.5],
  [4, 10.5],
  [-14, 10],
]);
const lobes = join(circle(-16, 3, 8.6), circle(36.5, 1.5, 8.2));
// the chin under the middle of the hammer carries the little smile
const chin = ellipse(12, 11, 9, 6);
const pectoral = tube([
  [-6, 12, 5.4],
  [-12, 19, 4.6],
  [-18, 23, 3.2],
]);

export default defineArt({
  id: 'hammerhead',
  klass: 'shark',
  size: 'XL',
  feature: 'a wide horizontal T hammer with an eye on each round tip, tall dorsal behind',
  personality: ['earnest', 'curious', 'wide-eyed'],
  palette: { body: '#6889BA', belly: '#E6ECF4' },
  groups: [
    { id: 'tail', pivot: [-30, 0], parts: [{ d: tail, role: 'body' }] },
    // the dorsal is its own layer behind the body, so the body itself rests level (R5T)
    { id: 'dorsal', pivot: [-8, -14], parts: [{ d: dorsal, role: 'body' }] },
    {
      id: 'body',
      parts: [
        { d: body, role: 'body' },
        { d: ellipse(-6, 16, 26, 7, -6), role: 'belly', kind: 'pattern' },
      ],
    },
    { id: 'finA', pivot: [-6, 11], parts: [{ d: pectoral, role: 'body' }] },
    {
      id: 'head',
      pivot: [12, 6],
      parts: [
        { d: chin, role: 'belly' },
        { d: bar, role: 'body' },
        { d: lobes, role: 'body', extra: true },
        { d: ellipse(12, 11, 30, 3.4), role: 'belly', kind: 'pattern' },
      ],
    },
  ],
  shine: ellipse(-2, -9, 10, 3.2, -10),
  face: {
    g: 'head',
    eyes: [
      [-16, 1.5],
      [36.5, 0],
    ],
    eye: 8.4,
    zone: [-24, -20, 70, 36],
    mouth: { at: [12, 13], w: 6, shape: 'smile' },
    profile: true,
    sweet: true,
  },
  idle: {
    ambient: [
      { m: 'bob', amp: 1.5, period: 3.2 },
      { m: 'wag', g: 'tail', amp: 7, period: 1.4 },
      { m: 'flutter', g: 'finA', amp: 8, period: 1.6 },
      { m: 'sway', g: 'head', amp: 2, period: 3.2, phase: 0.25 },
    ],
    signature: {
      dur: 1.5,
      every: [5, 8],
      tracks: [
        {
          g: 'head',
          p: 'rot',
          k: [
            [0, 0],
            [0.15, -9],
            [0.35, -9],
            [0.5, 9],
            [0.7, 9],
            [0.85, -2],
            [1, 0],
          ],
        },
        {
          g: 'head',
          p: 'tx',
          k: [
            [0, 0],
            [0.15, -3],
            [0.35, -3],
            [0.5, 3],
            [0.7, 3],
            [0.85, 0],
          ],
        },
        {
          p: 'ty',
          k: [
            [0, 0],
            [0.8, 0],
            [0.88, 2],
            [1, 0],
          ],
        },
      ],
      face: [
        [0.12, 0.75, 'surprised'],
        [0.85, 1, 'happy'],
      ],
    },
  },
  catch: {
    dur: 0.5,
    tracks: [
      {
        g: 'tail',
        p: 'rot',
        k: [
          [0, 0],
          [0.25, 16],
          [0.5, -16],
          [0.75, 10],
          [1, 0],
        ],
      },
      {
        g: 'head',
        p: 'rot',
        k: [
          [0, 0],
          [0.3, -8],
          [0.65, 6],
          [1, 0],
        ],
      },
      {
        p: 'sy',
        k: [
          [0, 1],
          [0.2, 0.95],
          [0.45, 1.05],
          [1, 1],
        ],
      },
    ],
    face: [[0, 1, 'happy']],
  },
});
