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

/** Reiht eine Push-Nachricht ein. Sie erreicht nur Mitglieder, die zugestimmt haben. */
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
      showToast('NACHRICHT EINGEREIHT', 'positive');
    } catch (error) {
      showToast(toAppError(error).message, 'negative');
    } finally {
      setSending(false);
      setPending(null);
    }
  }, [pending, showToast]);

  return (
    <Screen header={<ScreenHeader title="PUSH-NACHRICHTEN" />} contentStyle={styles.content}>
      <AdminForm
        title="PUSH-NACHRICHT SENDEN"
        description="Wird nur an Mitglieder zugestellt, die Benachrichtigungen eingeschaltet haben."
        submitLabel="NACHRICHT PRÜFEN"
        onSubmit={stage}
        fields={[
          { name: 'title', label: 'TITEL', required: true, placeholder: 'NEUE VERÖFFENTLICHUNG' },
          {
            name: 'body',
            label: 'NACHRICHT',
            type: 'multiline',
            required: true,
            placeholder: 'Zeitgeist ist jetzt verfügbar.',
          },
          { name: 'category', label: 'KATEGORIE', initialValue: 'SYSTEM', hint: CATEGORIES.join(' · ') },
          { name: 'deepLink', label: 'DEEP-LINK', placeholder: 'jasonremix://giveaways/gwy-tour-vip' },
        ]}
      />

      {lastSent && (
        <Surface elevation="sunk" style={styles.result}>
          <Text variant="labelWide" tone="muted" uppercase>
            ZULETZT EINGEREIHT
          </Text>
          <Text variant="bodySmall" tone="secondary">
            {lastSent}
          </Text>
        </Surface>
      )}

      <Text variant="caption" tone="muted">
        Nachrichten werden auf dem Server erfasst und vom Benachrichtigungsdienst
        versendet — eine langsame Zustellung blockiert diesen Bildschirm also nie.
      </Text>

      <ConfirmDialog
        visible={pending !== null}
        eyebrow="NACHRICHT SENDEN"
        title={pending?.title ?? ''}
        message={pending?.body ?? ''}
        detail={pending ? `Kategorie ${pending.category}. Das erreicht alle Mitglieder mit Einwilligung und lässt sich nicht zurückholen.` : undefined}
        confirmLabel="SENDEN"
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
