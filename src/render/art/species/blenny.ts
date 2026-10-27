/**
 * Blenny — the nosy neighbour of the shallows (fish class, profile view, level).
 * Silhouette (R10): a blunt, steep, round-headed body (head 31 u deep) with a flat belly, the big
 * eye set high under one small forked eyebrow cirrus, one continuous low scalloped crest along 70 %
 * of the back (CRITIQUE-4: 5 u, #B9C987, 4 scallops), a 4 u peduncle notch and a big olive fan tail.
 * CRITIQUE-4 cold read was "frog/toad": the long pelvic leg is now a small chin nub, the tall
 * dorsal sail is a low crest, and the pale pectoral is small, swept back 35° on the upper flank.
 * Personality: nosy, cheeky, peeky; rests with a one-sided smirk. Signature: ducks out of sight
 * below the tile edge, peeks back up, and waggles its eyebrows.
 */
import { blob, capsule, circle, defineArt, ellipse, join, waveTrack, within } from '../kit.ts';

// blunt round head at the front (+35), long and low, tapering to a deep tail root (12 u vs a 25 u
// head) that steps in 4 u at the peduncle notch before the fan
const body = blob(
  [
    [35.5, 0],
    [35, -11.2],
    [30.5, -19.9],
    [21, -22.5],
    [9, -20.5],
    [-3, -12.5],
    [-13, -10],
    [-20, -7.5],
    [-24, -6],
    [-24, 6],
    [-20, 7.5],
    [-12, 9],
    [0, 7.3],
    [14, 9.0],
    [27, 9.0],
    [33.8, 5.6],
  ],
  1,
);
// CRITIQUE-4: one continuous low dorsal crest over 70 % of the back (x 18 → −22), 5 u above the
// back line with 4 soft scallops, drawn behind the body so only the scalloped top shows
const dorsal = blob(
  [
    [22, -18.5],
    [19, -26.7],
    [14.5, -26.4],
    [10, -23.2],
    [5, -22.8],
    [0, -17.0],
    [-5, -17.0],
    [-10, -13.2],
    [-15, -14.4],
    [-21, -9.0],
    [-12, -6],
    [8, -9],
  ],
  0.8,
);
// a rounded fan tail 1.3x, in the darker olive, flaring from the notched peduncle (±4.5 → ±18)
const tail = blob(
  [
    [-22, -4.5],
    [-29, -7.5],
    [-38, -16.5],
    [-44.5, -13.5],
    [-46.5, 0],
    [-44.5, 13.5],
    [-38, 16.5],
    [-29, 7.5],
    [-22, 4.5],
  ],
  0.9,
);
// the eyebrow cirri: one small Y rooted on the crest's front over the eye, two forks of 4 × 6 u
// splayed ±30°: eyebrows, never antlers or bunny ears
const forkF = capsule(13.3, -25.0, 2, 17.8, -32.8, 1.7);
const forkR = capsule(10.7, -25.0, 2, 6.2, -32.8, 1.7);
// CRITIQUE-4: the pectoral 70 % size, rotated 35° back, rooted on the flank above the belly line
const pectoral = ellipse(-3, 2, 5.2, 2.6, -35);
// a small pelvic perch tucked along the belly (short: a long one hung like a frog's leg)
const pelvic = capsule(17, 9.5, 3, 12.5, 13.5, 2.6);
// resting smirk: a one-sided 3 u upturn at the cheek end of the wide flat lips (the kit has no smirk)
const smirk = 'M27.4 1.4Q25.4 1 25 -1.6';
// CRITIQUE-4: 4 darker olive spots of 6 u, placed by hand on the rear flank, clear of the eye
const spots = join(circle(-7, -6, 3.2), circle(-12, 1.5, 3.2), circle(-18, -3.5, 3.1), circle(-21.5, 3, 3));

export default defineArt({
  id: 'blenny',
  klass: 'fish',
  size: 'S',
  feature: 'blunt round head with a small forked eyebrow cirrus, a long low scalloped crest and a fan tail',
  personality: ['nosy', 'cheeky', 'peeky'],
  palette: { body: '#9AAE5E', accent: '#5F7436', belly: '#B9C987' },
  groups: [
    {
      id: 'tail',
      pivot: [-23, 0],
      parts: [
        { d: tail, role: 'accent' },
        {
          d: join(
            capsule(-28, -2.5, 2.4, -42, -11, 2.5),
            capsule(-29, 0, 2.4, -45, 0, 2.5),
            capsule(-28, 2.5, 2.4, -42, 11, 2.5),
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
        { d: pelvic, role: 'body' },
        { d: body, role: 'body' },
        { d: ellipse(12, 10, 26, 4.5), role: 'belly', kind: 'pattern' },
        { d: spots, role: 'accent', kind: 'pattern' },
        { d: smirk, role: 'ink', kind: 'line', w: 3 },
      ],
    },
    {
      id: 'tufts',
      pivot: [12, -20.5],
      parts: [
        { d: forkF, role: 'body' },
        { d: forkR, role: 'body' },
      ],
    },
    { id: 'finA', pivot: [1, -0.5], parts: [{ d: pectoral, role: 'belly' }] },
  ],
  shine: ellipse(25, -9, 6, 2.4, -15),
  face: {
    eyes: [[11, -8]],
    eye: 14,
    zone: [-3, -41, 41, 59],
    // cheeky: a flat mouth + the one-sided upturn line in the body group = the resting smirk
    mouth: { at: [31.3, 1.4], w: 9, shape: 'flat' },
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
