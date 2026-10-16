/**
 * Sea Turtle — pilot exemplar for the TURTLE class (profile, swimming).
 * Silhouette: a high rounded dome shell, a big round head and one long front flipper sweeping back
 * (R10: the dome and the paddle). Personality: wise, steady, homeward.
 * Signature: tucks its head into the shell, then peeks back out with a smile.
 * Groups (back to front): back flipper, head (behind the shell so it can tuck), shell, front flipper.
 */
import { blob, circle, defineArt, ellipse, join, tube } from '../kit.ts';

const shell = blob([
  [-36, 6],
  [-32, -12],
  [-20, -25],
  [-4, -29],
  [12, -24],
  [22, -10],
  [23, 6],
  [8, 13],
  [-12, 14],
  [-28, 12],
]);
// five rounded scutes along the dome, larger in the middle
const scutes = join(
  ellipse(-21, -12, 7, 6.5, -30),
  ellipse(-5, -18, 8.5, 7),
  ellipse(11, -11, 7, 6.5, 30),
  ellipse(-13, 3, 6.5, 5),
  ellipse(4, 2, 6.5, 5),
);
const head = blob([
  [16, -6],
  [24, -16],
  [36, -17],
  [42, -7],
  [42, 5],
  [36, 12],
  [24, 12],
  [16, 6],
]);
const frontFlipper = tube([
  [12, 8, 6.5],
  [6, 16, 6.2],
  [-4, 23, 5],
  [-14, 27, 3.4],
]);
const backFlipper = join(
  tube([
    [-26, 10, 5.4],
    [-32, 15, 4.6],
    [-38, 17, 3],
  ]),
  circle(-37, 3, 3.6),
);

export default defineArt({
  id: 'turtle',
  klass: 'turtle',
  size: 'L',
  feature: 'a high dome shell with big scutes and a long front paddle',
  personality: ['wise', 'steady', 'homeward'],
  palette: { body: '#6B9A58', accent: '#B9CF84', belly: '#D9C68A' },
  groups: [
    { id: 'flipB', pivot: [-27, 10], parts: [{ d: backFlipper, role: 'belly' }] },
    {
      id: 'head',
      pivot: [18, 2],
      parts: [
        { d: head, role: 'belly' },
        { d: join(circle(25, -11, 3), circle(31, 9, 3)), role: 'body', kind: 'pattern', alpha: 0.55 },
      ],
    },
    {
      id: 'body',
      parts: [
        { d: shell, role: 'body' },
        { d: scutes, role: 'accent', kind: 'pattern' },
        { d: ellipse(-6, 15, 32, 6), role: 'belly', kind: 'pattern' },
        { d: 'M-34 7C-20 11 6 11 22 6', role: 'ink', kind: 'line', w: 3, alpha: 0.5 },
      ],
    },
    {
      id: 'flipF',
      pivot: [12, 7],
      parts: [
        { d: frontFlipper, role: 'belly' },
        { d: circle(0, 19, 3), role: 'body', kind: 'pattern', alpha: 0.5 },
      ],
    },
  ],
  shine: ellipse(-12, -21, 10, 4, -12),
  face: {
    g: 'head',
    eyes: [[32, -1]],
    eye: 7.8, // the absolute floor for L (4 px in the tile)
    zone: [16, -18, 27, 32],
    mouth: { at: [39, 6], w: 5, shape: 'smile' },
    sweet: true,
  },
  deviations: {
    R7: 'profile eye sits on the round head (its own face zone), not 34 % back along the shell',
  },
  idle: {
    ambient: [
      { m: 'bob', amp: 1.5, period: 3.2 },
      { m: 'paddle', g: 'flipF', amp: 18, period: 1.8 },
      { m: 'paddle', g: 'flipB', amp: 18, period: 1.8, phase: 0.5 },
      { m: 'sway', g: 'head', amp: 3, period: 3.2, phase: 0.3 },
    ],
    signature: {
      dur: 1.5,
      tracks: [
        {
          g: 'head',
          p: 'tx',
          k: [
            [0, 0],
            [0.18, -17],
            [0.55, -17],
            [0.72, 1.5],
            [0.82, 0],
          ],
        },
        {
          g: 'head',
          p: 's',
          k: [
            [0, 1],
            [0.18, 0.86],
            [0.55, 0.86],
            [0.72, 1.04],
            [0.82, 1],
          ],
        },
        {
          g: 'flipF',
          p: 'rot',
          k: [
            [0, 0],
            [0.18, -16],
            [0.55, -16],
            [0.72, 0],
          ],
        },
        {
          p: 'ty',
          k: [
            [0, 0],
            [0.18, 1.5],
            [0.55, 1.5],
            [0.7, -2],
            [0.82, 0],
          ],
        },
      ],
      face: [
        [0.08, 0.6, 'blink'],
        [0.65, 1, 'happy'],
      ],
    },
  },
  catch: {
    dur: 0.5,
    tracks: [
      {
        g: 'flipF',
        p: 'rot',
        k: [
          [0, 0],
          [0.25, -28],
          [0.5, 18],
          [0.75, -20],
          [1, 0],
        ],
      },
      {
        g: 'flipB',
        p: 'rot',
        k: [
          [0, 0],
          [0.25, 22],
          [0.5, -16],
          [1, 0],
        ],
      },
      {
        p: 'sy',
        k: [
          [0, 1],
          [0.2, 0.92],
          [0.45, 1.06],
          [1, 1],
        ],
      },
    ],
    face: [[0, 1, 'happy']],
  },
});
