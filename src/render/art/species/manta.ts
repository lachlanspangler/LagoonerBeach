/**
 * Manta Ray — WING class, epic (seen from above, flying right). Silhouette: a tall swept-back
 * chevron of two great pointed-but-rounded wings, two curled head fins (cephalic lobes) at the front
 * and only a stub of a tail (R10: the wingspan and the lobes). Dark identity lifted to slate
 * (R16) with a white belly showing on the wing edges and white shoulder patches.
 * Personality: majestic, friendly, waving. Signature: waves one wingtip back at you.
 */
import { blob, capsule, defineArt, ellipse, join, tube, xform } from '../kit.ts';

const wingU = blob([
  [26, -9],
  [10, -22],
  [-10, -36],
  [-22, -42],
  [-25, -37],
  [-16, -24],
  [-14, -10],
  [0, -6],
]);
const wingL = xform(wingU, { sy: -1 });
// a broad rounded diamond body the wings flow out of (not a sausage)
const torso = blob([
  [35, 0],
  [30, -12],
  [14, -19],
  [-6, -15],
  [-20, -5],
  [-20, 5],
  [-6, 15],
  [14, 19],
  [30, 12],
]);
// cephalic lobes: two short horns pointing forward, curling in at the tips
const lobe = tube([
  [27, -10, 4.8],
  [35, -11, 4.2],
  [40, -8, 3.6],
]);
const lobes = join(lobe, xform(lobe, { sy: -1 }));
const tail = capsule(-20, 0, 3, -36, 1, 2.5);

export default defineArt({
  id: 'manta',
  klass: 'wing',
  size: 'XL',
  feature: 'a tall swept-back chevron of great rounded wings with two curled head fins and a stub tail',
  personality: ['majestic', 'friendly', 'waving'],
  palette: { body: '#6681A6', belly: '#E8EEF2' },
  groups: [
    { id: 'tail', pivot: [-20, 0], parts: [{ d: tail, role: 'body', extra: true }] },
    {
      id: 'wingU',
      pivot: [4, -8],
      parts: [
        { d: wingU, role: 'body' },
        { d: ellipse(-20, -28, 4, 14, 8), role: 'belly', kind: 'pattern' },
        { d: ellipse(4, -15, 9, 4, -36), role: 'white', kind: 'pattern', alpha: 0.55 },
      ],
    },
    {
      id: 'wingL',
      pivot: [4, 8],
      parts: [
        { d: wingL, role: 'body' },
        { d: ellipse(-20, 28, 4, 14, -8), role: 'belly', kind: 'pattern' },
        { d: ellipse(4, 15, 9, 4, 36), role: 'white', kind: 'pattern', alpha: 0.55 },
      ],
    },
    {
      id: 'body',
      parts: [
        { d: lobes, role: 'body' },
        { d: torso, role: 'body' },
        { d: ellipse(-2, 0, 16, 6), role: 'ink', kind: 'pattern', alpha: 0.08 },
      ],
    },
  ],
  shine: ellipse(8, -11, 9, 3, -10),
  face: {
    eyes: [
      [17, -4],
      [27, -4],
    ],
    eye: 6.6,
    front: true,
    zone: [8, -20, 30, 28],
    mouth: { at: [22, 6], w: 5, shape: 'smile' },
    sweet: true,
  },
  idle: {
    ambient: [
      { m: 'bob', amp: 2, period: 2.4 },
      { m: 'sway', g: 'wingU', amp: 7, period: 2 },
      { m: 'sway', g: 'wingL', amp: 7, period: 2, phase: 0.5 },
      { m: 'wave', g: 'tail', amp: 8, period: 2, phase: 0.15 },
    ],
    signature: {
      dur: 1.5,
      every: [5, 8],
      tracks: [
        {
          g: 'wingU',
          p: 'rot',
          k: [
            [0, 0],
            [0.12, 6],
            [0.28, -18],
            [0.44, 6],
            [0.6, -18],
            [0.76, 4],
            [0.9, 0],
          ],
        },
        {
          p: 'rot',
          k: [
            [0, 0],
            [0.2, -5],
            [0.8, -5],
            [1, 0],
          ],
        },
      ],
      face: [
        [0.2, 0.8, 'happy'],
        [0.85, 1, 'wink'],
      ],
    },
  },
});
