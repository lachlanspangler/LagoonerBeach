/**
 * Haptics. Web: Vibration API (Android). iOS Safari has none, so on iOS this is silent until the
 * Capacitor build swaps in the native Haptics plugin via `setNativeHaptics`.
 */
export type HapticKind = 'tick' | 'medium' | 'heavy' | 'fail';

const PATTERNS: Record<HapticKind, number | number[]> = {
  tick: 8,
  medium: 18,
  heavy: [22, 40, 30],
  fail: [30, 60, 30],
};

type Native = (k: HapticKind) => void;
let native: Native | null = null;

export function setNativeHaptics(fn: Native): void {
  native = fn;
}

/** At most one heavy pulse per HEAVY_GAP_MS; extra heavies soften to medium (ADR 0012). */
export const HEAVY_GAP_MS = 300;
export function guardHaptic(k: HapticKind, now: number, lastHeavy: number): HapticKind {
  return k === 'heavy' && now - lastHeavy < HEAVY_GAP_MS ? 'medium' : k;
}

export class Haptics {
  enabled = true;
  private lastHeavy = -Infinity;
  /** What actually fired, newest last (tests read it via the debug API). */
  readonly log: { k: HapticKind; t: number }[] = [];
  fire(want: HapticKind, now = performance.now()): void {
    if (!this.enabled) return;
    const k = guardHaptic(want, now, this.lastHeavy);
    if (k === 'heavy') this.lastHeavy = now;
    this.log.push({ k, t: now });
    if (this.log.length > 64) this.log.shift();
    if (native) return native(k);
    const nav = globalThis.navigator as Navigator | undefined;
    if (nav && typeof nav.vibrate === 'function') nav.vibrate(PATTERNS[k]);
  }
}
