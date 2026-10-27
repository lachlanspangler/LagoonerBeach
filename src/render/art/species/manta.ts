/**
 * Manta Ray — WING class, epic (seen from above, gliding toward you). Silhouette: a wide landscape
 * chevron of two great level wings (span ≈ 1.7× the length) round a plump head, with two cephalic
 * fins curling inward in front of the face, under the mouth (R10: the wingspan and the curls).
 * Dark identity lifted to a dusk indigo (R16, off the Deep Water blues) with a pale leading-edge rim.
 * Personality: majestic, friendly, waving — a broad, easy smile. Signature: waves one wingtip at you.
 */
import { blob, capsule, defineArt, ellipse, join, tube, xform } from '../kit.ts';

// seen from above, gliding toward you (front = down). The right wing: a level, gently swept back
// edge, a rounded tip, and the pale leading edge facing us
const wingR = blob([
  [10, -19],
  [24, -16],
  [36, -9],
  [42, -1],
  [39, 4],
  [27, 6.5],
  [14, 11],
]);
const wingL = xform(wingR, { sx: -1 });
const rimR = tube([
  [14, 10.5, 2.6],
  [27, 6, 2.8],
  [38, 3.5, 2.6],
  [42, -1, 2.2],
]);
// a broad rounded head-and-body the wings flow out of, the face on its front half
const head = blob([
  [0, -25],
  [15, -20],
  [21.5, -4],
  [16.5, 10],
  [0, 15.5],
  [-16.5, 10],
  [-21.5, -4],
  [-15, -20],
]);
// cephalic fins: two short rolled scrolls on the front corners, curling inward round the smile
const lobeR = tube([
  [16.5, 6, 2.8],
  [17, 12.5, 2.7],
  [13, 16, 2.5],
  [10.5, 14, 2.5],
]);
const lobes = join(lobeR, xform(lobeR, { sx: -1 }));
// only a short stub of the tail shows behind the head
const tail = capsule(0, -20, 3, 1, -30, 2.5);

export default defineArt({
  id: 'manta',
  klass: 'wing',
  size: 'XL',
  tileScale: 0.9,
  feature: 'a wide level chevron of great rounded wings with two fins curling inward under a smiling face',
  personality: ['majestic', 'friendly', 'waving'],
  palette: { body: '#7A72B8', belly: '#E9EEF5' },
  groups: [
    { id: 'tail', pivot: [0, -20], parts: [{ d: tail, role: 'body' }] },
    {
      id: 'wingL',
      pivot: [-10, -4],
      parts: [
        { d: wingL, role: 'body' },
        // R28: the wingtip breaks the tile frame by ~3 px (extra: outside the body box)
        { d: capsule(-38, -4, 3.6, -44.5, -2, 3), role: 'body', extra: true },
        { d: xform(rimR, { sx: -1 }), role: 'belly', kind: 'pattern' },
      ],
    },
    {
      id: 'wingR',
      pivot: [10, -4],
      parts: [
        { d: wingR, role: 'body' },
        { d: capsule(38, -4, 3.6, 44.5, -2, 3), role: 'body', extra: true },
        { d: rimR, role: 'belly', kind: 'pattern' },
      ],
    },
    {
      id: 'body',
      parts: [
        { d: head, role: 'body' },
        { d: ellipse(0, 10, 13, 5), role: 'belly', kind: 'pattern', alpha: 0.45 },
      ],
    },
    {
      id: 'lobes',
      pivot: [0, 10],
      parts: [
        { d: lobes, role: 'body' },
        { d: lobes, role: 'belly', kind: 'pattern', alpha: 0.45 },
      ],
    },
  ],
  shine: ellipse(-7, -17, 7, 2.4, -10),
  face: {
    eyes: [
      [-7.6, -2.5],
      [7.6, -2.5],
    ],
    eye: 8.6,
    front: true,
    zone: [-18, -24, 36, 36],
    mouth: { at: [0, 8], w: 7, shape: 'smile' },
    sweet: true,
  },
  idle: {
    ambient: [
      { m: 'bob', amp: 2, period: 2.4 },
      { m: 'sway', g: 'wingR', amp: 7, period: 2 },
      { m: 'sway', g: 'wingL', amp: 7, period: 2, phase: 0.5 },
      { m: 'sway', g: 'lobes', amp: 3, period: 2, phase: 0.25 },
      { m: 'wag', g: 'tail', amp: 10, period: 2, phase: 0.15 },
    ],
    signature: {
      dur: 1.5,
      every: [5, 8],
      tracks: [
        {
          g: 'wingR',
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
