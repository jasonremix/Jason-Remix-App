import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Monogram } from '@/components/brand/Monogram';
import { Text } from '@/components/ui/Text';
import { alpha, palette, radius, spacing } from '@/constants/theme';
import { formatCredits } from '@/lib/format';

/**
 * A compact balance readout: the facet mark and a grouped figure.
 *
 * Reads as a struck token rather than a game currency — no coin, no colour, no glow.
 */
export function CreditPill({
  amount,
  size = 'md',
  onPress,
  style,
}: {
  amount: number;
  size?: 'sm' | 'md';
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const glyphSize = size === 'sm' ? 12 : 15;

  const content = (
    <View
      style={[
        styles.pill,
        size === 'sm' ? styles.pillSmall : styles.pillMedium,
        style,
      ]}
    >
      <Monogram size={glyphSize} />
      <Text
        variant={size === 'sm' ? 'bodySmall' : 'body'}
        tone="chrome"
        style={styles.value}
        maxFontSizeMultiplier={1.3}
      >
        {formatCredits(amount)}
      </Text>
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${formatCredits(amount)} credits`}
      hitSlop={8}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: palette.gunmetal,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: alpha.edge,
  },
  pillSmall: { paddingHorizontal: spacing.sm + 2, paddingVertical: 5 },
  pillMedium: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  value: { letterSpacing: 0.6, fontVariant: ['tabular-nums'] },
});
