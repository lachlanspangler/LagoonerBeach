/**
 * Blenny — the nosy neighbour of the shallows (fish class, profile view, level).
 * Silhouette (R10): a blunt, round-headed body that stays deep to the tail (peduncle ≥ 55 % of the
 * head height, so never a drumstick) with two branched eyebrow cirri splayed over the eye, one long
 * lighter dorsal band from nape to tail, and a rounded dark-olive fan tail.
 * Personality: nosy, cheeky, peeky; rests with a cat-mouth smirk. Signature: ducks out of sight
 * below the tile edge, peeks back up, and waggles its eyebrows.
 */
import { blob, capsule, circle, defineArt, ellipse, join, tube, waveTrack, within } from '../kit.ts';

// blunt round head at the front (+38); long and low (2.6 : 1), tapering gently to a deep tail
// root (19 u vs a 31 u head = 61 %): never a drumstick, never a round clownfish
const body = blob([
  [38, 2],
  [36, -9.5],
  [29, -17],
  [16, -18],
  [2, -14],
  [-13, -11],
  [-26, -9.5],
  [-30, 0],
  [-26, 9.5],
  [-13, 11],
  [2, 13.5],
  [16, 17],
  [29, 16],
  [36, 10],
]);
// the long, low dorsal: one lighter band riding the whole back, nape to tail root
const dorsal = tube(
  [
    [22, -13.5, 2.8],
    [10, -17.5, 3.8],
    [-4, -16.5, 4],
    [-17, -14, 3.6],
    [-28, -11, 3],
  ],
  0.9,
);
// a rounded fan tail in the darker olive, flaring from the deep peduncle
const tail = blob(
  [
    [-25, -6],
    [-32, -9.5],
    [-40, -13],
    [-45.3, -6.5],
    [-45.3, 6.5],
    [-40, 13],
    [-32, 9.5],
    [-25, 6],
  ],
  0.9,
);
// the eyebrow cirri: two branched tufts straddling the eye, splayed ±25° (never bunny ears);
// each is a stem with one side fork, so it reads as a little feathery antler at 54 px
// (the front one stands taller: one raised eyebrow, the cheeky look)
const tuftF = capsule(16, -13, 3.3, 22.5, -31.5, 2.7);
const forkF = capsule(19.6, -23, 2.3, 25.5, -26.5, 2.2);
const tuftR = capsule(5, -13.5, 3.3, -0.5, -28.5, 2.7);
const forkR = capsule(1.8, -22, 2.3, -3.5, -25.5, 2.2);
// a flat pectoral swept back along the flank, well behind the eye (not a second mouth)
const pectoral = ellipse(-10, 10, 8, 3.6, 22);
// the perch: blennies sit propped on their stubby pelvic fins under the chin
const pelvic = capsule(16, 13, 3.4, 13, 23.5, 2.8);
// darker olive spots (R18 spots, ≥ 6 u), placed by hand along the flank, clear of the eye
const spots = join(
  circle(-9, -3, 3.3),
  circle(-19, 2.5, 3.1),
  circle(-24, -4.5, 3.1),
  circle(-28, 3.5, 3.1),
  circle(-14, -7.5, 3.1),
);

export default defineArt({
  id: 'blenny',
  klass: 'fish',
  size: 'S',
  feature: 'blunt round head with two branched eyebrow tufts and a long lighter dorsal band',
  personality: ['nosy', 'cheeky', 'peeky'],
  palette: { body: '#9AAE5E', accent: '#5F7436', belly: '#B9C987' },
  groups: [
    {
      id: 'tail',
      pivot: [-28, 0],
      parts: [
        { d: tail, role: 'accent' },
        {
          d: join(
            capsule(-30, -2, 2.4, -43, -8.5, 2.5),
            capsule(-31, 0, 2.4, -45, 0, 2.5),
            capsule(-30, 2, 2.4, -43, 8.5, 2.5),
          ),
          role: 'belly',
          kind: 'pattern',
          alpha: 0.55,
        },
      ],
    },
    {
      id: 'body',
      parts: [
        { d: pelvic, role: 'body' },
        { d: body, role: 'body' },
        { d: dorsal, role: 'belly' },
        { d: ellipse(14, 14, 26, 5), role: 'belly', kind: 'pattern' },
        { d: spots, role: 'accent', kind: 'pattern', alpha: 0.8 },
      ],
    },
    {
      id: 'tufts',
      pivot: [10, -19],
      parts: [
        { d: tuftF, role: 'body' },
        { d: forkF, role: 'body' },
        { d: tuftR, role: 'body' },
        { d: forkR, role: 'body' },
      ],
    },
    { id: 'finA', pivot: [-5, 6], parts: [{ d: pectoral, role: 'body' }] },
  ],
  shine: ellipse(28, -11, 6, 2.6, -24),
  face: {
    eyes: [[10, 0]],
    eye: 12.5,
    zone: [-3, -31, 41, 53],
    // cheeky: the cat-mouth smirk (the kit has no tilted smile)
    mouth: { at: [32, 7], w: 8, shape: 'w' },
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
