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

export class Haptics {
  enabled = true;
  fire(k: HapticKind): void {
    if (!this.enabled) return;
    if (native) return native(k);
    const nav = globalThis.navigator as Navigator | undefined;
    if (nav && typeof nav.vibrate === 'function') nav.vibrate(PATTERNS[k]);
  }
}
