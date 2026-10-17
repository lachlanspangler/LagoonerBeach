/**
 * Lanternfish — a tiny earnest night-light from the deep (fish class, profile view).
 * Silhouette (R10): a big round head with the cast's biggest eye (24 %), a short body that tapers
 * fast into a small, crisp forked tail. Chibi-proportioned: the head is half the fish.
 * Personality: earnest, tiny, glowing. Signature: its row of photophores blinks on in sequence,
 * front to back, like a string of fairy lights. Awake at night, sleepy by day (R32).
 */
import { blob, circle, defineArt, ellipse, join, xform } from '../kit.ts';

// lanternfish rise toward the surface every night: it swims nose-up at a steep TILT, which is
// also what keeps its round head apart from the clownfish and grouper at 24 px (R12)
const TILT = -45;
const R = (d: string) => xform(d, { rot: TILT });
const tc = Math.cos((TILT * Math.PI) / 180),
  ts = Math.sin((TILT * Math.PI) / 180);
/** An anchor on the drawing grid, mapped like the paths. */
const P = (x: number, y: number): [number, number] => [x * tc - y * ts, x * ts + y * tc];

// big round head (centre ≈ +12) on a short body that narrows to the tail root at −22
const body = blob([
  [34, 2],
  [31, -11],
  [20, -20],
  [6, -21],
  [-6, -15],
  [-16, -6],
  [-20, -3.5],
  [-20, 3.5],
  [-16, 5],
  [-6, 13],
  [6, 20],
  [20, 20],
  [31, 13],
]);
// small crisp fork with rounded tips
const tail = blob(
  [
    [-17, -3.5],
    [-19, -4],
    [-29, -9],
    [-40, -13],
    [-42, -8],
    [-34, 0],
    [-42, 8],
    [-40, 13],
    [-29, 9],
    [-19, 4],
    [-17, 3.5],
  ],
  0.9,
);
const dorsal = blob(
  [
    [-4, -15],
    [-9, -23],
    [-15, -21],
    [-16, -10],
  ],
  0.9,
);
// photophores: a row of glowing dots along the lower flank, behind the face (R18 glow, baked at
// night). They're patterns (no outline) so they never read as a toothy grin; the blink-in-sequence
// is three prop flashes that pop over them front to back.
const DOTS: readonly (readonly [number, number])[] = [
  [16, 11],
  [9.5, 12],
  [3, 10.5],
  [-3.5, 8],
  [-9.5, 5],
  [-15, 2.5],
];
const photophores = join(...DOTS.map(([x, y]) => circle(x, y, 2.2)));
const flash = (i: number, j: number) =>
  join(circle(DOTS[i]![0], DOTS[i]![1], 2.8), circle(DOTS[j]![0], DOTS[j]![1], 2.8));
const phFront = flash(0, 1);
const phMid = flash(2, 3);
const phBack = flash(4, 5);

export default defineArt({
  id: 'lanternfish',
  klass: 'fish',
  size: 'S',
  feature: 'big round head with the biggest eye, short tapering body, small forked tail, glowing dots',
  personality: ['earnest', 'tiny', 'glowing'],
  palette: { body: '#2FB8D8', accent: '#9BF0FF' },
  nocturnal: true,
  groups: [
    {
      id: 'tail',
      pivot: P(-18, 0),
      parts: [
        { d: R(tail), role: 'body' },
        { d: R(join(ellipse(-40, -11, 4, 4), ellipse(-40, 11, 4, 4))), role: 'accent', kind: 'pattern', alpha: 0.7 },
      ],
    },
    {
      id: 'body',
      parts: [
        { d: R(dorsal), role: 'body' },
        { d: R(body), role: 'body' },
        { d: R(ellipse(8, 20, 26, 7)), role: 'belly', kind: 'pattern' },
        { d: R(photophores), role: 'light', kind: 'pattern' },
      ],
    },
    { id: 'ph1', pivot: P(13, 11.5), prop: true, parts: [{ d: R(phFront), role: 'light' }] },
    { id: 'ph2', pivot: P(0, 9), prop: true, parts: [{ d: R(phMid), role: 'light' }] },
    { id: 'ph3', pivot: P(-12, 4), prop: true, parts: [{ d: R(phBack), role: 'light' }] },
  ],
  shine: R(ellipse(20, -12, 7, 3, -24)),
  face: {
    eyes: [P(11, -1)],
    eye: 10.5,
    zone: [-4, -34, 36, 44],
    mouth: { at: P(29, 6), w: 6.5, shape: 'smile' },
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
          g: 'ph1',
          p: 's',
          k: [
            [0, 0],
            [0.12, 1.15],
            [0.3, 0],
          ],
        },
        {
          g: 'ph2',
          p: 's',
          k: [
            [0.2, 0],
            [0.32, 1.15],
            [0.5, 0],
          ],
        },
        {
          g: 'ph3',
          p: 's',
          k: [
            [0.4, 0],
            [0.52, 1.15],
            [0.7, 0],
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
        g: 'ph1',
        p: 's',
        k: [
          [0, 0],
          [0.3, 1.15],
          [1, 0],
        ],
      },
      {
        g: 'ph3',
        p: 's',
        k: [
          [0, 0],
          [0.5, 1.15],
          [1, 0],
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
