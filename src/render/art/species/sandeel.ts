/**
 * Sand Eel — LONG class (profile). Silhouette: a long slim body in a quick double wave ("~~"),
 * an oversized round head and a pointed, jutting lower jaw, a tiny forked tail (R10: the wavy needle
 * and the jaw). Slimmer and wavier than the moray, horizontal unlike the garden eel.
 * Personality: zippy, shy, sandy. Signature: dives tail-first into the tile floor and pops back up.
 */
import { capsule, defineArt, ellipse, join, tube } from '../kit.ts';

const tail = join(
  tube([
    [-10, 4, 8.4],
    [-19, 14, 7.6],
    [-28, 16, 6.4],
    [-34, 9, 5],
  ]),
  capsule(-34, 9, 3.8, -38, 0, 2.8),
  capsule(-34, 9, 3.8, -39, 13, 2.8),
);
const body = tube([
  [-12, 6, 8.8],
  [-3, -6, 9.6],
  [8, -13, 9.6],
  [18, -10, 10.4],
]);
// a low dorsal fin riding the first hump
const dorsal = tube([
  [-9, -9, 3],
  [0, -18, 3.6],
  [10, -24, 3],
]);
const head = ellipse(23, -8, 13.5, 12, -10);
const jaw = capsule(28, 1, 4.8, 39.5, -1.5, 2.6);
const snout = capsule(28, -10, 5.6, 35, -7.5, 3);

export default defineArt({
  id: 'sandeel',
  klass: 'long',
  size: 'M',
  feature: 'a long slim body in a quick double wave, an oversized round head and a pointed jutting jaw',
  personality: ['zippy', 'shy', 'sandy'],
  palette: { body: '#D8C79A', accent: '#8FA7B5', belly: '#EEF2F2' },
  groups: [
    {
      id: 'tail',
      pivot: [-11, 5],
      parts: [
        { d: tail, role: 'body' },
        {
          d: tube([
            [-8, -2.5, 2.4],
            [-18, 6, 2.2],
            [-28, 9, 1.8],
          ]),
          role: 'accent',
          kind: 'pattern',
        },
        {
          d: tube([
            [-12, 12, 2.6],
            [-20, 21, 2.4],
            [-30, 21, 2],
          ]),
          role: 'belly',
          kind: 'pattern',
        },
      ],
    },
    {
      id: 'body',
      parts: [
        { d: dorsal, role: 'belly' },
        { d: body, role: 'body' },
        { d: jaw, role: 'belly' },
        { d: head, role: 'body' },
        { d: snout, role: 'body' },
        {
          d: tube([
            [-12, -2, 2.6],
            [-3, -14, 2.8],
            [8, -21.5, 3],
            [20, -20.5, 3],
          ]),
          role: 'accent',
          kind: 'pattern',
        },
        {
          d: tube([
            [-12, 14, 2.8],
            [-1, 2.5, 3],
            [10, -3, 3.2],
            [24, 3, 4.4],
          ]),
          role: 'belly',
          kind: 'pattern',
        },
      ],
    },
  ],
  shine: ellipse(21, -15, 6, 2.4, -14),
  face: {
    eyes: [[26, -8]],
    eye: 7,
    zone: [12, -24, 30, 30],
    mouth: { at: [34, -2], w: 5, shape: 'smile' },
    sweet: true,
  },
  deviations: {
    R7: 'long class (R5): the eye sits in the oversized head, the front 30 % of the wavy body, not 34 % back',
  },
  idle: {
    ambient: [
      { m: 'bob', amp: 2, period: 1.8 },
      { m: 'wag', g: 'tail', amp: 10, period: 0.7 },
      { m: 'sway', g: 'body', amp: 2.5, period: 1.4, phase: 0.25 },
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
            [0.3, -72],
            [0.62, -72],
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
            [0.46, 40],
            [0.6, 40],
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
      ],
      face: [
        [0.18, 0.66, 'blink'],
        [0.7, 0.9, 'happy'],
        [0.9, 1, 'wink'],
      ],
    },
  },
});
