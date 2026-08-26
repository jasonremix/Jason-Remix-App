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
      <Overline tone="muted">{title}</Overline>

      {/*
        The count sits at the far edge, not next to the title: both are tracked-out
        uppercase in the same tone, so side by side they read as one phrase
        („DISKOGRAFIE 8 TITEL“) rather than a heading and its count.
      */}
      <View style={styles.trailing}>
        {meta && (
          <Text variant="labelWide" tone="muted" uppercase>
            {meta}
          </Text>
        )}

        {actionLabel && onAction && (
          <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button" style={styles.action}>
            <Text variant="labelWide" tone="accent" uppercase>
              {actionLabel}
            </Text>
            <Icon name="chevron-right" size={12} color={palette.accent} />
          </Pressable>
        )}
      </View>
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
  trailing: { flexDirection: 'row', alignItems: 'center', gap: spacing.base },
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
