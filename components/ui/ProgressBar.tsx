import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { motion, palette } from '@/constants/theme';

/**
 * A thin machined track with a chrome fill. Used for level progress and Spotify
 * playback position.
 */
export function ProgressBar({
  progress,
  height = 4,
  animated = true,
  style,
  accessibilityLabel,
}: {
  /** 0..1 */
  progress: number;
  height?: number;
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  const value = useSharedValue(clamped);

  useEffect(() => {
    // Playback position updates every few seconds and should not ease, or the bar would
    // always be animating towards a figure that has already moved on.
    value.value = animated ? withTiming(clamped, { duration: motion.slow }) : clamped;
  }, [animated, clamped, value]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${value.value * 100}%` }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[styles.track, { height, borderRadius: height }, style]}
    >
      <Animated.View
        style={[
          { height: '100%', borderRadius: height, backgroundColor: palette.accent },
          fillStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: palette.paperSunk,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.rule,
  },
});
