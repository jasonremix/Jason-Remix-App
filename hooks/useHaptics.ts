import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import { Platform } from 'react-native';

/**
 * Haptics used sparingly: a light tick on primary actions, a soft success on an award.
 * Never on scroll, navigation or incidental taps.
 */
export function useHaptics() {
  const supported = Platform.OS === 'ios' || Platform.OS === 'android';

  const tap = useCallback(() => {
    if (supported) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [supported]);

  const success = useCallback(() => {
    if (supported) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [supported]);

  const warn = useCallback(() => {
    if (supported) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, [supported]);

  return { tap, success, warn };
}
