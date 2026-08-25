import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { alpha, palette, radius, spacing } from '@/constants/theme';

/**
 * Loading placeholder — a slow luminance breathe rather than a sliding shimmer, which
 * would be too showy for this interface. Never an empty screen, never a spinner.
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
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

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
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.85] }),
        },
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
