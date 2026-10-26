/**
 * Lanternfish — a tiny earnest night-light from the deep (fish class, profile view, level).
 * Silhouette (R10): a big round head (half the fish) carrying the cast's biggest eye (24 %), a short
 * body that tapers fast, a small crisp forked tail. Five photophores ride the lower flank as inked
 * light dots that read on Day and glow at night.
 * Personality: earnest, tiny, glowing. Signature: the photophores blink on in sequence, front to
 * back, like a string of fairy lights. Awake at night, sleepy by day (R32).
 */
import { blob, circle, defineArt, ellipse, join } from '../kit.ts';

// a blunt round head (43 u tall) carrying the giant eye, then a fast taper to a sturdy tail
// root (17.4 u = 40 % of the head: a tiny lantern, not a tadpole)
const body = blob([
  [38, 1],
  [35.5, -13],
  [26.5, -21],
  [13, -21.5],
  [1, -15.5],
  [-8, -10.5],
  [-18, -9],
  [-26, -8.7],
  [-28, 0],
  [-26, 8.7],
  [-18, 9],
  [-8, 10.5],
  [1, 15.5],
  [13, 21.5],
  [26.5, 21],
  [35.5, 13],
]);
// little dorsal and anal fins, one each, set well back
const dorsal = blob(
  [
    [-1, -13],
    [-5, -22],
    [-12, -23],
    [-17, -13.5],
    [-13, -8],
  ],
  0.9,
);
const anal = blob(
  [
    [-5, 11],
    [-9, 17],
    [-15, 16.5],
    [-17, 10.5],
    [-13, 7.5],
  ],
  0.9,
);
// a deep crisp fork: two long plump lobes (the lanternfish's "swallow" tail at 24 px)
const tail = blob(
  [
    [-24, -6.5],
    [-30, -12],
    [-37, -25],
    [-44, -26],
    [-42, -10],
    [-36, 0],
    [-42, 10],
    [-44, 26],
    [-37, 25],
    [-30, 12],
    [-24, 6.5],
  ],
  0.9,
);
// five photophores in a row along the belly edge, behind the face (a curve under the mouth read
// as teeth), in three groups so they blink in sequence; at night each glows in its own small
// halo (1.4× the dot), never a belly smear
const DOTS: readonly (readonly [number, number])[] = [
  [9, 15],
  [0.5, 11.8],
  [-8, 8.8],
  [-16.5, 6.2],
  [-25, 4],
];
const dot = (i: number) => circle(DOTS[i]![0], DOTS[i]![1], 2.6);
const halo = (i: number) => circle(DOTS[i]![0], DOTS[i]![1], 3.6);
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
  deviations: { R7: 'R10: the biggest eye in the cast is the trait (18 u, 45 % of the zone)' },
  groups: [
    {
      id: 'tail',
      pivot: [-23, 0],
      parts: [
        { d: tail, role: 'body' },
        { d: join(ellipse(-41, -17, 4, 4.5), ellipse(-41, 17, 4, 4.5)), role: 'accent', kind: 'pattern', alpha: 0.8 },
      ],
    },
    {
      id: 'body',
      parts: [
        { d: dorsal, role: 'body' },
        { d: anal, role: 'body' },
        { d: body, role: 'body' },
        { d: ellipse(18, 22, 20, 5), role: 'belly', kind: 'pattern' },
        {
          d: join(ellipse(-8, -22.5, 8, 3.5, -8), ellipse(-11, 17, 7, 3, 10)),
          role: 'accent',
          kind: 'pattern',
          alpha: 0.6,
        },
      ],
    },
    {
      id: 'phA',
      pivot: [4, 13],
      parts: [
        { d: join(halo(0), halo(1)), role: 'light', outline: false, alpha: 0.35 },
        { d: phA, role: 'light', outline: false },
      ],
    },
    {
      id: 'phB',
      pivot: [-8, 8.5],
      parts: [
        { d: halo(2), role: 'light', outline: false, alpha: 0.35 },
        { d: phB, role: 'light', outline: false },
      ],
    },
    {
      id: 'phC',
      pivot: [-20, 5],
      parts: [
        { d: join(halo(3), halo(4)), role: 'light', outline: false, alpha: 0.35 },
        { d: phC, role: 'light', outline: false },
      ],
    },
  ],
  shine: ellipse(24, -11, 6.5, 2.8, -24),
  face: {
    eyes: [[12, -1]],
    eye: 18,
    zone: [-4, -24, 42, 40],
    // earnest wonder: a small round "oh"
    mouth: { at: [31, 10], w: 9, shape: 'o' },
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
