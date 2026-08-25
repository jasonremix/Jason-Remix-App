import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { alpha, palette, spacing } from '@/constants/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

/**
 * The standard list row: optional leading icon, a title with optional secondary line,
 * an optional value on the right, and a chevron when it navigates.
 */
export function Row({
  title,
  subtitle,
  value,
  icon,
  onPress,
  destructive = false,
  disabled = false,
  trailing,
  showChevron,
  style,
}: {
  title: string;
  subtitle?: string;
  value?: string;
  icon?: IconName;
  onPress?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  trailing?: ReactNode;
  showChevron?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const chevron = showChevron ?? Boolean(onPress);
  const tone = destructive ? 'danger' : disabled ? 'muted' : 'secondary';

  const content = (
    <View style={[styles.row, style]}>
      {icon && (
        <Icon
          name={icon}
          size={18}
          color={destructive ? palette.danger : palette.titanium}
        />
      )}

      <View style={styles.text}>
        <Text variant="body" tone={tone} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text variant="caption" tone="muted" numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>

      {value && (
        <Text variant="bodySmall" tone="muted" numberOfLines={1}>
          {value}
        </Text>
      )}
      {trailing}
      {chevron && <Icon name="chevron-right" size={14} color={palette.titanium} />}
    </View>
  );

  if (!onPress || disabled) return content;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    paddingVertical: spacing.base,
  },
  text: { flex: 1, gap: 3 },
  pressed: { backgroundColor: alpha.press },
});
