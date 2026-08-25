import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { alpha, palette, radius, spacing } from '@/constants/theme';

import { Text } from './Text';

export type ChipTone = 'neutral' | 'active' | 'muted' | 'danger' | 'success' | 'warning';

const TONE_STYLES: Record<ChipTone, { background: string; border: string; color: string }> = {
  neutral: { background: 'transparent', border: alpha.edge, color: palette.silver },
  active: { background: 'rgba(228,231,235,0.08)', border: alpha.edgeStrong, color: palette.chrome },
  muted: { background: 'transparent', border: alpha.hairline, color: palette.titanium },
  danger: { background: palette.dangerDim, border: 'rgba(194,84,79,0.35)', color: palette.danger },
  success: { background: palette.successDim, border: 'rgba(127,161,132,0.3)', color: palette.success },
  warning: { background: palette.warningDim, border: 'rgba(183,154,99,0.3)', color: palette.warning },
};

/** A small status marker: `OPEN`, `LEVEL 08`, `SOLD OUT`, `DEMO MODE`. */
export function Chip({
  label,
  tone = 'neutral',
  style,
}: {
  label: string;
  tone?: ChipTone;
  style?: StyleProp<ViewStyle>;
}) {
  const toneStyle = TONE_STYLES[tone];
  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: toneStyle.background, borderColor: toneStyle.border },
        style,
      ]}
    >
      <Text variant="labelWide" uppercase style={{ color: toneStyle.color }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
