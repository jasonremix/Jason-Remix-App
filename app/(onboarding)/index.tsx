import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Monogram } from '@/components/brand/Monogram';
import { Wordmark } from '@/components/brand/Wordmark';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { brand } from '@/constants/brand';
import { config } from '@/constants/config';
import { alpha, layout, palette, spacing } from '@/constants/theme';
import { useOnboardingStore } from '@/store/onboardingStore';

/**
 * The five-panel introduction.
 *
 * A paged scroll rather than five routes: the horizontal movement is the whole point,
 * and the panels share one persistent brand mark that never re-mounts.
 */

type Panel = {
  eyebrow?: string;
  /** Rendered as the wordmark instead of plain type. */
  wordmark?: boolean;
  title?: string;
  /** Stacked list of large single words. */
  words?: string[];
  body?: string;
};

const PANELS: Panel[] = [
  {
    wordmark: true,
    body: brand.tagline,
  },
  {
    eyebrow: 'WHAT THIS IS',
    words: ['LISTEN', 'DISCOVER', 'COLLECT', 'WIN'],
  },
  {
    eyebrow: 'STEP ONE',
    title: 'CREATE YOUR ACCOUNT',
    body: 'Your credits, rewards and giveaway entries are tied to your member account and follow you across devices.',
  },
  {
    eyebrow: 'STEP TWO',
    title: 'CONNECT SPOTIFY',
    body: config.isSpotifyConfigured
      ? 'Linking Spotify personalises your experience and earns your first credits. You choose exactly what is shared, and you can disconnect at any time.'
      : 'Spotify linking becomes available once credentials are configured for this build. Everything else works today.',
  },
  {
    eyebrow: 'READY',
    title: 'WELCOME TO THE JASON REMIX EXPERIENCE',
    body: brand.taglineAlt,
  },
];

export default function Onboarding() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const complete = useOnboardingStore((state) => state.complete);

  const isLast = index === PANELS.length - 1;

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(event.nativeEvent.contentOffset.x / width);
      if (next !== index) setIndex(next);
    },
    [index, width],
  );

  const advance = useCallback(() => {
    scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
  }, [index, width]);

  const finish = useCallback(
    async (destination: '/(auth)/register' | '/(auth)/login') => {
      await complete();
      router.replace(destination);
    },
    [complete],
  );

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <Monogram size={22} />
        <Pressable
          onPress={() => void finish('/(auth)/login')}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Skip introduction"
        >
          <Text variant="labelWide" tone="muted" uppercase>
            SKIP
          </Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={32}
        style={styles.pager}
      >
        {PANELS.map((panel, panelIndex) => (
          <View key={panelIndex} style={[styles.panel, { width }]}>
            {panel.eyebrow && (
              <Text variant="labelWide" tone="muted" uppercase>
                {panel.eyebrow}
              </Text>
            )}

            {panel.wordmark ? (
              <Wordmark size="hero" />
            ) : panel.words ? (
              <View style={styles.words}>
                {panel.words.map((word) => (
                  <Text key={word} variant="hero" tone="primary" style={styles.word}>
                    {word}
                  </Text>
                ))}
              </View>
            ) : (
              <Text variant="display" tone="primary" style={styles.title}>
                {panel.title}
              </Text>
            )}

            {panel.body && (
              <Text variant="body" tone="tertiary" style={styles.body}>
                {panel.body}
              </Text>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <View style={styles.indicator} accessibilityRole="progressbar">
          {PANELS.map((_, panelIndex) => (
            <View
              key={panelIndex}
              style={[styles.segment, panelIndex === index && styles.segmentActive]}
            />
          ))}
        </View>

        {isLast ? (
          <View style={styles.actions}>
            <Button
              label="CREATE ACCOUNT"
              variant="primary"
              fullWidth
              onPress={() => void finish('/(auth)/register')}
            />
            <Button
              label="I ALREADY HAVE AN ACCOUNT"
              variant="ghost"
              fullWidth
              onPress={() => void finish('/(auth)/login')}
            />
          </View>
        ) : (
          <Button label="CONTINUE" variant="secondary" fullWidth onPress={advance} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.obsidian },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.gutter,
    paddingBottom: spacing.lg,
  },
  pager: { flex: 1 },
  panel: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: layout.gutter,
    gap: spacing.xl,
  },
  words: { gap: spacing.xs },
  word: { letterSpacing: 4 },
  title: { letterSpacing: 1.6 },
  body: { maxWidth: 380 },
  footer: {
    paddingHorizontal: layout.gutter,
    paddingTop: spacing.xl,
    gap: spacing.xl,
  },
  indicator: { flexDirection: 'row', gap: spacing.sm },
  segment: {
    flex: 1,
    height: 1.5,
    backgroundColor: alpha.edge,
    borderRadius: 1,
  },
  segmentActive: { backgroundColor: palette.chrome },
  actions: { gap: spacing.sm },
});
