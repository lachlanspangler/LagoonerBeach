/**
 * Blenny — the nosy neighbour of the shallows (fish class, profile view).
 * Silhouette (R10): a big, blunt, round head with two upright eyebrow tufts (cirri), tapering into a
 * long low body with one long dorsal ribbon and a little round tail. Head-heavy like a tadpole, and
 * the tufts are the only "antennae" in the fish family at 24 px.
 * Personality: nosy, cheeky, peeky. Signature: ducks out of sight below the tile edge, peeks back up,
 * and waggles its eyebrows.
 */
import { blob, capsule, circle, defineArt, ellipse, join, tube, waveTrack, within, xform } from '../kit.ts';

// propped up on its fins, nose raised to see what's going on (nosy): the TILT is part of the
// silhouette and keeps the round head and tufts apart from the flounder's turrets (R12)
const TILT = -20;
const R = (d: string) => xform(d, { rot: TILT });
const tc = Math.cos((TILT * Math.PI) / 180),
  ts = Math.sin((TILT * Math.PI) / 180);
/** An anchor on the drawing grid, mapped like the paths. */
const P = (x: number, y: number): [number, number] => [x * tc - y * ts, x * ts + y * tc];

// blunt round head at the front (+38), tapering to a slim tail root at −36
const body = blob([
  [38, 3],
  [35, -9],
  [26, -19],
  [12, -21],
  [-2, -14],
  [-20, -7],
  [-33, -4.5],
  [-37, -2],
  [-37, 2.5],
  [-31, 4.5],
  [-16, 7],
  [-2, 12],
  [14, 20],
  [30, 16],
]);
// one long, low dorsal ribbon from the nape to the tail
const dorsal = tube(
  [
    [8, -19, 2.6],
    [-4, -15, 3],
    [-18, -9.5, 2.8],
    [-32, -6, 2.4],
  ],
  0.9,
);
const tail = blob(
  [
    [-34, -4],
    [-40, -9],
    [-45, -7],
    [-46, 0],
    [-45, 7],
    [-40, 9],
    [-34, 4],
  ],
  0.9,
);
// the eyebrow tufts: two plump upright cirri with round tips (filled capsules, R2)
const tufts = join(capsule(24, -16, 3.2, 28, -29, 2.7), capsule(15, -18, 3.2, 14, -30, 2.7));
const pectoral = ellipse(-6, 9, 5.5, 3, 22);
// darker olive spots, placed by hand (R18 spots, 5)
const spots = join(
  circle(-4, -5, 3.4),
  circle(-16, 0, 3),
  circle(-27, -1, 2.6),
  circle(6, -11, 3),
  circle(-10, -11, 2.6),
);

export default defineArt({
  id: 'blenny',
  klass: 'fish',
  size: 'S',
  feature: 'big blunt round head with two upright eyebrow tufts, tapering to a long low body',
  personality: ['nosy', 'cheeky', 'peeky'],
  palette: { body: '#9DAA6B', accent: '#5E6B3A' },
  groups: [
    {
      id: 'tail',
      pivot: P(-35, 0),
      parts: [
        { d: R(tail), role: 'body' },
        { d: R(ellipse(-46, 0, 3, 7)), role: 'accent', kind: 'pattern', alpha: 0.6 },
      ],
    },
    {
      id: 'tufts',
      pivot: P(20, -17),
      parts: [
        { d: R(tufts), role: 'body' },
        { d: R(join(circle(28, -29, 2.7), circle(14, -30, 2.7))), role: 'accent', kind: 'pattern' },
      ],
    },
    {
      id: 'body',
      parts: [
        { d: R(dorsal), role: 'body' },
        { d: R(body), role: 'body' },
        { d: R(ellipse(14, 17, 26, 7)), role: 'belly', kind: 'pattern' },
        { d: R(spots), role: 'accent', kind: 'pattern', alpha: 0.75 },
      ],
    },
    { id: 'finA', pivot: P(-9, 7), parts: [{ d: R(pectoral), role: 'body' }] },
  ],
  shine: R(ellipse(26, -11, 7, 3, -24)),
  face: {
    eyes: [P(12, 2)],
    eye: 9,
    zone: [0, -25, 38, 40],
    mouth: { at: P(32, 8), w: 6, shape: 'smile' },
    sweet: true,
  },
  idle: {
    ambient: [
      { m: 'bob', amp: 2, period: 2 },
      { m: 'wag', g: 'tail', amp: 10, period: 0.8 },
      { m: 'sway', g: 'tufts', amp: 6, period: 1.6 },
      { m: 'flutter', g: 'finA', amp: 16, period: 0.45 },
    ],
    signature: {
      dur: 1.5,
      every: [5, 8],
      tracks: [
        {
          p: 'ty',
          k: [
            [0, 0],
            [0.08, -2],
            [0.2, 34],
            [0.4, 34],
            [0.62, -3],
            [0.72, 0],
          ],
        },
        within(waveTrack('tufts', 20, 3), 0.62, 1),
      ],
      face: [
        [0.4, 0.62, 'surprised'],
        [0.66, 0.86, 'happy'],
        [0.86, 1, 'wink'],
      ],
    },
  },
  catch: {
    dur: 0.5,
    tracks: [
      waveTrack('tufts', 22, 2),
      {
        p: 'sy',
        k: [
          [0, 1],
          [0.2, 0.88],
          [0.45, 1.1],
          [1, 1],
        ],
      },
    ],
    face: [[0, 1, 'happy']],
  },
});
