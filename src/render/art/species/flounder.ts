/**
 * Flounder — FISH class (flatfish lying on the sand, seen from above-front). Silhouette: a wide, flat
 * oval inside a pale frilled rim fin, with BOTH eyes on little turrets poking up from the top edge,
 * one higher than the other (R10: the stacked eyes — the joke). Wide (≈ 1.6 : 1) and flat with a fan
 * tail, so it never reads as a round puffer. Personality: wry, flat, watchful.
 * Signature: the eyes glance down and around, then it flops flat (squash 1.1 / 0.85).
 */
import { blob, circle, defineArt, ellipse, join } from '../kit.ts';

const body = ellipse(0, 6, 33, 13);
// the rim fin: a softly scalloped frill all the way round (18 lobes, alternating radius)
const rim = blob(
  Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2;
    const k = i % 2 ? 0.93 : 1;
    return [-2 + 39 * k * Math.cos(a), 6 + 17.5 * k * Math.sin(a)] as const;
  }),
);
const turrets = join(circle(8, -11, 7), circle(20, -6, 6.4));
const tail = blob([
  [-36, 2],
  [-42, -5],
  [-46, -2],
  [-45, 6],
  [-46, 14],
  [-42, 17],
  [-36, 10],
]);
const spots = join(
  circle(-18, 2, 3.4),
  circle(-6, 12, 3.4),
  circle(-24, 10, 2.8),
  circle(-6, 0, 3),
  circle(8, 10, 3),
  circle(20, 12, 2.6),
);
const rays = join(
  'M-30 -4L-34 -8',
  'M-18 -7L-20 -11',
  'M-6 -8L-6 -12',
  'M-30 16L-34 20',
  'M-16 19L-18 23',
  'M0 20L0 24',
  'M16 18L18 22',
  'M28 13L32 16',
);

export default defineArt({
  id: 'flounder',
  klass: 'fish',
  size: 'M',
  feature: 'a wide flat oval in a frilled rim fin, with both eyes on turrets along the top edge, one higher',
  personality: ['wry', 'flat', 'watchful'],
  palette: { body: '#B49A72', accent: '#7E6A4A', belly: '#E3D2B0' },
  groups: [
    {
      id: 'tail',
      pivot: [-36, 5],
      parts: [
        { d: tail, role: 'belly' },
        { d: 'M-38 5L-46 5M-39 1L-45 -4M-39 9L-45 14', role: 'ink', kind: 'line', w: 1.1, alpha: 0.35 },
      ],
    },
    {
      id: 'rim',
      pivot: [-2, 5],
      parts: [
        { d: rim, role: 'belly' },
        { d: rays, role: 'ink', kind: 'line', w: 1.1, alpha: 0.35 },
      ],
    },
    {
      id: 'body',
      parts: [
        { d: body, role: 'body' },
        { d: turrets, role: 'body' },
        { d: spots, role: 'accent', kind: 'pattern' },
        { d: ellipse(0, 18, 26, 4), role: 'ink', kind: 'pattern', alpha: 0.1 },
      ],
    },
  ],
  shine: ellipse(-8, -1, 11, 2.8, -4),
  face: {
    eyes: [
      [8, -11],
      [20, -6],
    ],
    eye: 7,
    front: true,
    zone: [0, -22, 34, 24],
    mouth: { at: [30, 6], w: 5, shape: 'smile' },
  },
  deviations: {
    R7: 'flounder eyes sit stacked on the top edge, one higher (appendix: "Eyes stacked: the joke")',
  },
  ground: true,
  idle: {
    ambient: [
      { m: 'bob', amp: 1.2, period: 2.8 },
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
