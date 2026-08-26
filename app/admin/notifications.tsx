import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';

import { AdminForm } from '@/components/admin/AdminForm';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { toAppError } from '@/lib/errors';
import { adminService } from '@/services/admin.service';
import type { AdminPushInput } from '@/services/backend.types';
import { useUiStore } from '@/store/uiStore';

const CATEGORIES: AdminPushInput['category'][] = [
  'NEW_RELEASE',
  'NEW_GIVEAWAY',
  'REWARD_UNLOCKED',
  'SPECIAL_DROP',
  'SYSTEM',
];

/** Queues a push notification. Only members who opted in ever receive one. */
export default function AdminNotifications() {
  const showToast = useUiStore((state) => state.showToast);
  const [pending, setPending] = useState<AdminPushInput | null>(null);
  const [sending, setSending] = useState(false);
  const [lastSent, setLastSent] = useState<string | null>(null);

  const stage = useCallback(async (values: Record<string, string | boolean>) => {
    const raw = String(values.category ?? '').trim().toUpperCase();
    const category = (CATEGORIES as string[]).includes(raw)
      ? (raw as AdminPushInput['category'])
      : 'SYSTEM';

    setPending({
      title: String(values.title).trim(),
      body: String(values.body).trim(),
      category,
      deepLink: String(values.deepLink ?? '').trim() || undefined,
    });
  }, []);

  const send = useCallback(async () => {
    if (!pending) return;
    setSending(true);
    try {
      await adminService.sendPush(pending);
      setLastSent(pending.title);
      showToast('NOTIFICATION QUEUED', 'positive');
    } catch (error) {
      showToast(toAppError(error).message, 'negative');
    } finally {
      setSending(false);
      setPending(null);
    }
  }, [pending, showToast]);

  return (
    <Screen header={<ScreenHeader title="NOTIFICATIONS" />} contentStyle={styles.content}>
      <AdminForm
        title="SEND A PUSH NOTIFICATION"
        description="Delivered only to members who have switched notifications on."
        submitLabel="REVIEW MESSAGE"
        onSubmit={stage}
        fields={[
          { name: 'title', label: 'TITLE', required: true, placeholder: 'NEW RELEASE' },
          { name: 'body', label: 'MESSAGE', type: 'multiline', required: true, placeholder: 'Zeitgeist is available now.' },
          { name: 'category', label: 'CATEGORY', initialValue: 'SYSTEM', hint: CATEGORIES.join(' · ') },
          { name: 'deepLink', label: 'DEEP LINK', placeholder: 'jasonremix://giveaways/gwy-tour-vip' },
        ]}
      />

      {lastSent && (
        <Surface elevation="inset" style={styles.result}>
          <Text variant="labelWide" tone="muted" uppercase>
            LAST QUEUED
          </Text>
          <Text variant="bodySmall" tone="secondary">
            {lastSent}
          </Text>
        </Surface>
      )}

      <Text variant="caption" tone="muted">
        Messages are recorded on the server and dispatched by the notification worker, so
        a slow delivery never blocks this screen.
      </Text>

      <ConfirmDialog
        visible={pending !== null}
        eyebrow="SEND NOTIFICATION"
        title={pending?.title ?? ''}
        message={pending?.body ?? ''}
        detail={pending ? `Category ${pending.category}. This reaches every opted-in member and cannot be recalled.` : undefined}
        confirmLabel="SEND"
        loading={sending}
        onConfirm={() => void send()}
        onCancel={() => setPending(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingTop: spacing.lg },
  result: { padding: spacing.base, gap: spacing.xs },
});
