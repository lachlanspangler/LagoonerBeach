/**
 * Flounder — FISH class (flatfish lying on the sand, seen from above-front). Silhouette: a flat
 * pancake (2 : 1) in a pale scalloped rim fin with TWO BIG EYE TURRETS on the top edge, the front one
 * 8 units lower than the back one (R10: the stacked eyes — the joke — exaggerated 1.6×), and only a
 * stub of a tail. Never a puffer: flat, spineless, wide. Personality: wry, flat, watchful.
 * Signature: the eyes glance down, then up surprised, then it flops flat (squash 1.1 / 0.85) and winks.
 */
import { blob, circle, defineArt, ellipse, join } from '../kit.ts';

const body = ellipse(0, 11, 34, 11);
// the rim fin: a softly scalloped frill all the way round (18 lobes, alternating radius)
const rim = blob(
  Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2;
    const k = i % 2 ? 0.93 : 1;
    return [-2 + 40 * k * Math.cos(a), 11 + 14.5 * k * Math.sin(a)] as const;
  }),
);
// eye turrets: big domes on the top edge; the back one sits 8 units higher
const turrets = join(circle(6, -8, 9), circle(22, 0, 8.4));
const tail = blob([
  [-38, 7],
  [-42, 5.5],
  [-44, 8],
  [-44, 14],
  [-42, 16.5],
  [-38, 15],
]);
const spots = join(circle(-25, 10, 3.8), circle(-12, 16, 3.6), circle(3, 17, 3.2));
const rays = join(
  'M-30 -3L-34 -7',
  'M-17 -6L-19 -11',
  'M-30 21L-34 25',
  'M-16 24L-18 29',
  'M0 25L0 30',
  'M16 23L18 28',
  'M29 18L33 21',
);

export default defineArt({
  id: 'flounder',
  klass: 'fish',
  size: 'M',
  feature: 'a flat pancake in a pale rim fin with two big eye turrets on top, one 8 units higher',
  personality: ['wry', 'flat', 'watchful'],
  palette: { body: '#C79A68', accent: '#7A5636', belly: '#EED9B4' },
  groups: [
    { id: 'tail', pivot: [-37, 9], parts: [{ d: tail, role: 'belly' }] },
    {
      id: 'rim',
      pivot: [-2, 9],
      parts: [
        { d: rim, role: 'belly' },
        { d: rays, role: 'ink', kind: 'line', w: 3, alpha: 0.25 },
      ],
    },
    {
      id: 'body',
      seamless: true,
      parts: [
        { d: body, role: 'body' },
        { d: spots, role: 'accent', kind: 'pattern' },
        { d: ellipse(-2, 22, 26, 3.5), role: 'ink', kind: 'pattern', alpha: 0.1 },
        // the wry half-smile: only the front corner of the flat mouth curls up
        { d: 'M31.5 11.4Q33.6 11 34.4 8.8', role: 'ink', kind: 'line', w: 3 },
      ],
    },
    // the eye turrets ride their own seamless layer (the face draws on it), so the pancake rests level
    { id: 'eyes', pivot: [13, 2], seamless: true, parts: [{ d: turrets, role: 'body' }] },
  ],
  shine: ellipse(-10, 3, 11, 2.8, -4),
  face: {
    g: 'eyes',
    eyes: [
      [6, -8],
      [22, 0],
    ],
    eye: 9.6,
    front: true,
    zone: [-4, -30, 36, 40],
    mouth: { at: [29.5, 11], w: 7, shape: 'flat' },
  },
  deviations: {
    R7: 'flounder eyes sit stacked on the top edge, one 8 units higher (appendix: "Eyes stacked: the joke")',
  },
  ground: true,
  idle: {
    ambient: [
      { m: 'bob', amp: 1, period: 2.8 },
      { m: 'wag', g: 'tail', amp: 8, period: 1.2 },
      { m: 'pulse', g: 'rim', amp: 0.02, period: 1.1 },
    ],
    signature: {
      dur: 1.5,
      every: [5, 8],
      tracks: [
        {
          p: 'rot',
          k: [
            [0, 0],
            [0.12, -4],
            [0.28, 4],
            [0.42, 0],
          ],
        },
        {
          p: 'sy',
          k: [
            [0, 1],
            [0.46, 1],
            [0.54, 1.08],
            [0.66, 0.85],
            [0.84, 0.88],
            [0.94, 1.03],
            [1, 1],
          ],
        },
        {
          p: 'sx',
          k: [
            [0, 1],
            [0.46, 1],
            [0.54, 0.95],
            [0.66, 1.1],
            [0.84, 1.08],
            [0.94, 0.98],
            [1, 1],
          ],
        },
        {
          g: 'rim',
          p: 'sy',
          k: [
            [0, 1],
            [0.62, 1],
            [0.7, 1.08],
            [0.8, 1],
          ],
        },
      ],
      face: [
        [0.04, 0.22, 'shy'],
        [0.3, 0.42, 'surprised'],
        [0.62, 0.9, 'happy'],
        [0.9, 1, 'wink'],
      ],
    },
  },
});
