/**
 * Garden Eel — LONG class (profile head on an upright stalk). Silhouette: a thin vertical stalk that
 * rises out of a wide sand mound and hooks into a round head at the top, like a periscope (R10: the
 * stalk on its burrow mound). Personality: swaying, social, timid.
 * Signature: retracts into the burrow and rises again. The mound is drawn in front, so the eel sinks
 * behind it.
 */
import { blob, circle, defineArt, ellipse, join, tube } from '../kit.ts';

const stalk = tube([
  [-6, 38, 6.6],
  [-8, 24, 6.8],
  [-7, 8, 6.8],
  [-4, -8, 7],
  [0, -20, 7.6],
]);
// one smooth head with a rounded snout (two ellipses read as a lump)
const head = blob([
  [-8, -27],
  [-4, -35],
  [5, -38],
  [14, -34],
  [20, -28],
  [19, -22],
  [10, -18],
  [0, -18],
  [-6, -20],
]);
const mound = join(ellipse(-4, 36, 30, 8.5), ellipse(-20, 38, 12, 6), ellipse(13, 38, 12, 6));

export default defineArt({
  id: 'gardeneel',
  klass: 'long',
  size: 'M',
  feature: 'a thin upright stalk rising out of a wide sand mound, hooked into a round head on top',
  personality: ['swaying', 'social', 'timid'],
  palette: { body: '#E3D9BE', accent: '#4A3E33', belly: '#CDB78A' },
  groups: [
    {
      id: 'body',
      pivot: [-6, 46],
      parts: [
        { d: stalk, role: 'body' },
        { d: head, role: 'body' },
        { d: join(circle(-2, -33, 3.4), circle(-10, 2, 3.4), circle(-8, 22, 3.4)), role: 'accent', kind: 'pattern' },
      ],
    },
    {
      id: 'mound',
      pivot: [-4, 40],
      parts: [
        { d: mound, role: 'belly' },
        {
          d: join(circle(-18, 40, 1.6), circle(8, 42, 1.4), circle(20, 38, 1.2)),
          role: 'ink',
          kind: 'pattern',
          alpha: 0.25,
        },
        { d: ellipse(-6, 30, 10, 2.6), role: 'ink', kind: 'pattern', alpha: 0.35 },
      ],
    },
  ],
  shine: ellipse(0, -36, 6, 2.6, -16),
  face: {
    eyes: [[9, -25]],
    eye: 6.6,
    zone: [-8, -41, 29, 28],
    mouth: { at: [16, -21], w: 5, shape: 'smile' },
    sweet: true,
  },
  deviations: {
    R7: 'the body box is set by the burrow mound; the profile eye sits in the head at the top of the stalk',
  },
  ground: true,
  idle: {
    ambient: [
      { m: 'sway', g: 'body', amp: 5, period: 2.2 },
      { m: 'breathe', amp: 0.01, period: 3 },
    ],
    signature: {
      dur: 1.5,
      every: [5, 8],
      tracks: [
        {
          g: 'body',
          p: 'sy',
          k: [
            [0, 1],
            [0.12, 1.05],
            [0.3, 0.16],
            [0.62, 0.16],
            [0.8, 1.08],
            [0.9, 0.97],
            [1, 1],
          ],
        },
        {
          g: 'body',
          p: 'sx',
          k: [
            [0, 1],
            [0.12, 0.96],
            [0.3, 1.1],
            [0.62, 1.1],
            [0.8, 0.94],
            [1, 1],
          ],
        },
        {
          g: 'mound',
          p: 'sy',
          k: [
            [0, 1],
            [0.3, 1.06],
            [0.4, 1],
            [0.78, 1],
            [0.86, 1.05],
            [1, 1],
          ],
        },
      ],
      face: [
        [0.15, 0.7, 'blink'],
        [0.74, 0.92, 'surprised'],
        [0.92, 1, 'happy'],
      ],
    },
  },
});
