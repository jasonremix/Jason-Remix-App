import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Monogram } from '@/components/brand/Monogram';
import { Wordmark } from '@/components/brand/Wordmark';
import { palette } from '@/constants/theme';

/**
 * Der Startvorgang.
 *
 * Der native Splash zeigt die Facette auf Papier; hier wird nahtlos übernommen und der
 * Schriftzug eingeblendet, bevor sich alles auflöst, sobald die Sitzung wiederhergestellt
 * ist. Ein Mindest-Moment verhindert, dass ein schneller Start nur flackert.
 */

const ENTRY_MS = 620;
const MINIMUM_VISIBLE_MS = 900;
const EXIT_MS = 380;

export function BootScreen({ ready, onFinished }: { ready: boolean; onFinished: () => void }) {
  const mark = useSharedValue(0);
  const word = useSharedValue(0);
  const cover = useSharedValue(1);

  useEffect(() => {
    const easing = Easing.out(Easing.cubic);
    mark.value = withTiming(1, { duration: ENTRY_MS, easing });
    word.value = withDelay(ENTRY_MS, withTiming(1, { duration: ENTRY_MS, easing }));
  }, [mark, word]);

  useEffect(() => {
    if (!ready) return;

    // The delay is measured from mount rather than from `ready`, so a session restored
    // in 40 ms still gets the full beat instead of a flash.
    const timer = setTimeout(() => {
      cover.value = withTiming(
        0,
        { duration: EXIT_MS, easing: Easing.inOut(Easing.quad) },
        (finished) => {
          if (finished) runOnJS(onFinished)();
        },
      );
    }, MINIMUM_VISIBLE_MS);

    return () => clearTimeout(timer);
  }, [cover, onFinished, ready]);

  const coverStyle = useAnimatedStyle(() => ({ opacity: cover.value }));
  const markStyle = useAnimatedStyle(() => ({
    opacity: mark.value,
    transform: [{ scale: interpolate(mark.value, [0, 1], [0.9, 1]) }],
  }));
  const wordStyle = useAnimatedStyle(() => ({
    opacity: word.value,
    transform: [{ translateY: interpolate(word.value, [0, 1], [8, 0]) }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, coverStyle]} pointerEvents="none">
      <View style={styles.stack}>
        <Animated.View style={markStyle}>
          <Monogram size={64} />
        </Animated.View>

        <Animated.View style={wordStyle}>
          <Wordmark size="lg" tagline align="center" />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: palette.paper,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  stack: { alignItems: 'center', gap: 30 },
});
