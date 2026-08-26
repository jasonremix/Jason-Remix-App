import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { palette, radius, spacing } from '@/constants/theme';

import { Text } from './Text';

export type ChipTone = 'neutral' | 'active' | 'muted' | 'danger' | 'success' | 'warning';

const TONE_STYLES: Record<ChipTone, { background: string; border: string; color: string }> = {
  neutral: { background: palette.card, border: palette.rule, color: palette.muted },
  active: { background: palette.accentWash, border: palette.accentWash, color: palette.accent },
  muted: { background: 'transparent', border: palette.rule, color: palette.faint },
  danger: { background: palette.dangerWash, border: palette.dangerWash, color: palette.danger },
  success: { background: palette.successWash, border: palette.successWash, color: palette.success },
  warning: { background: palette.warningWash, border: palette.warningWash, color: palette.warning },
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
