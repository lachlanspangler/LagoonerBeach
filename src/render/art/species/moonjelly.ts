/**
 * Moon Jelly — JELLY class (M), night species.
 * Silhouette: a wide, soft, translucent dome bell with four short frilly arms under it
 * (R10: the wide umbrella; the four-leaf clover on top glows on Night).
 * Personality: floaty, carefree, dreamy. Signature: a slow deep pulse, then it drifts up and
 * settles back down with a happy face.
 */
import { blob, circle, defineArt, ellipse, join, tube, xform } from '../kit.ts';

const bell = blob([
  [0, -41],
  [20, -37],
  [33, -24],
  [37, -6],
  [32, 4],
  [16, 6],
  [0, 5],
  [-16, 6],
  [-32, 4],
  [-37, -6],
  [-33, -24],
  [-20, -37],
]);
// wavy oral arms (left pair; right pair mirrored)
const armOut = tube([
  [-16, 2, 5],
  [-21, 12, 4.6],
  [-17, 21, 4.2],
  [-22, 30, 3.8],
  [-19, 39, 3.2],
]);
const armIn = tube([
  [-5, 3, 5],
  [-2, 13, 4.6],
  [-7, 22, 4.2],
  [-3, 31, 3.8],
  [-6, 40, 3.2],
]);
const mirror = (d: string) => xform(d, { sx: -1 });
// the four-leaf clover (gonads), a ring of four horseshoes on the crown
const leaf = (dx: number, dy: number) => circle(dx, -28 + dy, 4.4);
const clover = join(leaf(-6, 0), leaf(6, 0), leaf(0, -5.5), leaf(0, 5.5));

export default defineArt({
  id: 'moonjelly',
  klass: 'jelly',
  size: 'M',
  feature: 'wide translucent dome bell with a four-leaf clover and four short frilly arms',
  personality: ['floaty', 'carefree', 'dreamy'],
  palette: { body: '#C9D6FF', accent: '#D47FC6' },
  groups: [
    {
      id: 'armsL',
      pivot: [-9, 3],
      parts: [
        { d: armOut, role: 'body', alpha: 0.8 },
        { d: armIn, role: 'body', alpha: 0.8 },
      ],
    },
    {
      id: 'armsR',
      pivot: [9, 3],
      parts: [
        { d: mirror(armOut), role: 'body', alpha: 0.8 },
        { d: mirror(armIn), role: 'body', alpha: 0.8 },
      ],
    },
    {
      id: 'body',
      pivot: [0, 0],
      parts: [
        { d: bell, role: 'body', alpha: 0.85 },
        { d: clover, role: 'light', kind: 'pattern', alpha: 0.9 },
        { d: circle(0, -28, 2.2), role: 'body', kind: 'pattern' },
        // the frilly rim: a soft inner line just above the bell edge
        { d: 'M-31 0C-20 4 -10 2 0 2C10 2 20 4 31 0', role: 'ink', kind: 'line', w: 1.4, alpha: 0.3 },
      ],
    },
  ],
  shine: ellipse(-18, -27, 8, 4.4, -35),
  face: {
    eyes: [
      [-8.5, -13],
      [8.5, -13],
    ],
    eye: 9.4,
    zone: [-37, -41, 74, 46],
    mouth: { at: [0, -6], w: 5, shape: 'smile' },
    front: true,
    sweet: true,
  },
  idle: {
    ambient: [
      { m: 'pulse', amp: 0.05, period: 1.6 },
      { m: 'bob', amp: 2.4, period: 3.2 },
      { m: 'sway', g: ['armsL', 'armsR'], amp: 7, period: 1.6, lag: 0.12 },
    ],
    signature: {
      dur: 1.5,
      tracks: [
        {
          p: 'sy',
          k: [
            [0, 1],
            [0.15, 0.88],
            [0.3, 1.08],
            [0.5, 1],
            [0.85, 0.96],
            [1, 1],
          ],
        },
        {
          p: 'sx',
          k: [
            [0, 1],
            [0.15, 1.1],
            [0.3, 0.94],
            [0.5, 1],
            [0.85, 1.03],
            [1, 1],
          ],
        },
        {
          p: 'ty',
          k: [
            [0, 0],
            [0.15, 1],
            [0.45, -10],
            [0.65, -9],
            [1, 0],
          ],
        },
        {
          g: 'armsL',
          p: 'rot',
          k: [
            [0, 0],
            [0.2, -14],
            [0.5, 10],
            [0.8, 0],
          ],
        },
        {
          g: 'armsR',
          p: 'rot',
          k: [
            [0, 0],
            [0.2, 14],
            [0.5, -10],
            [0.8, 0],
          ],
        },
      ],
      face: [[0.3, 0.9, 'happy']],
    },
  },
});
