/**
 * Lanternfish — a tiny earnest night-light from the deep (fish class, profile view, level).
 * Silhouette (R10): a big round head (half the fish) carrying the cast's biggest eye (24 %), a short
 * body that tapers fast, a small crisp forked tail. Five photophores ride the lower flank as inked
 * light dots that read on Day and glow at night.
 * Personality: earnest, tiny, glowing. Signature: the photophores blink on in sequence, front to
 * back, like a string of fairy lights. Awake at night, sleepy by day (R32).
 */
import { blob, circle, defineArt, ellipse, join } from '../kit.ts';

// big round head (centre ≈ +12) on a short body that narrows to the tail root at −22
const body = blob([
  [37, 1],
  [33, -15],
  [21, -25],
  [6, -23],
  [-6, -12],
  [-16, -6],
  [-24, -3.5],
  [-24, 3.5],
  [-16, 6],
  [-6, 12],
  [6, 23],
  [21, 25],
  [33, 15],
]);
// small crisp fork with plump rounded tips
const tail = blob(
  [
    [-21, -3],
    [-30, -10],
    [-38, -22],
    [-44, -21],
    [-40, -8],
    [-35, 0],
    [-40, 8],
    [-44, 21],
    [-38, 22],
    [-30, 10],
    [-21, 3],
  ],
  0.9,
);
// five photophores along the lower flank, in three groups so they can blink in sequence
const DOTS: readonly (readonly [number, number])[] = [
  [17, 11],
  [9, 12.5],
  [1, 11],
  [-6.5, 7.5],
  [-13, 4],
];
const dot = (i: number) => circle(DOTS[i]![0], DOTS[i]![1], 2.7);
const halo = (i: number) => circle(DOTS[i]![0], DOTS[i]![1], 4.6);
const phA = join(dot(0), dot(1));
const phB = join(dot(2));
const phC = join(dot(3), dot(4));

export default defineArt({
  id: 'lanternfish',
  klass: 'fish',
  size: 'S',
  feature: 'big round head with the biggest eye, a fast taper, a small fork, five inked light dots',
  personality: ['earnest', 'tiny', 'glowing'],
  palette: { body: '#2FB8D8', accent: '#9BF0FF' },
  nocturnal: true,
  groups: [
    {
      id: 'tail',
      pivot: [-21, 0],
      parts: [
        { d: tail, role: 'body' },
        { d: join(ellipse(-39, -14, 4, 4), ellipse(-39, 14, 4, 4)), role: 'accent', kind: 'pattern', alpha: 0.8 },
      ],
    },
    {
      id: 'body',
      parts: [
        { d: body, role: 'body' },
        { d: ellipse(14, 24, 22, 6), role: 'belly', kind: 'pattern' },
      ],
    },
    {
      id: 'phA',
      pivot: [13, 12],
      parts: [
        { d: join(halo(0), halo(1)), role: 'light', outline: false, alpha: 0.35 },
        { d: phA, role: 'light' },
      ],
    },
    {
      id: 'phB',
      pivot: [1, 11],
      parts: [
        { d: halo(2), role: 'light', outline: false, alpha: 0.35 },
        { d: phB, role: 'light' },
      ],
    },
    {
      id: 'phC',
      pivot: [-10, 6],
      parts: [
        { d: join(halo(3), halo(4)), role: 'light', outline: false, alpha: 0.35 },
        { d: phC, role: 'light' },
      ],
    },
  ],
  shine: ellipse(20, -12, 7, 3, -24),
  face: {
    eyes: [[12, -1]],
    eye: 11.2,
    zone: [-2, -28, 38, 47],
    mouth: { at: [30, 6], w: 6.5, shape: 'smile' },
    sweet: true,
  },
  idle: {
    ambient: [
      { m: 'bob', amp: 2.5, period: 2.2 },
      { m: 'wag', g: 'tail', amp: 10, period: 0.7 },
    ],
    signature: {
      dur: 1.2,
      every: [4, 7],
      tracks: [
        {
          g: 'phA',
          p: 's',
          k: [
            [0, 1],
            [0.12, 1.5],
            [0.3, 1],
          ],
        },
        {
          g: 'phB',
          p: 's',
          k: [
            [0.2, 1],
            [0.32, 1.5],
            [0.5, 1],
          ],
        },
        {
          g: 'phC',
          p: 's',
          k: [
            [0.4, 1],
            [0.52, 1.5],
            [0.7, 1],
          ],
        },
        {
          p: 'sy',
          k: [
            [0.6, 1],
            [0.72, 1.06],
            [0.85, 0.97],
            [1, 1],
          ],
        },
      ],
      face: [
        [0.05, 0.6, 'surprised'],
        [0.65, 1, 'proud'],
      ],
    },
  },
  catch: {
    dur: 0.5,
    tracks: [
      {
        g: 'phA',
        p: 's',
        k: [
          [0, 1],
          [0.3, 1.5],
          [1, 1],
        ],
      },
      {
        g: 'phC',
        p: 's',
        k: [
          [0, 1],
          [0.5, 1.5],
          [1, 1],
        ],
      },
      {
        g: 'tail',
        p: 'rot',
        k: [
          [0, 0],
          [0.25, 22],
          [0.5, -22],
          [0.75, 14],
          [1, 0],
        ],
      },
    ],
    face: [[0, 1, 'happy']],
  },
});
