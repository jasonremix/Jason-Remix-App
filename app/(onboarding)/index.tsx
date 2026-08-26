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
import { layout, palette, spacing } from '@/constants/theme';
import { useOnboardingStore } from '@/store/onboardingStore';

/**
 * Die Einführung in fünf Tafeln.
 *
 * Ein seitlicher Pager statt fünf Routen: die Bewegung ist der Punkt, und die Tafeln
 * teilen sich eine Markenzeile, die nie neu aufgebaut wird.
 */

type Panel = {
  eyebrow?: string;
  /** Wird als Wortmarke gesetzt statt als normale Schrift. */
  wordmark?: boolean;
  title?: string;
  /** Gestapelte Liste großer Einzelwörter. */
  words?: string[];
  body?: string;
};

const PANELS: Panel[] = [
  {
    wordmark: true,
    body: brand.tagline,
  },
  {
    eyebrow: 'DARUM GEHT ES',
    words: ['HÖREN', 'ENTDECKEN', 'SAMMELN', 'GEWINNEN'],
  },
  {
    eyebrow: 'SCHRITT EINS',
    title: 'Konto anlegen',
    body: 'Deine Credits, Prämien und Gewinnspiel-Lose hängen an deinem Mitgliedskonto und begleiten dich über alle Geräte hinweg.',
  },
  {
    eyebrow: 'SCHRITT ZWEI',
    title: 'Spotify verbinden',
    body: config.isSpotifyConfigured
      ? 'Mit Spotify wird die App persönlicher — und du verdienst deine ersten Credits. Du entscheidest genau, was geteilt wird, und kannst die Verbindung jederzeit trennen.'
      : 'Die Spotify-Verbindung steht bereit, sobald für diesen Build Zugangsdaten hinterlegt sind. Alles andere funktioniert schon heute.',
  },
  {
    eyebrow: 'BEREIT',
    title: 'Willkommen bei Jason Remix',
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
          accessibilityLabel="Einführung überspringen"
        >
          <Text variant="labelWide" tone="muted" uppercase>
            ÜBERSPRINGEN
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
                {panel.words.map((word, wordIndex, all) => (
                  // Das letzte Wort ist die Pointe — es bekommt als einziges Pigment.
                  // Eine Zeile pro Wort: „ENTDECKEN“ ist breit, und ein umgebrochenes
                  // Wort würde den Stapel als Liste unlesbar machen.
                  <Text
                    key={word}
                    variant="hero"
                    tone={wordIndex === all.length - 1 ? 'accent' : 'primary'}
                    style={styles.word}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    maxFontSizeMultiplier={1.1}
                  >
                    {word}
                  </Text>
                ))}
              </View>
            ) : (
              <Text variant="display" tone="primary">
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
              label="KONTO ANLEGEN"
              variant="primary"
              fullWidth
              onPress={() => void finish('/(auth)/register')}
            />
            <Button
              label="ICH HABE SCHON EIN KONTO"
              variant="ghost"
              fullWidth
              onPress={() => void finish('/(auth)/login')}
            />
          </View>
        ) : (
          <Button label="WEITER" variant="secondary" fullWidth onPress={advance} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.paper },
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
  words: { gap: spacing.xxs },
  // Kleiner als `hero`, damit das längste deutsche Wort auch auf einem schmalen
  // Gerät in eine Zeile passt.
  word: { fontSize: 30, lineHeight: 33, letterSpacing: -1 },
  body: { maxWidth: 380 },
  footer: {
    paddingHorizontal: layout.gutter,
    paddingTop: spacing.xl,
    gap: spacing.xl,
  },
  indicator: { flexDirection: 'row', gap: spacing.sm },
  segment: {
    flex: 1,
    height: 2,
    backgroundColor: palette.rule,
  },
  segmentActive: { backgroundColor: palette.accent },
  actions: { gap: spacing.sm },
});
