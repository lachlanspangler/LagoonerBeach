/**
 * Blenny — the nosy neighbour of the shallows (fish class, profile view, level).
 * Silhouette (R10): a blunt, round-headed body that stays deep to the tail (peduncle ≥ 55 % of the
 * head height, so never a drumstick) with one small forked eyebrow cirrus over the eye, one long
 * lighter two-lobed dorsal crest (the blenny notch) from nape to tail, and a rounded olive fan tail.
 * Personality: nosy, cheeky, peeky; rests with a one-sided smirk. Signature: ducks out of sight
 * below the tile edge, peeks back up, and waggles its eyebrows.
 */
import { blob, capsule, circle, defineArt, ellipse, join, waveTrack, within } from '../kit.ts';

// blunt round head at the front (+38); long and low (2.6 : 1), tapering gently to a deep tail
// root (19 u vs a 31 u head = 61 %): never a drumstick, never a round clownfish
const body = blob(
  [
    [38.1, 0.0],
    [37.1, -8.0],
    [33.2, -12.12],
    [16.0, -15.48],
    [2.0, -12.04],
    [-13.0, -9.46],
    [-26.0, -8.17],
    [-30.0, 0.0],
    [-26.0, 6.04],
    [-13.0, 6.99],
    [2.0, 8.58],
    [16.0, 10.85],
    [32.2, 10.85],
    [37.1, 8.0],
  ],
  1,
);
// the long dorsal fin: one lighter crest riding the whole back, nape to tail root, with the
// blenny's little notch halfway; drawn behind the body so only its rayed top edge shows
const dorsal = blob(
  [
    [25, -9],
    [17, -21.2],
    [8, -25.4],
    [0, -17.4],
    [-8, -24.4],
    [-19, -22.0],
    [-28, -17.6],
    [-27, -5],
    [0, -6],
    [20, -6],
  ],
  0.8,
);
const dorsalRays = join(
  capsule(13, -11, 2.5, 13, -20.5, 2.5),
  capsule(5, -10, 2.5, 4.5, -22, 2.5),
  capsule(-9, -9, 2.5, -9.5, -21, 2.5),
  capsule(-18, -8, 2.5, -19, -19.5, 2.5),
);
// a rounded fan tail in the darker olive, flaring from the deep peduncle
const tail = blob(
  [
    [-25, -6],
    [-32, -8.8],
    [-39.2, -14.2],
    [-45.2, -9.8],
    [-45.2, 4.5],
    [-39.2, 14.2],
    [-32, 8.8],
    [-25, 6],
  ],
  0.9,
);
// the eyebrow cirri (CRITIQUE-3): one small Y rooted on the head right over the eye, two forks of
// 4 × 6 u splayed ±30°, standing ≤ 18 % of the body height: eyebrows, never antlers or bunny ears
const forkF = capsule(11.3, -22.5, 2, 14.3, -27.7, 1.7);
const forkR = capsule(8.7, -22.5, 2, 5.7, -27.7, 1.7);
// a flat pectoral swept back along the flank, well behind the eye (not a second mouth)
const pectoral = ellipse(-11, 5.5, 6, 2.6, 12);
// the pelvic perch, rotated 35° back and −30 % so it tucks along the belly (it hung like a leg)
const pelvic = capsule(17, 10, 3.2, 8, 17, 2.8);
// resting smirk: a one-sided 3 u upturn at the cheek end of the flat mouth (the kit has no smirk)
const smirk = 'M29.2 8.8Q27.2 8.4 26.8 5.8';
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
  feature: 'blunt round head with a small forked eyebrow cirrus and a long lighter dorsal band',
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
        { d: dorsal, role: 'belly' },
        { d: dorsalRays, role: 'body', kind: 'pattern', alpha: 0.5 },
        { d: pelvic, role: 'body' },
        { d: body, role: 'body' },
        { d: ellipse(14, 10.5, 26, 4.5), role: 'belly', kind: 'pattern' },
        { d: spots, role: 'accent', kind: 'pattern', alpha: 0.8 },
        { d: smirk, role: 'ink', kind: 'line', w: 3 },
      ],
    },
    {
      id: 'tufts',
      pivot: [10, -22],
      parts: [
        { d: forkF, role: 'body' },
        { d: forkR, role: 'body' },
      ],
    },
    { id: 'finA', pivot: [-5, 4], parts: [{ d: pectoral, role: 'body' }] },
  ],
  shine: ellipse(28, -8.5, 6, 2.4, -20),
  face: {
    eyes: [[12, -2]],
    eye: 13,
    zone: [-1, -34, 41, 56],
    // cheeky: a flat mouth + the one-sided upturn line in the body group = the resting smirk
    mouth: { at: [31.5, 8.4], w: 8, shape: 'flat' },
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
