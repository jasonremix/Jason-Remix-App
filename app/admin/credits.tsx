import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';

import { AdminForm, toNumber } from '@/components/admin/AdminForm';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { formatSignedCredits } from '@/lib/format';
import { adminService } from '@/services/admin.service';
import type { AdminAdjustCreditsInput } from '@/services/backend.types';

const TYPES: AdminAdjustCreditsInput['type'][] = ['ADMIN_ADJUSTMENT', 'BONUS', 'REFUND'];

/**
 * Manual credit adjustments.
 *
 * The most consequential screen in the admin area, so it is also the most deliberate:
 * a confirmation step that restates the exact movement, and an audit entry either way.
 */
export default function AdminCredits() {
  const [pending, setPending] = useState<AdminAdjustCreditsInput | null>(null);
  const [applying, setApplying] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const stage = useCallback(async (values: Record<string, string | boolean>) => {
    const amount = toNumber(values.amount);
    if (!amount) throw new Error('Enter a non-zero amount.');

    const raw = String(values.type ?? '').trim().toUpperCase();
    const type = (TYPES as string[]).includes(raw)
      ? (raw as AdminAdjustCreditsInput['type'])
      : 'ADMIN_ADJUSTMENT';

    setPending({
      userId: String(values.userId).trim(),
      amount,
      description: String(values.description).trim(),
      type,
    });
  }, []);

  const apply = useCallback(async () => {
    if (!pending) return;
    setApplying(true);
    try {
      await adminService.adjustCredits(pending);
      setLastResult(`${formatSignedCredits(pending.amount)} applied to ${pending.userId}`);
    } finally {
      setApplying(false);
      setPending(null);
    }
  }, [pending]);

  return (
    <Screen header={<ScreenHeader title="CREDITS" />} contentStyle={styles.content}>
      <AdminForm
        title="ADJUST A BALANCE"
        description="Use a positive amount to grant credits and a negative amount to take them back. A negative adjustment can never push a balance below zero."
        submitLabel="REVIEW ADJUSTMENT"
        onSubmit={stage}
        fields={[
          { name: 'userId', label: 'MEMBER ID', required: true, placeholder: 'Copy from Members' },
          { name: 'amount', label: 'AMOUNT', type: 'number', required: true, placeholder: '1000 or -1000' },
          { name: 'description', label: 'REASON', required: true, placeholder: 'Goodwill correction after support ticket #128' },
          { name: 'type', label: 'TYPE', initialValue: 'ADMIN_ADJUSTMENT', hint: TYPES.join(' · ') },
        ]}
      />

      {lastResult && (
        <Surface elevation="inset" style={styles.result}>
          <Text variant="labelWide" tone="muted" uppercase>
            LAST ADJUSTMENT
          </Text>
          <Text variant="bodySmall" tone="secondary">
            {lastResult}
          </Text>
        </Surface>
      )}

      <Text variant="caption" tone="muted">
        Every adjustment writes a ledger entry visible to the member and an audit entry
        naming you. There is no way to alter a balance without both.
      </Text>

      <ConfirmDialog
        visible={pending !== null}
        eyebrow="CONFIRM ADJUSTMENT"
        title={pending ? `${formatSignedCredits(pending.amount)} credits` : ''}
        message={pending?.description ?? ''}
        detail={pending ? `Member ${pending.userId} · recorded as ${pending.type}` : undefined}
        confirmLabel="APPLY"
        destructive={Boolean(pending && pending.amount < 0)}
        loading={applying}
        onConfirm={() => void apply()}
        onCancel={() => setPending(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingTop: spacing.lg },
  result: { padding: spacing.base, gap: spacing.xs },
});
