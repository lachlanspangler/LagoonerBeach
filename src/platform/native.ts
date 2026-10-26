/**
 * Native shell bridge (Capacitor). On the web this is a no-op. In the iOS/Android builds it swaps
 * the Vibration-API haptics for the native Haptics plugin (iOS has no web vibration at all).
 */
import { setNativeHaptics, type HapticKind } from './haptics.ts';

interface CapGlobal {
  isNativePlatform?: () => boolean;
}

/** True inside the iOS/Android shells (Capacitor's bridge is injected before our script runs). */
export function isNative(): boolean {
  const cap = (globalThis as unknown as { Capacitor?: CapGlobal }).Capacitor;
  return !!cap?.isNativePlatform?.();
}

export async function initNative(): Promise<void> {
  if (!isNative()) return;
  const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
  const map: Record<HapticKind, () => Promise<void>> = {
    tick: () => Haptics.impact({ style: ImpactStyle.Light }),
    medium: () => Haptics.impact({ style: ImpactStyle.Medium }),
    heavy: () => Haptics.impact({ style: ImpactStyle.Heavy }),
    fail: () => Haptics.notification({ type: NotificationType.Warning }),
  };
  setNativeHaptics((k) => void map[k]().catch(() => undefined));
}
