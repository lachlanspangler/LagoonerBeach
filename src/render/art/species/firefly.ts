/**
 * Firefly Squid — front-facing CHIBI (S), night species.
 * Silhouette: a tall bullet mantle topped by an arrowhead fin, four short arms below, each tipped
 * with a glowing light organ (R10: the arrowhead + the lit tips). Light organs glow on Night.
 * Personality: blinky, social, bright. Signature: blinks hello three times, the lit arms flaring
 * open on every blink.
 */
import { blob, circle, defineArt, ellipse, join, tube, xform } from '../kit.ts';

const fin = blob(
  [
    [0, -42],
    [13, -36],
    [26, -26],
    [18, -20],
    [0, -24],
    [-18, -20],
    [-26, -26],
    [-13, -36],
  ],
  0.9,
);
const mantle = blob([
  [0, -38],
  [12, -33],
  [18, -17],
  [19, 0],
  [14, 12],
  [0, 16],
  [-14, 12],
  [-19, 0],
  [-18, -17],
  [-12, -33],
]);
const armOut = tube([
  [-10, 8, 5.4],
  [-16, 19, 4.6],
  [-20, 29, 3.8],
  [-19, 34, 3.4],
]);
const armIn = tube([
  [-4, 11, 5.4],
  [-6, 23, 4.6],
  [-6, 33, 3.8],
  [-4, 37, 3.4],
]);
const mirror = (d: string) => xform(d, { sx: -1 });
// lit arm tips: outlined light-organ beads, so they read on Day too (CRITIQUE-1), glow on Night
const tips = (sx: number) => join(circle(-19 * sx, 35, 3.8), circle(-4.5 * sx, 38, 3.8));

export default defineArt({
  id: 'firefly',
  klass: 'chibi',
  size: 'S',
  feature: 'tall bullet mantle under an arrowhead fin, four arms with glowing tips',
  personality: ['blinky', 'social', 'bright'],
  palette: { body: '#3D9BE9', accent: '#9BF0FF' },
  groups: [
    { id: 'fin', pivot: [0, -26], parts: [{ d: fin, role: 'body' }] },
    {
      id: 'armsL',
      pivot: [-7, 10],
      parts: [
        { d: armOut, role: 'body' },
        { d: armIn, role: 'body' },
        { d: tips(1), role: 'light' },
      ],
    },
    {
      id: 'armsR',
      pivot: [7, 10],
      parts: [
        { d: mirror(armOut), role: 'body' },
        { d: mirror(armIn), role: 'body' },
        { d: tips(-1), role: 'light' },
      ],
    },
    {
      id: 'body',
      parts: [
        { d: mantle, role: 'body' },
        // a few photophore dots on the upper mantle, clear of the face
        {
          d: join(
            circle(-9, -27, 3.1),
            circle(9, -27, 3.1),
            circle(0, -33, 3.1),
            circle(-13.5, -15, 3.1),
            circle(13.5, -15, 3.1),
          ),
          role: 'light',
          kind: 'pattern',
        },
        { d: ellipse(0, 12, 16, 5), role: 'belly', kind: 'pattern' },
      ],
    },
  ],
  shine: ellipse(-8, -22, 4, 8, 20),
  face: {
    eyes: [
      [-8, -6],
      [8, -6],
    ],
    eye: 10.4,
    zone: [-19, -38, 38, 54],
    mouth: { at: [0, 3], w: 4, shape: 'smile' },
    front: true,
    sweet: true,
  },
  idle: {
    ambient: [
      { m: 'bob', amp: 2.2, period: 2 },
      { m: 'breathe', amp: 0.025, period: 2.4 },
      { m: 'flutter', g: 'fin', amp: 6, period: 0.6 },
      { m: 'sway', g: 'armsL', amp: 6, period: 1.6 },
      { m: 'sway', g: 'armsR', amp: -6, period: 1.6, phase: 0.12 },
    ],
    signature: {
      dur: 1.3,
      tracks: [
        {
          g: 'armsL',
          p: 'rot',
          k: [
            [0, 0],
            [0.1, 22],
            [0.25, 0],
            [0.38, 22],
            [0.53, 0],
            [0.66, 22],
            [0.82, 0],
          ],
        },
        {
          g: 'armsR',
          p: 'rot',
          k: [
            [0, 0],
            [0.1, -22],
            [0.25, 0],
            [0.38, -22],
            [0.53, 0],
            [0.66, -22],
            [0.82, 0],
          ],
        },
        {
          p: 'ty',
          k: [
            [0, 0],
            [0.1, -3],
            [0.25, 0],
            [0.38, -3],
            [0.53, 0],
            [0.66, -3],
            [0.82, 0],
          ],
        },
      ],
      face: [
        [0.06, 0.14, 'blink'],
        [0.34, 0.42, 'blink'],
        [0.62, 0.7, 'blink'],
        [0.82, 1, 'happy'],
      ],
    },
  },
});
