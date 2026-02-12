import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

const isNative = Capacitor.isNativePlatform();

/**
 * Platform-gated haptic feedback abstraction.
 *
 * All methods silently no-op in browser environments. Components MUST import
 * haptics from this module — direct `@capacitor/haptics` imports are forbidden
 * per CLAUDE.md Section 10.4.
 */
export const haptic = {
  /** Light impact — tap acknowledgment. */
  light: () => isNative && Haptics.impact({ style: ImpactStyle.Light }),

  /** Medium impact — satisfying discovery (word found). */
  medium: () => isNative && Haptics.impact({ style: ImpactStyle.Medium }),

  /** Heavy impact — dramatic feedback (No button press). */
  heavy: () => isNative && Haptics.impact({ style: ImpactStyle.Heavy }),

  /** Success notification — reward (correct answer, Yes press). */
  success: () => isNative && Haptics.notification({ type: NotificationType.Success }),

  /** Error notification — playful correction (wrong answer). */
  error: () => isNative && Haptics.notification({ type: NotificationType.Error }),

  /** Continuous vibration — celebration accent. */
  vibrate: () => isNative && Haptics.vibrate(),

  /** Sequential light impacts with configurable delay between each. */
  pattern: async (count: number, delay: number) => {
    if (!isNative) return;
    for (let i = 0; i < count; i++) {
      await Haptics.impact({ style: ImpactStyle.Light });
      await new Promise<void>((r) => setTimeout(r, delay));
    }
  },
} as const;
