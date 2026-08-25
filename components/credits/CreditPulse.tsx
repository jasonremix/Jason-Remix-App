import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
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
export function CreditPulse() {
  const pulse = useUiStore((state) => state.pulse);
  const clearPulse = useUiStore((state) => state.clearPulse);
  const insets = useSafeAreaInsets();

  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!pulse) return;

    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 1_100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished) clearPulse();
    });

    return () => animation.stop();
  }, [clearPulse, progress, pulse]);

  if (!pulse) return null;

  return (
    <View style={[styles.host, { top: insets.top + spacing.huge }]} pointerEvents="none">
      <Animated.View
        style={[
          styles.badge,
          {
            opacity: progress.interpolate({
              inputRange: [0, 0.12, 0.7, 1],
              outputRange: [0, 1, 1, 0],
            }),
            transform: [
              {
                translateY: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, -26],
                }),
              },
              {
                scale: progress.interpolate({
                  inputRange: [0, 0.18, 1],
                  outputRange: [0.92, 1, 1],
                }),
              },
            ],
          },
        ]}
      >
        {/* The light impulse itself — a short bright wash that decays faster than the badge. */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: palette.chrome,
              opacity: progress.interpolate({
                inputRange: [0, 0.1, 0.45, 1],
                outputRange: [0, 0.22, 0.04, 0],
              }),
            },
          ]}
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
