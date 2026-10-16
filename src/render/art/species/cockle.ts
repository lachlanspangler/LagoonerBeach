/**
 * Cockle — OBJECT class (front view), size XS.
 * Silhouette: a plump ribbed shell, wider than tall, with a round umbo knob on top and a lower lip
 * of four round scallops (R10: the ribs and their scalloped ends). Eyes peek from the gap between
 * the two valves (R6). Four brown ribs, never seven hairlines (R18).
 * Personality: dreamy, musical, round. Signature: the lid lifts 10° and it hums three little notes.
 * Groups (back to front): mantle (the face rides on it), body (lower valve), lid, notes (prop).
 */
import { blob, capsule, circle, defineArt, ellipse, join } from '../kit.ts';

const lid = blob([
  [-40, 2],
  [-29, -11],
  [-15, -24],
  [-7, -33],
  [-4, -40],
  [4, -40],
  [7, -33],
  [15, -24],
  [29, -11],
  [40, 2],
  [20, -6],
  [0, -8],
  [-20, -6],
]);
// four ribs fanning from the umbo to the lip
const ribs = join(
  capsule(-3, -31, 1.4, -28, -4, 2.8),
  capsule(-1, -33, 1.4, -10, -7, 3),
  capsule(1, -33, 1.4, 10, -7, 3),
  capsule(3, -31, 1.4, 28, -4, 2.8),
);
const base = join(
  blob([
    [-40, 4],
    [-20, 9],
    [0, 11],
    [20, 9],
    [40, 4],
    [32, 10],
    [18, 13],
    [0, 14],
    [-18, 13],
    [-32, 10],
  ]),
  circle(-29, 13, 7.5),
  circle(-10, 20, 9),
  circle(10, 20, 9),
  circle(29, 13, 7.5),
);
const mantle = ellipse(0, 1, 26, 11);
// the cockle's famous jumping foot, poking out under the lip
const foot = capsule(14, 22, 6, 30, 33, 5);
const notes = join(
  circle(30, -30, 3),
  capsule(32.6, -30, 1.3, 32.6, -39, 1.3),
  circle(40, -38, 2.6),
  capsule(42.3, -38, 1.2, 42.3, -46, 1.2),
  circle(22, -42, 2.4),
  capsule(24.2, -42, 1.1, 24.2, -48, 1.1),
);

export default defineArt({
  id: 'cockle',
  klass: 'object',
  size: 'XS',
  feature: 'a plump ribbed shell with an umbo knob and a scalloped lip',
  personality: ['dreamy', 'musical', 'round'],
  palette: { body: '#E7C8A0', accent: '#B7845B', belly: '#F4B8A4' },
  groups: [
    {
      id: 'mantle',
      parts: [
        { d: foot, role: 'belly' },
        { d: mantle, role: 'belly' },
      ],
    },
    {
      id: 'body',
      parts: [
        { d: base, role: 'body' },
        { d: 'M-29 8L-29 18M-10 13L-10 26M10 13L10 26M29 8L29 18', role: 'accent', kind: 'line', w: 2.6 },
      ],
    },
    {
      id: 'lid',
      pivot: [0, -6],
      parts: [
        { d: lid, role: 'body' },
        { d: ribs, role: 'accent', kind: 'pattern' },
      ],
    },
    { id: 'notes', pivot: [32, -38], prop: true, parts: [{ d: notes, role: 'accent' }] },
  ],
  shineOn: 'lid',
  shine: ellipse(-18, -20, 8, 3.6, -28),
  face: {
    g: 'mantle',
    eyes: [
      [-7.5, 1],
      [7.5, 1],
    ],
    eye: 8.6,
    zone: [-30, -20, 60, 36],
    mouth: { at: [0, 7], w: 5, shape: 'smile' },
    front: true,
    sweet: true,
  },
  idle: {
    ambient: [
      { m: 'breathe', amp: 0.015, period: 3.6 },
      { m: 'bob', g: 'lid', amp: 0.8, period: 3.6 },
    ],
    signature: {
      dur: 1.4,
      tracks: [
        {
          g: 'lid',
          p: 'ty',
          k: [
            [0, 0],
            [0.18, -5],
            [0.78, -5],
            [0.92, 0.6],
            [1, 0],
          ],
        },
        {
          g: 'lid',
          p: 'rot',
          k: [
            [0, 0],
            [0.18, -10],
            [0.36, -7],
            [0.54, -10],
            [0.72, -7],
            [0.86, 0],
          ],
        },
        {
          g: 'notes',
          p: 's',
          k: [
            [0, 0],
            [0.2, 0],
            [0.32, 1],
            [0.78, 1],
            [0.92, 0],
          ],
        },
        {
          g: 'notes',
          p: 'ty',
          k: [
            [0.2, 6],
            [0.92, -6],
          ],
        },
        {
          p: 'rot',
          k: [
            [0.2, 0],
            [0.38, 4],
            [0.56, -4],
            [0.74, 3],
            [0.9, 0],
          ],
        },
      ],
      face: [
        [0.18, 0.86, 'happy'],
        [0.88, 1, 'wink'],
      ],
    },
  },
  catch: {
    dur: 0.5,
    tracks: [
      {
        g: 'lid',
        p: 'ty',
        k: [
          [0, 0],
          [0.3, -5],
          [0.7, -4],
          [1, 0],
        ],
      },
      {
        p: 'sy',
        k: [
          [0, 1],
          [0.2, 0.86],
          [0.45, 1.14],
          [1, 1],
        ],
      },
    ],
    face: [[0, 1, 'happy']],
  },
});
