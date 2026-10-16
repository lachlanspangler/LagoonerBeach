/**
 * Native shell bridge (Capacitor). On the web this is a no-op. In the iOS/Android builds it swaps
 * the Vibration-API haptics for the native Haptics plugin (iOS has no web vibration at all).
 */
import { setNativeHaptics, type HapticKind } from './haptics.ts';

interface CapGlobal {
  isNativePlatform?: () => boolean;
}

export async function initNative(): Promise<void> {
  const cap = (globalThis as unknown as { Capacitor?: CapGlobal }).Capacitor;
  if (!cap?.isNativePlatform?.()) return;
  const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
  const map: Record<HapticKind, () => Promise<void>> = {
    tick: () => Haptics.impact({ style: ImpactStyle.Light }),
    medium: () => Haptics.impact({ style: ImpactStyle.Medium }),
    heavy: () => Haptics.impact({ style: ImpactStyle.Heavy }),
    fail: () => Haptics.notification({ type: NotificationType.Warning }),
  };
  setNativeHaptics((k) => void map[k]().catch(() => undefined));
}
