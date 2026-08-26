import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Hairline, Surface } from '@/components/ui/Surface';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { palette, spacing } from '@/constants/theme';

export type LegalSection = {
  heading: string;
  /** Paragraphs, rendered in order. */
  paragraphs?: string[];
  /** Bullet list rendered after the paragraphs. */
  bullets?: string[];
};

/**
 * Shared frame for the legal pages.
 *
 * Long-form text gets a wider measure and looser leading than the rest of the app —
 * these are documents to be read, not interface.
 */
export function LegalDocument({
  title,
  intro,
  updatedAt,
  sections,
  placeholderNotice,
}: {
  title: string;
  intro?: string;
  updatedAt?: string;
  sections: LegalSection[];
  /** Shown when the operator still has to supply real details before release. */
  placeholderNotice?: string;
}) {
  return (
    <Screen header={<ScreenHeader title={title} />} contentStyle={styles.content}>
      {placeholderNotice && (
        <Surface elevation="inset" style={styles.notice}>
          <Icon name="alert" size={15} color={palette.warning} />
          <View style={styles.noticeText}>
            <Text variant="label" tone="secondary" uppercase>
              TO BE COMPLETED BEFORE RELEASE
            </Text>
            <Text variant="caption" tone="muted">
              {placeholderNotice}
            </Text>
          </View>
        </Surface>
      )}

      {intro && (
        <Text variant="body" tone="tertiary" style={styles.prose}>
          {intro}
        </Text>
      )}

      {sections.map((section, index) => (
        <View key={section.heading} style={styles.section}>
          {index > 0 && <Hairline style={styles.rule} />}

          <Text variant="label" tone="chrome" uppercase>
            {section.heading}
          </Text>

          {section.paragraphs?.map((paragraph, paragraphIndex) => (
            <Text key={paragraphIndex} variant="bodySmall" tone="tertiary" style={styles.prose}>
              {paragraph}
            </Text>
          ))}

          {section.bullets && (
            <View style={styles.bullets}>
              {section.bullets.map((bullet) => (
                <View key={bullet} style={styles.bullet}>
                  <View style={styles.dot} />
                  <Text variant="bodySmall" tone="tertiary" style={styles.bulletText}>
                    {bullet}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}

      {updatedAt && (
        <Text variant="caption" tone="muted" style={styles.updated}>
          Stand: {updatedAt}
        </Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingTop: spacing.lg, maxWidth: 640 },
  notice: { flexDirection: 'row', gap: spacing.md, padding: spacing.base },
  noticeText: { flex: 1, gap: spacing.xs },
  section: { gap: spacing.md },
  rule: { marginBottom: spacing.sm },
  prose: { lineHeight: 22 },
  bullets: { gap: spacing.sm },
  bullet: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: palette.titanium,
    marginTop: 9,
  },
  bulletText: { flex: 1, lineHeight: 22 },
  updated: { marginTop: spacing.base },
});
