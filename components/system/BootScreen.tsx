import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { Monogram } from '@/components/brand/Monogram';
import { Wordmark } from '@/components/brand/Wordmark';
import { palette } from '@/constants/theme';

/**
 * The launch sequence.
 *
 * The native splash shows the facet mark on black; this takes over seamlessly and
 * brings up the wordmark, then dissolves once the session has been restored. Held for
 * a minimum beat so a fast launch does not produce a flicker.
 */

const ENTRY_MS = 620;
const MINIMUM_VISIBLE_MS = 900;
const EXIT_MS = 380;

export function BootScreen({ ready, onFinished }: { ready: boolean; onFinished: () => void }) {
  const mark = useRef(new Animated.Value(0)).current;
  const word = useRef(new Animated.Value(0)).current;
  const cover = useRef(new Animated.Value(1)).current;
  const mountedAt = useRef(Date.now());

  useEffect(() => {
    Animated.sequence([
      Animated.timing(mark, {
        toValue: 1,
        duration: ENTRY_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(word, {
        toValue: 1,
        duration: ENTRY_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [mark, word]);

  useEffect(() => {
    if (!ready) return;

    const elapsed = Date.now() - mountedAt.current;
    const delay = Math.max(0, MINIMUM_VISIBLE_MS - elapsed);

    const timer = setTimeout(() => {
      Animated.timing(cover, {
        toValue: 0,
        duration: EXIT_MS,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onFinished();
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [cover, onFinished, ready]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { opacity: cover }]} pointerEvents="none">
      <View style={styles.stack}>
        <Animated.View
          style={{
            opacity: mark,
            transform: [{ scale: mark.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
          }}
        >
          <Monogram size={56} />
        </Animated.View>

        <Animated.View
          style={{
            opacity: word,
            transform: [{ translateY: word.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
          }}
        >
          <Wordmark size="lg" tagline align="center" />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: palette.obsidian,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  stack: { alignItems: 'center', gap: 34 },
});
