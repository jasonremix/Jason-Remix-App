import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { brand } from '@/constants/brand';
import { spacing } from '@/constants/theme';

import { Text } from '../ui/Text';

export type WordmarkSize = 'sm' | 'md' | 'lg' | 'hero';

const SIZES: Record<WordmarkSize, { fontSize: number; lineHeight: number; tracking: number }> = {
  sm: { fontSize: 17, lineHeight: 20, tracking: -0.5 },
  md: { fontSize: 24, lineHeight: 26, tracking: -0.9 },
  lg: { fontSize: 36, lineHeight: 37, tracking: -1.5 },
  hero: { fontSize: 52, lineHeight: 50, tracking: -2.4 },
};

/**
 * `JASON REMIX`, set heavy and tight in Syne.
 *
 * The opposite of the wide-tracked light setting this replaced: at extra-bold with
 * negative tracking the two words lock into a block, which is what makes it read as a
 * printed mark rather than as a page heading.
 */
export function Wordmark({
  size = 'md',
  tagline,
  align = 'flex-start',
  tone = 'primary',
  style,
}: {
  size?: WordmarkSize;
  /** Shows `DIE OFFIZIELLE APP` (or an override) beneath the name. */
  tagline?: boolean | string;
  align?: ViewStyle['alignItems'];
  tone?: 'primary' | 'inverse' | 'accent';
  style?: StyleProp<ViewStyle>;
}) {
  const metrics = SIZES[size];
  const taglineText = typeof tagline === 'string' ? tagline : brand.tagline;

  return (
    <View style={[{ alignItems: align }, style]} accessibilityRole="header">
      <Text
        variant="hero"
        tone={tone}
        style={{
          fontSize: metrics.fontSize,
          lineHeight: metrics.lineHeight,
          letterSpacing: metrics.tracking,
        }}
        maxFontSizeMultiplier={1.2}
      >
        {brand.name}
      </Text>

      {tagline && (
        <Text
          variant="labelWide"
          tone={tone === 'inverse' ? 'inverse' : 'tertiary'}
          style={styles.tagline}
          maxFontSizeMultiplier={1.2}
        >
          {taglineText}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tagline: { marginTop: spacing.sm },
});
