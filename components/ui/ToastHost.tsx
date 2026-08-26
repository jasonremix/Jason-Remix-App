import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, motion, palette, radius, spacing } from '@/constants/theme';
import { useUiStore, type Toast } from '@/store/uiStore';

import { Text } from './Text';

const VISIBLE_MS = 3_200;

/** Renders the toast queue above everything else. Mounted once, in the root layout. */
export function ToastHost() {
  const toasts = useUiStore((state) => state.toasts);
  const insets = useSafeAreaInsets();

  if (toasts.length === 0) return null;

  return (
    <View
      style={[styles.host, { bottom: insets.bottom + layout.tabBarHeight + spacing.base }]}
      pointerEvents="box-none"
    >
      {toasts.map((toast) => (
        <ToastRow key={toast.id} toast={toast} />
      ))}
    </View>
  );
}

function ToastRow({ toast }: { toast: Toast }) {
  const dismiss = useUiStore((state) => state.dismissToast);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: motion.base });
    const timer = setTimeout(() => dismiss(toast.id), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [dismiss, progress, toast.id]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 8 }],
  }));

  const accent =
    toast.tone === 'positive'
      ? palette.success
      : toast.tone === 'negative'
        ? palette.danger
        : palette.accent;

  return (
    <Animated.View style={animatedStyle} exiting={FadeOut.duration(motion.fast)}>
      <Pressable onPress={() => dismiss(toast.id)} accessibilityRole="button" style={styles.toast}>
        <View style={[styles.accent, { backgroundColor: accent }]} />
        <Text variant="bodySmall" tone="primary" numberOfLines={2} style={styles.message}>
          {toast.message}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: layout.gutter,
    right: layout.gutter,
    gap: spacing.sm,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.card,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.ruleStrong,
    overflow: 'hidden',
  },
  accent: { width: 3, alignSelf: 'stretch' },
  message: { flex: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.base },
});
