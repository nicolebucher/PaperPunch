import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

// Spürbares Feedback beim Spielen: kurze Vibration bei richtig/falsch/Level geschafft.
// In der App über Capacitor Haptics, im Browser über navigator.vibrate (wo vorhanden).

function webVibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // nicht unterstützt
  }
}

export function hapticRight() {
  if (Capacitor.isNativePlatform()) void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
  else webVibrate(20);
}

export function hapticWrong() {
  if (Capacitor.isNativePlatform()) void Haptics.notification({ type: NotificationType.Error }).catch(() => {});
  else webVibrate([40, 60, 40]);
}

export function hapticWin() {
  if (Capacitor.isNativePlatform()) void Haptics.notification({ type: NotificationType.Success }).catch(() => {});
  else webVibrate([30, 40, 30, 40, 60]);
}
