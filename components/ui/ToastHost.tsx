import { useEffect } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { alpha, layout, motion, palette, radius, spacing } from '@/constants/theme';
import { useUiStore, type Toast } from '@/store/uiStore';

import { Text } from './Text';

const VISIBLE_MS = 3_200;

/** Renders the toast queue above everything else. Mounted once, in the root layout. */
export function ToastHost() {
  const toasts = useUiStore((state) => state.toasts);
  const insets = useSafeAreaInsets();

  if (toasts.length === 0) return null;

  return (
    <View style={[styles.host, { bottom: insets.bottom + layout.tabBarHeight + spacing.base }]} pointerEvents="box-none">
      {toasts.map((toast) => (
        <ToastRow key={toast.id} toast={toast} />
      ))}
    </View>
  );
}

function ToastRow({ toast }: { toast: Toast }) {
  const dismiss = useUiStore((state) => state.dismissToast);
  const opacity = new Animated.Value(0);
  const translate = new Animated.Value(8);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: motion.base, useNativeDriver: true }),
      Animated.timing(translate, { toValue: 0, duration: motion.base, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => dismiss(toast.id), VISIBLE_MS);
    return () => clearTimeout(timer);
    // The animated values are created per mount; re-running would restart the entrance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.id]);

  const accent =
    toast.tone === 'positive' ? palette.chrome : toast.tone === 'negative' ? palette.danger : palette.titanium;

  return (
    <Animated.View style={{ opacity, transform: [{ translateY: translate }] }}>
      <Pressable onPress={() => dismiss(toast.id)} accessibilityRole="button" style={styles.toast}>
        <View style={[styles.accent, { backgroundColor: accent }]} />
        <Text variant="bodySmall" tone="secondary" numberOfLines={2} style={styles.message}>
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
    backgroundColor: palette.gunmetal,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: alpha.edge,
    overflow: 'hidden',
  },
  accent: { width: 2, alignSelf: 'stretch' },
  message: { flex: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.base },
});
