/**
 * Anglerfish — FISH class, profile, night habitat (awake and glowing at night, sleepy by day).
 * Silhouette: one big round head-body, a jutting underbite with three rounded teeth, and the lure
 * on a curved stalk over the forehead (R10: lure + underbite, both exaggerated).
 * Dark identity lifted (R16): `#3B3240` → purple-grey L 0.59 (chroma 0.08), pale lilac belly, lure `#F2E97A`
 * as a `light` part (baked glow at night). Cute-spooky: big round eye, teeth like baby teeth.
 * Personality: gruff, secretly sweet, hosty. Signature: the lure brightens and swings forward
 * to offer its light to the viewer, and it beams.
 */
import { blob, circle, defineArt, ellipse, join, tube } from '../kit.ts';

const body = ellipse(-4, -2, 30, 31);
const tail = blob([
  [-30, -4],
  [-36, -11],
  [-40, -6],
  [-40, 6],
  [-36, 11],
  [-30, 4],
]);
// the underbite: a crescent jaw wrapping the lower front, jutting past the upper lip
const jaw = blob([
  [4, 6],
  [18, 7],
  [31, 4],
  [38, 0],
  [40, 7],
  [35, 18],
  [22, 26],
  [8, 29],
  [-4, 25],
]);
// three rounded teeth (R3: no sharp tips), biggest in the middle
const tooth = (x: number, w: number, h: number) =>
  blob(
    [
      [x - w / 2, 0],
      [x, -h],
      [x + w / 2, 0],
    ].map(([px, py]) => [px!, py! + 6] as const),
    0.9,
  );
const teeth = join(tooth(18, 6, 6), tooth(26.5, 6.5, 7.5), tooth(34, 5, 5.5));
const stalk = tube([
  [2, -30, 3.2],
  [12, -41, 3],
  [24, -44, 2.9],
  [31, -40, 2.8],
]);
const bulb = circle(33, -34, 7.5);
const pectoral = tube([
  [-12, 9, 5],
  [-19, 13, 4.4],
  [-25, 14, 3.2],
]);

export default defineArt({
  id: 'angler',
  klass: 'fish',
  size: 'L',
  feature: 'a big round head-body with a jutting toothy underbite and a glowing lure on a stalk',
  personality: ['gruff', 'secretly sweet', 'hosty'],
  palette: { body: '#8E6E9F', accent: '#F2E97A', belly: '#D9CCE0' },
  groups: [
    { id: 'tail', pivot: [-32, 0], parts: [{ d: tail, role: 'body' }] },
    {
      id: 'lure',
      pivot: [2, -30],
      parts: [
        { d: stalk, role: 'body', extra: true },
        { d: bulb, role: 'light', extra: true },
        { d: circle(30.5, -36.5, 3.1), role: 'white', kind: 'pattern', alpha: 0.8 },
      ],
    },
    {
      id: 'body',
      parts: [
        { d: body, role: 'body' },
        { d: ellipse(-8, 26, 24, 9), role: 'belly', kind: 'pattern' },
      ],
    },
    {
      id: 'jaw',
      pivot: [4, 14],
      parts: [
        { d: teeth, role: 'white' },
        { d: jaw, role: 'body' },
        { d: ellipse(20, 26, 18, 6, -14), role: 'belly', kind: 'pattern' },
      ],
    },
    { id: 'finA', pivot: [-12, 9], parts: [{ d: pectoral, role: 'body' }] },
  ],
  shine: ellipse(-14, -17, 10, 5, -30),
  face: {
    eyes: [[11, -4]],
    eye: 11.5,
    zone: [-4, -31, 43, 48],
    mouth: { at: [24, 5], w: 6, shape: 'none' },
    sweet: true,
  },
  idle: {
    ambient: [
      { m: 'bob', amp: 2, period: 2.8 },
      { m: 'wag', g: 'tail', amp: 9, period: 1 },
      { m: 'sway', g: 'lure', amp: 6, period: 2.2 },
      { m: 'flutter', g: 'finA', amp: 14, period: 0.6 },
    ],
    signature: {
      dur: 1.5,
      every: [5, 8],
      tracks: [
        {
          g: 'lure',
          p: 'rot',
          k: [
            [0, 0],
            [0.15, -8],
            [0.4, 16],
            [0.75, 16],
            [1, 0],
          ],
        },
        {
          g: 'lure',
          p: 's',
          k: [
            [0, 1],
            [0.15, 0.95],
            [0.4, 1.12],
            [0.75, 1.12],
            [1, 1],
          ],
        },
        {
          g: 'jaw',
          p: 'rot',
          k: [
            [0, 0],
            [0.4, 0],
            [0.5, 6],
            [0.75, 6],
            [0.9, 0],
          ],
        },
        {
          p: 'rot',
          k: [
            [0, 0],
            [0.4, -4],
            [0.75, -4],
            [1, 0],
          ],
        },
      ],
      face: [
        [0.35, 0.85, 'happy'],
        [0.85, 1, 'wink'],
      ],
    },
  },
  catch: {
    dur: 0.5,
    tracks: [
      {
        g: 'lure',
        p: 'rot',
        k: [
          [0, 0],
          [0.25, 20],
          [0.5, -16],
          [0.75, 10],
          [1, 0],
        ],
      },
      {
        g: 'jaw',
        p: 'rot',
        k: [
          [0, 0],
          [0.3, 8],
          [0.6, 0],
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
