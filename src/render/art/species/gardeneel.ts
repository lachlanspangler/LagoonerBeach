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
  // CRITIQUE-4: the spotted garden eel's cream #F3EEE2 (off the Lagoon tan trio) with dark spots,
  // on its tan sand mound
  palette: { body: '#F3EEE2', accent: '#4A3E33', belly: '#CDB78A' },
  groups: [
    {
      id: 'body',
      pivot: [-6, 46],
      parts: [
        { d: stalk, role: 'body' },
        { d: head, role: 'body' },
        // six hand-placed dark spots (6 u) down the stalk and on the back of the head, clear of the eye
        {
          d: join(
            circle(-12.5, -26, 3),
            circle(-7.5, -6, 3.1),
            circle(-2.5, 3, 3),
            circle(-7.5, 11.5, 3),
            circle(-2.5, 19.5, 3),
            circle(-7, 27, 3),
          ),
          role: 'accent',
          kind: 'pattern',
        },
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
    R16: 'spotted-garden-eel cream #F3EEE2 (CRITIQUE-4), L 0.95 like the butterfly lemon; the dark spots and ink outline carry it',
    R16S: 'cream identity (chroma 0.02); the outline, dark spots and tan mound keep it off the sand',
    R16M: 'pale on the mint tile by nature (like the sand dollar); outline + dark spots keep it readable (checked on the mint sheet)',
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
