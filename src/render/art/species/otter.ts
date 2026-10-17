/**
 * Sea Otter — CHIBI class (front-facing face), floating on its back.
 * Silhouette: a plump body lying along the water, a big round head with two small side ears at
 * the right end, little feet poking up at the left, a tail, and paws on its chest holding a shell
 * (R10: the back-float with the head up and the feet up).
 * Palette: `#7A5A3E` lifted to `#A07448` (R16 floor, chroma 0.08), cream face and chest, a cream shell.
 * Personality: cuddly, sleepy, loving (sweet: blush always on).
 * Signature: holds the shell up to show you, then hugs it to its chest, with a wink.
 */
import { blob, capsule, circle, defineArt, ellipse, join } from '../kit.ts';

const body = ellipse(-6, 8, 28, 14, -4);
const head = ellipse(22, -3, 20, 17.5);
// small ears set low on the sides (high round ears read as a teddy bear)
const ears = join(circle(5, -13, 4.8), circle(39, -13, 4.8));
const feet = join(capsule(-27, 2, 5.5, -32, -7, 6.2), capsule(-17, 1, 5.5, -19, -8, 6));
const tail = capsule(-30, 12, 6, -45, 11, 4.4);
// a cream scallop shell (a fan with three ribs) held on the chest, with two paws over its lower edge
const shell = blob(
  [
    [-5, -2],
    [-12, -7],
    [-15, -12],
    [-11, -18],
    [-5, -20],
    [1, -18],
    [5, -12],
    [2, -7],
  ],
  1,
);
const paws = join(ellipse(-11, -2, 5, 4, -20), ellipse(1, -2, 5, 4, 20));

export default defineArt({
  id: 'otter',
  klass: 'chibi',
  size: 'L',
  feature: 'floats on its back: big round head with small side ears up, feet up, paws on its chest with a shell',
  personality: ['cuddly', 'sleepy', 'loving'],
  palette: { body: '#A07448', accent: '#F3E6D2', belly: '#E6D2B8' },
  groups: [
    { id: 'tail', pivot: [-30, 12], parts: [{ d: tail, role: 'body', extra: true }] },
    {
      id: 'body',
      parts: [
        { d: feet, role: 'body' },
        { d: body, role: 'body' },
        { d: ellipse(-4, 0, 22, 8, -4), role: 'belly', kind: 'pattern' },
        { d: join(circle(-32.5, -8, 3.2), circle(-19, -9, 3.2)), role: 'belly', kind: 'pattern' },
      ],
    },
    {
      id: 'head',
      pivot: [20, 8],
      parts: [
        { d: ears, role: 'body' },
        { d: head, role: 'body' },
        { d: join(circle(5, -13, 3.1), circle(39, -13, 3.1)), role: 'belly', kind: 'pattern' },
        { d: ellipse(22, 4.5, 14.4, 9.8), role: 'belly', kind: 'pattern' },
        { d: ellipse(22, 2.6, 4.2, 3.2), role: 'body', kind: 'pattern' },
      ],
    },
    {
      id: 'paws',
      pivot: [-5, 0],
      parts: [
        { d: shell, role: 'accent' },
        { d: 'M-6 -5L-10.5 -15M-5 -5L-5 -17M-4 -5L0.5 -15', role: 'ink', kind: 'line', w: 3, alpha: 0.3 },
        { d: paws, role: 'body' },
      ],
    },
  ],
  shine: ellipse(14, -14, 7, 3.2, -20),
  shineOn: 'head',
  face: {
    g: 'head',
    eyes: [
      [15.1, 0],
      [28.9, 0],
    ],
    eye: 7.6,
    zone: [2, -21, 40, 36],
    mouth: { at: [22, 6.4], w: 5, shape: 'w' },
    front: true,
    sweet: true,
  },
  idle: {
    ambient: [
      { m: 'breathe', amp: 0.025, period: 3 },
      { m: 'bob', amp: 1.5, period: 3.4 },
      { m: 'sway', g: 'head', amp: 3, period: 3.4, phase: 0.2 },
      { m: 'sway', g: 'paws', amp: 4, period: 1.6 },
      { m: 'wag', g: 'tail', amp: 6, period: 2.2 },
    ],
    signature: {
      dur: 1.5,
      every: [5, 8],
      tracks: [
        {
          g: 'paws',
          p: 'ty',
          k: [
            [0, 0],
            [0.2, -9],
            [0.45, -9],
            [0.62, 1],
            [0.85, 1],
            [1, 0],
          ],
        },
        {
          g: 'paws',
          p: 'rot',
          k: [
            [0, 0],
            [0.25, -8],
            [0.33, 8],
            [0.41, -6],
            [0.5, 0],
          ],
        },
        {
          g: 'paws',
          p: 's',
          k: [
            [0, 1],
            [0.2, 1.1],
            [0.45, 1.1],
            [0.62, 0.92],
            [0.85, 0.92],
            [1, 1],
          ],
        },
        {
          g: 'head',
          p: 'rot',
          k: [
            [0, 0],
            [0.2, -6],
            [0.45, -6],
            [0.62, 6],
            [0.85, 6],
            [1, 0],
          ],
        },
      ],
      face: [
        [0.15, 0.5, 'surprised'],
        [0.55, 0.85, 'happy'],
        [0.85, 1, 'wink'],
      ],
    },
  },
  catch: {
    dur: 0.5,
    tracks: [
      {
        g: 'paws',
        p: 'ty',
        k: [
          [0, 0],
          [0.35, -7],
          [1, 0],
        ],
      },
      {
        g: 'tail',
        p: 'rot',
        k: [
          [0, 0],
          [0.3, 16],
          [0.6, -10],
          [1, 0],
        ],
      },
      {
        p: 'sy',
        k: [
          [0, 1],
          [0.2, 0.9],
          [0.45, 1.08],
          [1, 1],
        ],
      },
    ],
    face: [[0, 1, 'happy']],
  },
});
