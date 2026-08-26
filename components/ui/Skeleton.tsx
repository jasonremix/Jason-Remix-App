import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { alpha, palette, radius, spacing } from '@/constants/theme';

/**
 * Loading placeholder — a slow luminance breathe rather than a sliding shimmer, which
 * would be too showy for this interface. Never an empty screen, never a spinner.
 *
 * Driven by Reanimated so the loop runs on the UI thread and keeps its rhythm even while
 * the first data payload is being parsed.
 */
export function Skeleton({
  width,
  height = 14,
  rounded = 'sm',
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  rounded?: keyof typeof radius;
  style?: StyleProp<ViewStyle>;
}) {
  const pulse = useSharedValue(0.45);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(0.85, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      style={[
        {
          width: width ?? '100%',
          height,
          borderRadius: radius[rounded],
          backgroundColor: palette.gunmetal,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: alpha.hairline,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

/** Card-shaped placeholder used by list screens while their first page loads. */
export function SkeletonCard({ lines = 2, height = 96 }: { lines?: number; height?: number }) {
  return (
    <View style={styles.card}>
      <Skeleton height={height} rounded="md" />
      <View style={styles.lines}>
        {Array.from({ length: lines }, (_, index) => (
          <Skeleton key={index} height={10} width={index === lines - 1 ? '52%' : '78%'} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  lines: { gap: spacing.sm },
});
