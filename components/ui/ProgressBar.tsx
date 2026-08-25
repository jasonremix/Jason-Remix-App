import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { alpha, gradients, motion, palette, radius } from '@/constants/theme';

/**
 * A thin machined track with a chrome fill. Used for level progress and Spotify
 * playback position.
 */
export function ProgressBar({
  progress,
  height = 3,
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
  const value = useRef(new Animated.Value(clamped)).current;

  useEffect(() => {
    if (!animated) {
      value.setValue(clamped);
      return;
    }
    Animated.timing(value, {
      toValue: clamped,
      duration: motion.slow,
      useNativeDriver: false,
    }).start();
  }, [animated, clamped, value]);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[styles.track, { height, borderRadius: height }, style]}
    >
      <Animated.View
        style={{
          height: '100%',
          borderRadius: height,
          overflow: 'hidden',
          width: value.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }}
      >
        <LinearGradient
          colors={[...gradients.chrome.colors]}
          locations={[...gradients.chrome.locations]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: palette.steel,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: alpha.hairline,
  },
});
