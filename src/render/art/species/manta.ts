/**
 * Manta Ray — WING class, epic (seen from above, flying right). Silhouette: a tall swept-back
 * chevron of two great pointed-but-rounded wings, two curled head fins (cephalic lobes) at the front
 * and only a stub of a tail (R10: the wingspan and the lobes). Dark identity lifted to slate
 * (R16) with a white belly showing on the wing edges and white shoulder patches.
 * Personality: majestic, friendly, waving. Signature: waves one wingtip back at you.
 */
import { blob, capsule, defineArt, ellipse, join, tube, xform } from '../kit.ts';

const wingU = blob([
  [22, -9],
  [8, -21],
  [-8, -35],
  [-20, -42],
  [-24, -37],
  [-15, -24],
  [-10, -10],
  [2, -6],
]);
const wingL = xform(wingU, { sy: -1 });
// a broad rounded diamond body the wings flow out of (not a sausage)
const torso = blob([
  [28, 0],
  [24, -11],
  [10, -16],
  [-2, -13],
  [-12, -5],
  [-12, 5],
  [-2, 13],
  [10, 16],
  [24, 11],
]);
// cephalic lobes: two clear horns pointing forward and curling inward at the tips
const lobe = tube([
  [20, -9.5, 4.8],
  [28, -12.5, 4.2],
  [33.5, -10.5, 3.6],
]);
const lobes = join(lobe, xform(lobe, { sy: -1 }));
const tail = capsule(-11, 0, 3, -30, 1, 2.5);

export default defineArt({
  id: 'manta',
  klass: 'wing',
  size: 'XL',
  feature: 'a tall swept-back chevron of great rounded wings with two curled head fins and a stub tail',
  personality: ['majestic', 'friendly', 'waving'],
  palette: { body: '#5E82B5', belly: '#E8EEF2' },
  groups: [
    { id: 'tail', pivot: [-11, 0], parts: [{ d: tail, role: 'body', extra: true }] },
    {
      id: 'wingU',
      pivot: [2, -8],
      parts: [
        { d: wingU, role: 'body' },
        // R28: the wingtip breaks the tile frame by ~3 px (extra: outside the body box)
        { d: capsule(-17, -35, 4.8, -21.5, -44.4, 3.6), role: 'body', extra: true },
        { d: ellipse(-18, -23.4, 3.6, 16, -27), role: 'belly', kind: 'pattern' },
        { d: ellipse(0, -16, 9, 4, -36), role: 'white', kind: 'pattern', alpha: 0.55 },
      ],
    },
    {
      id: 'wingL',
      pivot: [2, 8],
      parts: [
        { d: wingL, role: 'body' },
        { d: capsule(-17, 35, 4.8, -21.5, 44.4, 3.6), role: 'body', extra: true },
        { d: ellipse(-18, 23.4, 3.6, 16, 27), role: 'belly', kind: 'pattern' },
        { d: ellipse(0, 16, 9, 4, 36), role: 'white', kind: 'pattern', alpha: 0.55 },
      ],
    },
    {
      id: 'body',
      parts: [
        { d: lobes, role: 'body' },
        { d: torso, role: 'body' },
        { d: ellipse(-4, 0, 12, 5), role: 'ink', kind: 'pattern', alpha: 0.08 },
      ],
    },
  ],
  shine: ellipse(4, -10, 8, 2.6, -10),
  face: {
    eyes: [
      [10, -2],
      [21, -2],
    ],
    eye: 8,
    front: true,
    zone: [1, -21, 30, 33],
    mouth: { at: [15.5, 7], w: 5, shape: 'smile' },
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
