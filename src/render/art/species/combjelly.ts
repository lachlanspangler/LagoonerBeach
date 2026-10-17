/**
 * Comb Jelly — JELLY class (S), night species. Redo after CRITIQUE-1.
 * Silhouette: an upright translucent egg (narrow top) with a small apical nub, no tentacles
 * (R10: the egg + its rainbow comb rows). Six visible bold comb rows (of eight) run pole to pole,
 * each 5 units wide, in the pebble rainbow — kelp, lagoon, orchid, sun — so even a static tile
 * shows the shimmer. A soft glow halo on Night.
 * CRITIQUE-2: a pale face window where the rows fade, so the eyes never sit on stripes.
 * Personality: shimmery, delicate, quiet. Resting mouth: the tiniest shy smile, blushing. Signature: the rainbow ripple — the rib colours roll
 * around the egg while it does a slow little twirl, sparks winking on around it.
 */
import { blob, circle, defineArt, ellipse, join } from '../kit.ts';

const egg = blob([
  [0, -39],
  [14, -34],
  [24, -20],
  [28.6, 0],
  [27.4, 20],
  [17, 35],
  [0, 40],
  [-17, 35],
  [-27.4, 20],
  [-28.6, 0],
  [-24, -20],
  [-14, -34],
]);
// the little sense-organ nub on the top pole
const nub = circle(0, -39.5, 3.6);
const RIBS = [
  'M-14.8 -35Q-40.8 0 -14.8 35L-9.6 35Q-35.6 0 -9.6 -35Z',
  'M-10.4 -35Q-26.9 0 -10.4 35L-5.2 35Q-21.7 0 -5.2 -35Z',
  'M-5.4 -35Q-11.3 0 -5.4 35L-0.2 35Q-6.1 0 -0.2 -35Z',
  'M0.2 -35Q6.1 0 0.2 35L5.4 35Q11.3 0 5.4 -35Z',
  'M5.2 -35Q21.7 0 5.2 35L10.4 35Q26.9 0 10.4 -35Z',
  'M9.6 -35Q35.6 0 9.6 35L14.8 35Q40.8 0 14.8 -35Z',
];
const RAINBOW = ['#53C08C', '#3D9BE9', '#8E5BD8', '#F2B93B'];
// sparks that wink on around it during the signature (soft light, no outline)
const sparks = join(circle(-35, -22, 2.8), circle(36, -8, 3.2), circle(-34, 14, 2.6), circle(33, 26, 2.8));

export default defineArt({
  id: 'combjelly',
  klass: 'jelly',
  size: 'S',
  feature: 'a translucent upright egg with six bold rainbow comb rows pole to pole, no tentacles',
  personality: ['shimmery', 'delicate', 'quiet'],
  palette: { body: '#F4AECB', accent: '#A8F4FF' },
  cycle: { rate: 7, during: 'signature' },
  groups: [
    {
      id: 'body',
      parts: [
        // Night glow halo behind the egg
        { d: ellipse(0, 0, 35, 46), role: 'accent', outline: false, alpha: 0.24 },
        { d: egg, role: 'body', alpha: 0.85 },
        { d: nub, role: 'body' },
        ...RIBS.map((d, i) => ({
          d,
          role: 'accent' as const,
          kind: 'pattern' as const,
          alpha: 0.9,
          cycle: RAINBOW,
          cycleOffset: i % 4,
        })),
        { d: ellipse(0, 31, 18, 7), role: 'belly', kind: 'pattern', alpha: 0.5 },
        // CRITIQUE-2: a pale face window (upper-middle) where the comb rows fade, two steps for a soft edge
        { d: ellipse(0, 7, 20, 16), role: 'body', kind: 'pattern', alpha: 0.55 },
        { d: ellipse(0, 7, 15.5, 12.5), role: 'body', kind: 'pattern', alpha: 0.92 },
      ],
    },
    {
      id: 'sparks',
      prop: true,
      followRoot: true,
      pivot: [0, 0],
      parts: [{ d: sparks, role: 'light', outline: false }],
    },
  ],
  shine: ellipse(-12, -24, 5, 9, 25),
  face: {
    eyes: [
      [-9.2, 5],
      [9.2, 5],
    ],
    eye: 11.2,
    zone: [-28.6, -40, 57.2, 80],
    mouth: { at: [0, 12.5], w: 3.2, shape: 'smile' },
    front: true,
    sweet: true,
  },
  idle: {
    ambient: [
      { m: 'pulse', amp: 0.035, period: 1.8 },
      { m: 'bob', amp: 2, period: 2.8 },
      { m: 'sway', amp: 3, period: 3.6 },
    ],
    signature: {
      dur: 1.4,
      tracks: [
        {
          g: 'sparks',
          p: 's',
          k: [
            [0, 0.8],
            [0.15, 1.08],
            [0.5, 0.96],
            [0.85, 1.04],
            [1, 0.8],
          ],
        },
        {
          g: 'sparks',
          p: 'rot',
          k: [
            [0, -10],
            [1, 35],
          ],
        },
        {
          p: 'sx',
          k: [
            [0, 1],
            [0.3, 0.9],
            [0.55, 1.04],
            [0.8, 0.97],
            [1, 1],
          ],
        },
        {
          p: 'rot',
          k: [
            [0, 0],
            [0.3, -6],
            [0.6, 5],
            [1, 0],
          ],
        },
      ],
      face: [[0.2, 0.9, 'happy']],
    },
  },
});
