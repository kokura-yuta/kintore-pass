import { Platform } from 'react-native';

export type FeedbackKind = 'tap' | 'selection' | 'success';
let lastFeedback = -Infinity;

// Optional feedback must never delay or break the actual operation.
export function feedback(kind: FeedbackKind = 'tap'): void {
  if (Platform.OS === 'web') return;
  const now = Date.now();
  if (now - lastFeedback < 120) return;
  lastFeedback = now;
  void (async () => {
    try {
      const haptics = await import('expo-haptics');
      if (Platform.OS === 'android') {
        await haptics.performAndroidHapticsAsync(kind === 'success'
          ? haptics.AndroidHaptics.Confirm : haptics.AndroidHaptics.Clock_Tick);
      } else if (kind === 'success') {
        await haptics.notificationAsync(haptics.NotificationFeedbackType.Success);
      } else if (kind === 'selection') {
        await haptics.selectionAsync();
      } else {
        await haptics.impactAsync(haptics.ImpactFeedbackStyle.Light);
      }
    } catch {
      // Unsupported device / older development binary: preserve normal behavior.
    }
  })();
}
