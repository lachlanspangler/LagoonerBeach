/**
 * Garden Eel — LONG class (profile head on an upright stalk). Silhouette: a thin vertical stalk that
 * rises out of a wide sand mound and hooks into a round head at the top, like a periscope (R10: the
 * stalk on its burrow mound). Personality: swaying, social, timid.
 * Signature: retracts into the burrow and rises again. The mound is drawn in front, so the eel sinks
 * behind it.
 */
import { circle, defineArt, ellipse, join, tube } from '../kit.ts';

const stalk = tube([
  [-4, 38, 5.6],
  [-5, 24, 5.6],
  [-5, 8, 5.7],
  [-4, -8, 6],
  [-3, -14, 6.8],
]);
// one big round head (≈ 1.9× the stalk), tipped 15° toward the viewer so the face looks out at us
const head = ellipse(2.5, -23, 19, 15.5, 15);
const mound = join(ellipse(-4, 36, 30, 8.5), ellipse(-20, 38, 12, 6), ellipse(13, 38, 12, 6));

export default defineArt({
  id: 'gardeneel',
  klass: 'long',
  size: 'M',
  feature: 'a thin upright stalk rising out of a wide sand mound, hooked into a round head on top',
  personality: ['swaying', 'social', 'timid'],
  palette: { body: '#EED595', accent: '#4A3E33', belly: '#CDB78A' },
  groups: [
    {
      id: 'body',
      pivot: [-6, 46],
      parts: [
        { d: stalk, role: 'body' },
        { d: head, role: 'body' },
        { d: join(circle(-7.5, -3, 3.6), circle(-6.5, 19, 3.6)), role: 'accent', kind: 'pattern' },
      ],
    },
    {
      id: 'mound',
      pivot: [-4, 40],
      parts: [
        { d: mound, role: 'belly' },
        { d: join(circle(-20, 40, 3), circle(14, 41, 3)), role: 'ink', kind: 'pattern', alpha: 0.12 },
        { d: ellipse(-4, 30, 10, 3), role: 'ink', kind: 'pattern', alpha: 0.35 },
      ],
    },
  ],
  shine: ellipse(-4, -32, 7, 3, -10),
  face: {
    eyes: [[7.5, -23.5]],
    eye: 10.6,
    zone: [-11, -49, 31, 40],
    mouth: { at: [15, -12.5], w: 6, shape: 'smile' },
    sweet: true,
  },
  deviations: {
    R7: 'the body box is set by the burrow mound; the profile eye sits in the head at the top of the stalk',
  },
  ground: true,
  leap: { hide: ['mound'] },
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
