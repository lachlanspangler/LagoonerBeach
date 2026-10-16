/**
 * Octopus — pilot exemplar for the CHIBI class (front view).
 * Silhouette: a big round mantle head over six plump arms whose tips curl outward (R10: the curls,
 * exaggerated). Personality: mischievous, clever, playful.
 * Signature: peekaboo — the two front arms swing up over the eyes, drop, and it winks; a tiny
 * ink heart puffs out.
 * Groups: outer arms behind the head (sway in opposite phase), the head (face), two front arms in
 * front of the face (so they can cover it), and the heart prop.
 */
import { blob, circle, defineArt, ellipse, join, tube, xform } from '../kit.ts';

const head = blob([
  [0, -42],
  [21, -38],
  [32, -23],
  [33, -6],
  [27, 8],
  [14, 15],
  [0, 17],
  [-14, 15],
  [-27, 8],
  [-33, -6],
  [-32, -23],
  [-21, -38],
]);
// left arms (right ones are mirrors); radii taper to round tips, tips curl outward and up
const outerL = tube([
  [-21, 4, 6.6],
  [-30, 13, 5.8],
  [-36, 23, 4.8],
  [-35, 32, 3.8],
  [-29, 35, 3.2],
  [-26, 30, 2.8],
]);
const midL = tube([
  [-13, 10, 6.6],
  [-18, 21, 5.8],
  [-20, 31, 4.8],
  [-16, 38, 3.8],
  [-11, 37, 3],
]);
// front arms stop short of the centre line: two separate nubs, not clasped hands
const frontL = tube([
  [-8, 12, 6.2],
  [-10, 23, 5.6],
  [-9.5, 32, 4.6],
  [-6.5, 37, 3.6],
  [-4, 34, 2.8],
]);
const mirror = (d: string) => xform(d, { sx: -1 });
const suckers = (pts: readonly (readonly [number, number])[]) => join(...pts.map(([x, y]) => circle(x, y, 3)));
const heart = blob(
  [
    [26, -40],
    [30, -45],
    [35, -42],
    [34, -36],
    [26, -29],
    [18, -36],
    [17, -42],
    [22, -45],
  ],
  1.1,
);

export default defineArt({
  id: 'octopus',
  klass: 'chibi',
  size: 'L',
  feature: 'six plump arms with tips curled outward under a big round head',
  personality: ['mischievous', 'clever', 'playful'],
  palette: { body: '#C2506B', accent: '#F6B3C3' },
  groups: [
    {
      id: 'armsL',
      pivot: [-16, 6],
      parts: [
        { d: outerL, role: 'body' },
        { d: midL, role: 'body' },
        {
          d: suckers([
            [-32, 29],
            [-32, 22],
            [-17, 33],
            [-18.5, 26],
          ]),
          role: 'accent',
          kind: 'pattern',
        },
      ],
    },
    {
      id: 'armsR',
      pivot: [16, 6],
      parts: [
        { d: mirror(outerL), role: 'body' },
        { d: mirror(midL), role: 'body' },
        {
          d: suckers([
            [32, 29],
            [32, 22],
            [17, 33],
            [18.5, 26],
          ]),
          role: 'accent',
          kind: 'pattern',
        },
      ],
    },
    {
      id: 'body',
      parts: [
        { d: head, role: 'body' },
        {
          d: join(circle(-17, -27, 4.2), circle(-24, -16, 3), circle(20, -29, 3.2)),
          role: 'accent',
          kind: 'pattern',
        },
        { d: ellipse(0, 14, 26, 7), role: 'belly', kind: 'pattern' },
      ],
    },
    {
      id: 'armL',
      pivot: [-6, 10],
      parts: [
        { d: frontL, role: 'body' },
        {
          d: suckers([
            [-9.5, 28],
            [-8, 34],
          ]),
          role: 'accent',
          kind: 'pattern',
        },
      ],
    },
    {
      id: 'armR',
      pivot: [6, 10],
      parts: [
        { d: mirror(frontL), role: 'body' },
        {
          d: suckers([
            [9.5, 28],
            [8, 34],
          ]),
          role: 'accent',
          kind: 'pattern',
        },
      ],
    },
    { id: 'heart', pivot: [26, -36], prop: true, parts: [{ d: heart, role: 'ink' }] },
  ],
  shine: ellipse(-13, -31, 10, 5.5, -32),
  face: {
    eyes: [
      [-10, -8],
      [10, -8],
    ],
    eye: 11.6,
    zone: [-33, -42, 66, 59],
    mouth: { at: [0, 0], w: 8, shape: 'w' },
    front: true,
    blushInk: true,
  },
  idle: {
    ambient: [
      { m: 'breathe', amp: 0.025, period: 3 },
      { m: 'sway', g: 'armsL', amp: 6, period: 2.4 },
      { m: 'sway', g: 'armsR', amp: -6, period: 2.4, phase: 0.15 },
      { m: 'sway', g: ['armL', 'armR'], amp: 5, period: 1.9, lag: 0.12 },
    ],
    signature: {
      dur: 1.5,
      tracks: [
        {
          g: 'armL',
          p: 'rot',
          k: [
            [0, 0],
            [0.18, 150],
            [0.55, 150],
            [0.7, -8],
            [0.8, 0],
          ],
        },
        {
          g: 'armR',
          p: 'rot',
          k: [
            [0, 0],
            [0.18, -150],
            [0.55, -150],
            [0.7, 8],
            [0.8, 0],
          ],
        },
        {
          p: 'ty',
          k: [
            [0, 0],
            [0.62, 0],
            [0.7, -4],
            [0.82, 0],
          ],
        },
        {
          g: 'heart',
          p: 's',
          k: [
            [0.66, 0],
            [0.76, 1.15],
            [0.86, 1],
            [1, 0.6],
          ],
        },
        {
          g: 'heart',
          p: 'ty',
          k: [
            [0.66, 6],
            [1, -6],
          ],
        },
      ],
      face: [
        [0.15, 0.6, 'happy'],
        [0.6, 1, 'wink'],
      ],
    },
  },
  catch: {
    dur: 0.5,
    tracks: [
      {
        g: 'armsL',
        p: 'rot',
        k: [
          [0, 0],
          [0.4, 22],
          [1, 0],
        ],
      },
      {
        g: 'armsR',
        p: 'rot',
        k: [
          [0, 0],
          [0.4, -22],
          [1, 0],
        ],
      },
      {
        g: 'armL',
        p: 'rot',
        k: [
          [0, 0],
          [0.4, 30],
          [1, 0],
        ],
      },
      {
        g: 'armR',
        p: 'rot',
        k: [
          [0, 0],
          [0.4, -30],
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
