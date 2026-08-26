import { StyleSheet, View } from 'react-native';

import { palette, spacing } from '@/constants/theme';

import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Overline, Text } from './Text';

/**
 * Empty and error states.
 *
 * Members never see a status code, a stack trace or an internal message — only what
 * happened and what they can do next.
 */

export function EmptyState({
  icon = 'box',
  eyebrow,
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon?: IconName;
  eyebrow?: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.root}>
      <Icon name={icon} size={30} color={palette.faint} strokeWidth={1.4} />
      {eyebrow && <Overline tone="muted">{eyebrow}</Overline>}
      <Text variant="heading" tone="primary" align="center">
        {title}
      </Text>
      {message && (
        <Text variant="bodySmall" tone="tertiary" align="center" style={styles.message}>
          {message}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button label={actionLabel} variant="secondary" size="sm" onPress={onAction} style={styles.action} />
      )}
    </View>
  );
}

export function ErrorState({
  title = 'Da ist etwas schiefgelaufen.',
  message,
  onRetry,
  retryLabel = 'TRY AGAIN',
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <View style={styles.root}>
      <Icon name="alert" size={28} color={palette.danger} strokeWidth={1.4} />
      <Text variant="heading" tone="primary" align="center">
        {title}
      </Text>
      {message && (
        <Text variant="bodySmall" tone="tertiary" align="center" style={styles.message}>
          {message}
        </Text>
      )}
      {onRetry && (
        <Button label={retryLabel} variant="secondary" size="sm" icon="refresh" onPress={onRetry} style={styles.action} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  message: { maxWidth: 320 },
  action: { marginTop: spacing.sm },
});
