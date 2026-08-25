import { Pressable, StyleSheet, View } from 'react-native';

import { palette, spacing } from '@/constants/theme';

import { Icon } from './Icon';
import { Overline, Text } from './Text';

/**
 * The rule above every list: a tracked-out label, an optional count, and an optional
 * trailing action. Nothing heavier — the space around it does the separating.
 */
export function SectionHeader({
  title,
  meta,
  actionLabel,
  onAction,
}: {
  title: string;
  meta?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.root}>
      <View style={styles.titleRow}>
        <Overline tone="muted">{title}</Overline>
        {meta && (
          <Text variant="labelWide" tone="muted" uppercase>
            {meta}
          </Text>
        )}
      </View>

      {actionLabel && onAction && (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button" style={styles.action}>
          <Text variant="labelWide" tone="tertiary" uppercase>
            {actionLabel}
          </Text>
          <Icon name="chevron-right" size={12} color={palette.titanium} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.base,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
