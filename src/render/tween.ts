/** Easing and spring helpers. All animation is driven by elapsed milliseconds, never frames. */

export const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - clamp01(t), 3);
export const easeInCubic = (t: number): number => Math.pow(clamp01(t), 3);
export const easeOutQuad = (t: number): number => 1 - (1 - clamp01(t)) * (1 - clamp01(t));
export const easeInOutSine = (t: number): number => -(Math.cos(Math.PI * clamp01(t)) - 1) / 2;

/** Overshoot then settle (back-out). s ≈ 1.7 gives ~10% overshoot. */
export function easeOutBack(t: number, s = 1.70158): number {
  const x = clamp01(t) - 1;
  return x * x * ((s + 1) * x + s) + 1;
}

/** Critically damped spring step toward target (semi-implicit). Returns [pos, vel]. */
export function springStep(pos: number, vel: number, target: number, dtMs: number, omega = 28): [number, number] {
  const dt = Math.min(dtMs, 50) / 1000;
  const f = 1 + 2 * dt * omega;
  const oo = omega * omega;
  const hoo = dt * oo;
  const hhoo = dt * hoo;
  const det = 1 / (f + hhoo);
  const p = det * (f * pos + dt * vel + hhoo * target);
  const v = det * (vel + hoo * (target - pos));
  return [p, v];
}
