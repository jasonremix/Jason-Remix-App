import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { brand } from '@/constants/brand';
import { spacing } from '@/constants/theme';

import { Text } from '../ui/Text';

export type WordmarkSize = 'sm' | 'md' | 'lg' | 'hero';

const SIZES: Record<WordmarkSize, { fontSize: number; tracking: number; lineHeight: number }> = {
  sm: { fontSize: 15, tracking: 5, lineHeight: 20 },
  md: { fontSize: 20, tracking: 7, lineHeight: 26 },
  lg: { fontSize: 27, tracking: 9, lineHeight: 34 },
  hero: { fontSize: 34, tracking: 11, lineHeight: 42 },
};

/**
 * `JASON REMIX`, set in wide-tracked light display type.
 *
 * Deliberately flat chrome rather than gradient-filled: at this weight a gradient reads
 * as a novelty effect, while flat metal on black reads as an engraved plate.
 */
export function Wordmark({
  size = 'md',
  tagline,
  align = 'flex-start',
  style,
}: {
  size?: WordmarkSize;
  /** Shows `THE OFFICIAL EXPERIENCE` (or an override) beneath the name. */
  tagline?: boolean | string;
  align?: ViewStyle['alignItems'];
  style?: StyleProp<ViewStyle>;
}) {
  const metrics = SIZES[size];
  const taglineText = typeof tagline === 'string' ? tagline : brand.tagline;

  return (
    <View style={[{ alignItems: align }, style]} accessibilityRole="header">
      <Text
        variant="display"
        tone="primary"
        style={{
          fontSize: metrics.fontSize,
          lineHeight: metrics.lineHeight,
          // The tracking adds a trailing gap; a matching negative margin re-centres it.
          letterSpacing: metrics.tracking,
          marginRight: -metrics.tracking,
        }}
        maxFontSizeMultiplier={1.2}
      >
        {brand.name}
      </Text>

      {tagline && (
        <Text
          variant="labelWide"
          tone="muted"
          style={[styles.tagline, { marginRight: -3.2 }]}
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
