/**
 * Sand Eel — LONG class (profile, level). Silhouette: a true needle (≈ 4 : 1) with a slim head
 * (30 % of the length), a pointed lower jaw that juts 4 u past the snout and a tiny forked tail; a low
 * double wave travels down the body (R10: the needle and the jaw). CRITIQUE-4: sage-silver #B8C9B0
 * with a darker sage back band and a silver belly #E8ECEF (no blue: off the minnow).
 * Personality: zippy, shy, sandy. Signature: dives tail-first into the tile floor and pops back up.
 * Three seamless segments carry the travelling wave without seams (ADR 0011 Amendment 1).
 */
import { capsule, defineArt, ellipse, join, tube } from '../kit.ts';

const tailTip = join(
  tube([
    [-24, 1.5, 5.6],
    [-31, 2.5, 4.6],
    [-36, 1.5, 3.6],
  ]),
  capsule(-34, 1.5, 3, -38.5, -3.5, 2.6),
  capsule(-34, 1.5, 3, -38.5, 6.5, 2.6),
);
const tailMid = tube([
  [-12, 0, 7.1],
  [-19, 1.5, 6.5],
  [-26, 1.5, 5.8],
]);
const body = tube([
  [-14, 0, 7.1],
  [-2, -1.5, 7.6],
  [8, -1, 8.2],
  [14, 0, 9],
]);
const head = ellipse(22.5, -0.5, 14, 11.6);
const snout = capsule(29, -3.5, 6, 33.6, -2, 3.2);
// CRITIQUE-4: the lower jaw juts 4 u past the snout (R10: the sand eel's pointed underbite)
const jaw = capsule(29, 4, 5, 38.6, 3.2, 2.2);

export default defineArt({
  id: 'sandeel',
  klass: 'long',
  size: 'M',
  tileScale: 1.15,
  feature: 'a true needle with a slim head, a pointed lower jaw jutting past the snout and a forked tail',
  personality: ['zippy', 'shy', 'sandy'],
  // CRITIQUE-4: sage-silver #B8C9B0 (off the Lagoon tan trio), a darker sage back band, silver belly
  palette: { body: '#B8C9B0', accent: '#7E9478', belly: '#E8ECEF' },
  groups: [
    {
      id: 'tail2',
      pivot: [-25, 1.5],
      seamless: true,
      parts: [
        { d: tailTip, role: 'body' },
        {
          d: tube([
            [-24, -2, 2.4],
            [-34, -1, 2.4],
          ]),
          role: 'accent',
          kind: 'pattern',
        },
        {
          d: tube([
            [-24, 5.5, 2.2],
            [-34, 4.5, 2],
          ]),
          role: 'belly',
          kind: 'pattern',
        },
      ],
    },
    {
      id: 'tail1',
      pivot: [-13, 0],
      seamless: true,
      parts: [
        { d: tailMid, role: 'body' },
        {
          d: tube([
            [-12, -4.4, 2.4],
            [-26, -2.6, 2.4],
          ]),
          role: 'accent',
          kind: 'pattern',
        },
        {
          d: tube([
            [-12, 5, 2.4],
            [-26, 5.4, 2.2],
          ]),
          role: 'belly',
          kind: 'pattern',
        },
      ],
    },
    {
      id: 'body',
      seamless: true,
      parts: [
        { d: body, role: 'body' },
        { d: jaw, role: 'belly' },
        { d: head, role: 'body' },
        { d: snout, role: 'body' },
        {
          d: tube([
            [-14, -4.4, 2],
            [-2, -6.6, 2.2],
            [10, -7.6, 2.4],
            [22, -9.6, 2.4],
          ]),
          role: 'accent',
          kind: 'pattern',
        },
        {
          d: tube([
            [-14, 5, 2.6],
            [-2, 5, 2.8],
            [10, 6, 3],
            [24, 9, 4],
          ]),
          role: 'belly',
          kind: 'pattern',
        },
      ],
    },
  ],
  shine: ellipse(22, -6.5, 6, 2.2, -8),
  face: {
    eyes: [[25, -1]],
    eye: 9.4,
    zone: [12, -23, 30, 38],
    mouth: { at: [34, 4.2], w: 5, shape: 'smile' },
    sweet: true,
  },
  deviations: {
    R7: 'long class (R5): the eye sits in the big head (front 30 % of a 4 : 1 needle), not 34 % back',
    R16S: 'sage-silver identity (CRITIQUE-4 #B8C9B0, chroma 0.04); the sage back band and ink outline keep it off sand and mint',
  },
  idle: {
    ambient: [
      { m: 'bob', amp: 1.6, period: 1.8 },
      { m: 'wave', g: ['body', 'tail1', 'tail2'], amp: 4, period: 1.1, lag: 0.12 },
    ],
    signature: {
      dur: 1.4,
      every: [5, 8],
      tracks: [
        {
          p: 'rot',
          k: [
            [0, 0],
            [0.12, 8],
            [0.3, -76],
            [0.62, -76],
            [0.8, 6],
            [0.9, -3],
            [1, 0],
          ],
        },
        {
          p: 'ty',
          k: [
            [0, 0],
            [0.12, -3],
            [0.3, 4],
            [0.46, 42],
            [0.6, 42],
            [0.76, -8],
            [0.88, 2],
            [1, 0],
          ],
        },
        {
          p: 'sy',
          k: [
            [0, 1],
            [0.12, 0.88],
            [0.3, 1.12],
            [0.7, 1.14],
            [0.84, 0.9],
            [1, 1],
          ],
        },
        {
          g: 'tail2',
          p: 'rot',
          k: [
            [0, 0],
            [0.3, 18],
            [0.4, -18],
            [0.5, 12],
            [0.6, 0],
          ],
        },
      ],
      face: [
        [0.18, 0.66, 'blink'],
        [0.7, 0.9, 'happy'],
        [0.9, 1, 'wink'],
      ],
    },
  },
});
