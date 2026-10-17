/**
 * Cuttlefish — CHIBI class in profile (M), facing right. Redo after CRITIQUE-1.
 * Silhouette: a big round head (chibi: the head is half the creature) with a large W-pupil eye,
 * a short mantle oval wrapped in a thin, uniform rippling fin skirt (6 units), and a beard of
 * four short arm capsules under the snout (R10: the rippling skirt + the W eye).
 * Palette: warm brown with two bold cream zebra bands that ripple through colours.
 * Personality: moody, clever, shifty. Signature: the colour ripple — the bands flash peach, rose
 * and lilac one after the other while it scoots back with a shifty tilt and a smug look.
 */
import { capsule, circle, defineArt, ellipse, join } from '../kit.ts';

const skirt =
  'M13.0 0.0A4.5 4.5 0 0 1 11.7 7.1A4.7 4.7 0 0 1 7.8 13.5A4.9 4.9 0 0 1 1.9 18.6A5.1 5.1 0 0 1 -5.7 21.9A5.3 5.3 0 0 1 -14.0 23.0A5.3 5.3 0 0 1 -22.3 21.9A5.1 5.1 0 0 1 -29.9 18.6A4.9 4.9 0 0 1 -35.8 13.5A4.7 4.7 0 0 1 -39.7 7.1A4.5 4.5 0 0 1 -41.0 0.0A4.5 4.5 0 0 1 -39.7 -7.1A4.7 4.7 0 0 1 -35.8 -13.5A4.9 4.9 0 0 1 -29.9 -18.6A5.1 5.1 0 0 1 -22.3 -21.9A5.3 5.3 0 0 1 -14.0 -23.0A5.3 5.3 0 0 1 -5.7 -21.9A5.1 5.1 0 0 1 1.9 -18.6A4.9 4.9 0 0 1 7.8 -13.5A4.7 4.7 0 0 1 11.7 -7.1A4.5 4.5 0 0 1 13.0 0.0Z';
const mantle = ellipse(-14, 0, 22, 17);
const head = circle(10, 1, 19);
// a beard of four short arm capsules under the snout
const arms = join(
  capsule(24, -1, 5, 37, -3, 3.4),
  capsule(25, 6, 5, 38, 6, 3.4),
  capsule(23, 12, 5, 36, 16, 3.4),
  capsule(18, 16, 5, 28, 23, 3.2),
);
// two bold zebra bands across the mantle's back (6 units wide), clipped to the body
const band = (x: number) =>
  `M${x - 2} -20C${x + 3} -12 ${x - 1} -4 ${x + 2} 4C${x + 3} 7 ${x + 7} 7 ${x + 8} 4C${x + 6} -4 ${x + 9} -12 ${x + 4} -20Z`;
const C = '#F2E2CF',
  P = '#F7BE93',
  R = '#EE9FB9',
  V = '#B9A7EC';
// each band rests cream (step 0) and flashes in turn, front band first: a ripple running backward
const ripple = (k: number) => [C, ...Array<string>(k).fill(C), P, R, V, ...Array<string>(2 - k).fill(C)];

export default defineArt({
  id: 'cuttle',
  klass: 'chibi',
  size: 'M',
  feature: 'big round head with a W-pupil eye, short mantle in a thin rippling fin skirt, arm beard',
  personality: ['moody', 'clever', 'shifty'],
  palette: { body: '#B57A55', accent: '#F2E2CF', belly: '#E9C2A6' },
  cycle: { rate: 8, during: 'signature' },
  groups: [
    { id: 'skirt', pivot: [-14, 0], parts: [{ d: skirt, role: 'belly' }] },
    { id: 'arms', pivot: [22, 8], parts: [{ d: arms, role: 'body' }] },
    {
      id: 'body',
      parts: [
        { d: mantle, role: 'body' },
        { d: head, role: 'body' },
        { d: band(-28), role: 'accent', kind: 'pattern', cycle: ripple(1) },
        { d: band(-16), role: 'accent', kind: 'pattern', cycle: ripple(0) },
        { d: ellipse(-2, 18, 26, 5), role: 'belly', kind: 'pattern', alpha: 0.7 },
        // the collar where the mantle meets the head
        { d: 'M-4 -16C-9 -6 -9 8 -4 18', role: 'ink', kind: 'line', w: 3, alpha: 0.35 },
      ],
    },
  ],
  shine: ellipse(2, -12, 9, 4, -20),
  face: {
    eyes: [[15, 3.5]],
    eye: 11,
    zone: [-9, -23, 46, 46],
    mouth: { at: [24, 10], w: 4, shape: 'smile' },
    pupil: 'w',
  },
  idle: {
    ambient: [
      { m: 'breathe', amp: 0.02, period: 3 },
      { m: 'bob', amp: 1.8, period: 2.6 },
      { m: 'pulse', g: 'skirt', amp: 0.035, period: 0.9 },
      { m: 'sway', g: 'arms', amp: 6, period: 1.8 },
    ],
    signature: {
      dur: 1.4,
      tracks: [
        {
          p: 'tx',
          k: [
            [0, 0],
            [0.12, 1.5],
            [0.3, -8],
            [0.75, -6],
            [1, 0],
          ],
        },
        {
          p: 'rot',
          k: [
            [0, 0],
            [0.3, 4],
            [0.5, -6],
            [0.8, -6],
            [1, 0],
          ],
        },
        {
          g: 'arms',
          p: 'rot',
          k: [
            [0, 0],
            [0.3, 10],
            [0.5, -20],
            [0.8, -20],
            [0.95, 0],
          ],
        },
        {
          g: 'skirt',
          p: 'sy',
          k: [
            [0, 1],
            [0.2, 1.06],
            [0.4, 0.96],
            [0.6, 1.05],
            [0.8, 0.97],
            [1, 1],
          ],
        },
      ],
      face: [
        [0.35, 0.8, 'proud'],
        [0.8, 1, 'wink'],
      ],
    },
  },
});
