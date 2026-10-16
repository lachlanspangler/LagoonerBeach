/**
 * Sea Star — OBJECT class (M): the whole shape is the face (R5/R6).
 * Silhouette: five plump, round-tipped arms around a soft middle (R10: the arms, extra chunky,
 * so it reads as a cushion-star, not a sharp clip-art star). Face in the middle.
 * Personality: relaxed, huggy, slow. Signature: waves its upper-right arm hello, then winks.
 */
import { capsule, circle, defineArt, ellipse, join } from '../kit.ts';

const R = 32; // centre → tip
const arm = (deg: number, r0 = 16, r1 = 9.5) => {
  const a = (deg * Math.PI) / 180;
  return capsule(Math.cos(a) * 6, Math.sin(a) * 6, r0, Math.cos(a) * R, Math.sin(a) * R, r1);
};
// pale bumps along an arm (at fraction f of its length)
const bump = (deg: number, f: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return circle(Math.cos(a) * R * f, Math.sin(a) * R * f, r);
};
const WAVE = -18; // the arm that waves hello

export default defineArt({
  id: 'starfish',
  klass: 'object',
  size: 'M',
  feature: 'five plump round-tipped arms, face in the middle',
  personality: ['relaxed', 'huggy', 'slow'],
  palette: { body: '#F2795B', accent: '#FFD2BC' },
  groups: [
    {
      id: 'arm',
      pivot: [10, -2],
      parts: [
        { d: arm(WAVE), role: 'body' },
        { d: join(bump(WAVE, 0.82, 3.4), bump(WAVE, 0.6, 2.4)), role: 'accent', kind: 'pattern' },
      ],
    },
    {
      id: 'body',
      pivot: [0, 4],
      parts: [
        { d: circle(0, 2, 23), role: 'body' },
        { d: arm(-90), role: 'body' },
        { d: arm(54), role: 'body' },
        { d: arm(126), role: 'body' },
        { d: arm(198), role: 'body' },
        {
          d: join(
            bump(-90, 0.82, 3.4),
            bump(-90, 0.6, 2.4),
            bump(54, 0.8, 3.4),
            bump(126, 0.8, 3.4),
            bump(198, 0.82, 3.4),
            bump(198, 0.6, 2.4),
          ),
          role: 'accent',
          kind: 'pattern',
        },
      ],
    },
  ],
  shine: ellipse(-12, -14, 8, 4, -30),
  face: {
    eyes: [
      [-9, 4],
      [9, 4],
    ],
    eye: 11,
    zone: [-26, -26, 52, 52],
    mouth: { at: [0, 11], w: 6, shape: 'smile' },
    front: true,
    sweet: true,
  },
  idle: {
    ambient: [
      { m: 'breathe', amp: 0.015, period: 3.6 },
      { m: 'sway', amp: 2, period: 4.2 },
      { m: 'sway', g: 'arm', amp: 4, period: 3.6, phase: 0.3 },
    ],
    signature: {
      dur: 1.4,
      tracks: [
        {
          g: 'arm',
          p: 'rot',
          k: [
            [0, 0],
            [0.15, -42],
            [0.3, 14],
            [0.45, -42],
            [0.6, 14],
            [0.75, -30],
            [0.92, 0],
          ],
        },
        {
          p: 'rot',
          k: [
            [0, 0],
            [0.2, -5],
            [0.75, -5],
            [1, 0],
          ],
        },
      ],
      face: [
        [0.1, 0.75, 'happy'],
        [0.8, 1, 'wink'],
      ],
    },
  },
});
