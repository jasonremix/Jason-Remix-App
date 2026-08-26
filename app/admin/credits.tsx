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
 * Manuelle Korrekturen am Guthaben.
 *
 * Der folgenreichste Bildschirm im Admin-Bereich und deshalb auch der umständlichste:
 * eine Rückfrage, die die genaue Bewegung noch einmal nennt, und in jedem Fall ein
 * Eintrag im Prüfprotokoll.
 */
export default function AdminCredits() {
  const [pending, setPending] = useState<AdminAdjustCreditsInput | null>(null);
  const [applying, setApplying] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const stage = useCallback(async (values: Record<string, string | boolean>) => {
    const amount = toNumber(values.amount);
    if (!amount) throw new Error('Gib einen Betrag ungleich null ein.');

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
      setLastResult(`${formatSignedCredits(pending.amount)} auf ${pending.userId} gebucht`);
    } finally {
      setApplying(false);
      setPending(null);
    }
  }, [pending]);

  return (
    <Screen header={<ScreenHeader title="CREDITS" />} contentStyle={styles.content}>
      {/* Die Rückfrage unten ist der eigentliche Schutz — das Formular stellt nur scharf. */}
      <AdminForm
        title="GUTHABEN KORRIGIEREN"
        description="Ein positiver Betrag schreibt Credits gut, ein negativer nimmt sie zurück. Eine negative Korrektur kann ein Guthaben nie unter null drücken."
        submitLabel="KORREKTUR PRÜFEN"
        onSubmit={stage}
        fields={[
          {
            name: 'userId',
            label: 'MITGLIEDS-ID',
            required: true,
            placeholder: 'Aus „Mitglieder“ kopieren',
          },
          {
            name: 'amount',
            label: 'BETRAG',
            type: 'number',
            required: true,
            placeholder: '1000 oder -1000',
          },
          {
            name: 'description',
            label: 'GRUND',
            required: true,
            placeholder: 'Kulanzkorrektur nach Support-Anfrage #128',
          },
          { name: 'type', label: 'TYP', initialValue: 'ADMIN_ADJUSTMENT', hint: TYPES.join(' · ') },
        ]}
      />

      {lastResult && (
        <Surface elevation="sunk" style={styles.result}>
          <Text variant="labelWide" tone="muted" uppercase>
            LETZTE KORREKTUR
          </Text>
          <Text variant="bodySmall" tone="secondary">
            {lastResult}
          </Text>
        </Surface>
      )}

      <Text variant="caption" tone="muted">
        Jede Korrektur schreibt einen für das Mitglied sichtbaren Eintrag ins Kontobuch und
        einen Eintrag im Prüfprotokoll mit deinem Namen. Ein Guthaben lässt sich nicht
        ohne beides ändern.
      </Text>

      <ConfirmDialog
        visible={pending !== null}
        eyebrow="KORREKTUR BESTÄTIGEN"
        title={pending ? `${formatSignedCredits(pending.amount)} Credits` : ''}
        message={pending?.description ?? ''}
        detail={pending ? `Mitglied ${pending.userId} · erfasst als ${pending.type}` : undefined}
        confirmLabel="BUCHEN"
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
