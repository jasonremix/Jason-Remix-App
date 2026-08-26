import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Monogram } from '@/components/brand/Monogram';
import { Text } from '@/components/ui/Text';
import { alpha, palette, radius, spacing } from '@/constants/theme';
import { formatSignedCredits } from '@/lib/format';
import { useUiStore } from '@/store/uiStore';

/**
 * The award flash: `+250` rising once through a brief metallic light, then gone.
 *
 * Mounted once in the root layout so any awarding action anywhere produces the same
 * moment. Roughly one second start to finish — long enough to register, short enough
 * that it never becomes a celebration.
 */
const DURATION_MS = 1_100;

export function CreditPulse() {
  const pulse = useUiStore((state) => state.pulse);
  const clearPulse = useUiStore((state) => state.clearPulse);
  const insets = useSafeAreaInsets();

  const progress = useSharedValue(0);

  useEffect(() => {
    if (!pulse) return;

    progress.value = 0;
    progress.value = withTiming(
      1,
      { duration: DURATION_MS, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(clearPulse)();
      },
    );
  }, [clearPulse, progress, pulse]);

  const badgeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.12, 0.7, 1], [0, 1, 1, 0]),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [10, -26]) },
      { scale: interpolate(progress.value, [0, 0.18, 1], [0.92, 1, 1]) },
    ],
  }));

  // The light impulse itself — a short bright wash that decays faster than the badge.
  const flashStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.1, 0.45, 1], [0, 0.22, 0.04, 0]),
  }));

  if (!pulse) return null;

  return (
    <View style={[styles.host, { top: insets.top + spacing.huge }]} pointerEvents="none">
      <Animated.View style={[styles.badge, badgeStyle]}>
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: palette.chrome }, flashStyle]}
        />
        <Monogram size={14} />
        <Text variant="heading" tone="primary" style={styles.amount}>
          {formatSignedCredits(pulse.amount)}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 40,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: palette.gunmetal,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: alpha.edgeStrong,
    overflow: 'hidden',
  },
  amount: { letterSpacing: 1, fontVariant: ['tabular-nums'] },
});
