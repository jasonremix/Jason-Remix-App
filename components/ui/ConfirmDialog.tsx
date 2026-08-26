import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { alpha, layout, palette, spacing } from '@/constants/theme';

import { Button } from './Button';
import { Surface } from './Surface';
import { Overline, Text } from './Text';

export type ConfirmDialogProps = {
  visible: boolean;
  eyebrow?: string;
  title: string;
  message: string;
  /** Rendered between the message and the actions — used to restate a credit cost. */
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * The app's only modal.
 *
 * Anything that spends credits or cannot be undone routes through here, so the
 * confirmation moment always looks and reads the same way.
 */
export function ConfirmDialog({
  visible,
  eyebrow,
  title,
  message,
  detail,
  confirmLabel = 'BESTÄTIGEN',
  cancelLabel = 'ABBRECHEN',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable
          style={[StyleSheet.absoluteFill, styles.scrim]}
          onPress={loading ? undefined : onCancel}
          accessibilityLabel="Schließen"
        />

        <Surface style={styles.dialog} rounded="xl">
          <View style={styles.body}>
            {eyebrow && <Overline tone="muted">{eyebrow}</Overline>}
            <Text variant="title" tone="primary">
              {title}
            </Text>
            <Text variant="body" tone="tertiary">
              {message}
            </Text>
            {detail && (
              <View style={styles.detail}>
                <Text variant="bodySmall" tone="accent">
                  {detail}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.actions}>
            <Button
              label={cancelLabel}
              variant="ghost"
              onPress={onCancel}
              disabled={loading}
              style={styles.action}
            />
            <Button
              label={confirmLabel}
              variant={destructive ? 'danger' : 'primary'}
              onPress={onConfirm}
              loading={loading}
              style={styles.action}
            />
          </View>
        </Surface>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: layout.gutter,
  },
  scrim: { backgroundColor: alpha.scrim },
  dialog: {
    width: '100%',
    maxWidth: 420,
    borderColor: palette.ruleStrong,
  },
  body: { padding: spacing.xl, gap: spacing.md },
  detail: {
    marginTop: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    backgroundColor: palette.accentWash,
    borderRadius: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.xl,
    paddingTop: 0,
  },
  action: { flex: 1 },
});
