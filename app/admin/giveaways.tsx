import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AdminForm, toNumber } from '@/components/admin/AdminForm';
import { CreditPill } from '@/components/credits/CreditPill';
import { Chip } from '@/components/ui/Chip';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Row } from '@/components/ui/Row';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Hairline, Surface } from '@/components/ui/Surface';
import { EmptyState } from '@/components/ui/States';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { useGiveaways } from '@/hooks/useGiveaways';
import { toAppError } from '@/lib/errors';
import { formatDateTime } from '@/lib/format';
import { adminService } from '@/services/admin.service';
import type { Giveaway } from '@/types/models';
import { useUiStore } from '@/store/uiStore';

type PendingAction = { giveaway: Giveaway; action: 'close' | 'draw' };

/** Der Server liefert den Status englisch; angezeigt wird er deutsch. */
const GIVEAWAY_STATUS: Record<string, string> = {
  DRAFT: 'ENTWURF',
  SCHEDULED: 'GEPLANT',
  OPEN: 'OFFEN',
  CLOSED: 'GESCHLOSSEN',
  DRAWN: 'GEZOGEN',
  CANCELLED: 'ABGESAGT',
};

/**
 * Verwaltung der Gewinnspiele.
 *
 * Schließen und Ziehen sind zwei getrennte, bewusste Schritte: ein Gewinnspiel muss
 * geschlossen sein, bevor gezogen werden kann, und die Ziehung selbst passiert
 * vollständig auf dem Server.
 */
export default function AdminGiveaways() {
  const giveaways = useGiveaways();
  const showToast = useUiStore((state) => state.showToast);

  const [pending, setPending] = useState<PendingAction | null>(null);
  const [applying, setApplying] = useState(false);
  const [lastDraw, setLastDraw] = useState<string | null>(null);

  const create = useCallback(
    async (values: Record<string, string | boolean>) => {
      await adminService.upsertGiveaway({
        id: String(values.id ?? '').trim() || undefined,
        title: String(values.title).trim(),
        subtitle: String(values.subtitle ?? '').trim() || null,
        description: String(values.description ?? '').trim(),
        startsAt: String(values.startsAt).trim(),
        endsAt: String(values.endsAt).trim(),
        entryCost: toNumber(values.entryCost) ?? 0,
        totalEntries: toNumber(values.totalEntries),
        maxEntriesPerUser: toNumber(values.maxEntriesPerUser) ?? 1,
        winnerCount: toNumber(values.winnerCount) ?? 1,
        terms: String(values.terms ?? '').trim(),
      });
      await giveaways.refetch();
    },
    [giveaways],
  );

  const apply = useCallback(async () => {
    if (!pending) return;
    setApplying(true);
    try {
      if (pending.action === 'close') {
        await adminService.closeGiveaway(pending.giveaway.id);
        showToast('GEWINNSPIEL GESCHLOSSEN', 'neutral');
      } else {
        const result = await adminService.drawGiveaway(pending.giveaway.id);
        setLastDraw(
          `${result.winners.length} Gewinner gezogen · Seed ${result.drawSeedHash.slice(0, 16)}…`,
        );
        showToast('GEWINNER GEZOGEN', 'positive');
      }
      await giveaways.refetch();
    } catch (error) {
      showToast(toAppError(error).message, 'negative');
    } finally {
      setApplying(false);
      setPending(null);
    }
  }, [giveaways, pending, showToast]);

  const all = giveaways.data?.giveaways ?? [];

  return (
    <Screen header={<ScreenHeader title="GEWINNSPIELE" />} contentStyle={styles.content}>
      <AdminForm
        title="GEWINNSPIEL ANLEGEN"
        description="Gesamtzahl der Lose leer lassen für ein unbegrenztes Gewinnspiel."
        submitLabel="GEWINNSPIEL SPEICHERN"
        onSubmit={create}
        fields={[
          { name: 'id', label: 'ID (LEER = NEU ANLEGEN)', placeholder: 'gwy-tour-vip' },
          { name: 'title', label: 'TITEL', required: true, placeholder: 'SEE YOU SOON TOUR 2027' },
          { name: 'subtitle', label: 'UNTERTITEL', placeholder: 'VIP-ERLEBNIS' },
          { name: 'description', label: 'BESCHREIBUNG', type: 'multiline' },
          { name: 'startsAt', label: 'BEGINNT AM', required: true, placeholder: '2026-09-01T12:00:00Z' },
          { name: 'endsAt', label: 'ENDET AM', required: true, placeholder: '2026-09-30T23:59:00Z' },
          {
            name: 'entryCost',
            label: 'KOSTEN PRO LOS',
            type: 'number',
            required: true,
            placeholder: '1000',
          },
          { name: 'totalEntries', label: 'LOSE INSGESAMT', type: 'number', placeholder: '5000' },
          {
            name: 'maxEntriesPerUser',
            label: 'MAX. LOSE PRO MITGLIED',
            type: 'number',
            initialValue: '1',
          },
          { name: 'winnerCount', label: 'ANZAHL GEWINNER', type: 'number', initialValue: '1' },
          { name: 'terms', label: 'TEILNAHMEBEDINGUNGEN', type: 'multiline' },
        ]}
      />

      {lastDraw && (
        <Surface elevation="sunk" style={styles.result}>
          <Text variant="labelWide" tone="muted" uppercase>
            LETZTE ZIEHUNG
          </Text>
          <Text variant="bodySmall" tone="secondary">
            {lastDraw}
          </Text>
        </Surface>
      )}

      <View style={styles.section}>
        <SectionHeader title="ALLE GEWINNSPIELE" meta={`${all.length}`} />
        {all.length === 0 ? (
          <EmptyState icon="ticket" title="Noch keine Gewinnspiele." />
        ) : (
          <View>
            {all.map((giveaway, index) => (
              <View key={giveaway.id}>
                <Row
                  title={giveaway.title}
                  subtitle={`${giveaway.entriesUsed} Lose · endet ${formatDateTime(giveaway.endsAt)}`}
                  icon="ticket"
                  showChevron={false}
                  trailing={
                    <View style={styles.trailing}>
                      <Chip
                        label={GIVEAWAY_STATUS[giveaway.status] ?? giveaway.status}
                        tone={giveaway.status === 'OPEN' ? 'active' : 'muted'}
                      />
                      <CreditPill amount={giveaway.entryCost} size="sm" />
                    </View>
                  }
                />

                <View style={styles.actions}>
                  <Row
                    title={giveaway.status === 'OPEN' ? 'JETZT SCHLIESSEN' : 'BEREITS GESCHLOSSEN'}
                    icon="lock"
                    disabled={giveaway.status !== 'OPEN'}
                    onPress={
                      giveaway.status === 'OPEN'
                        ? () => setPending({ giveaway, action: 'close' })
                        : undefined
                    }
                    showChevron={false}
                  />
                  <Row
                    title={giveaway.status === 'DRAWN' ? 'GEWINNER GEZOGEN' : 'GEWINNER ZIEHEN'}
                    icon="star"
                    disabled={giveaway.status !== 'CLOSED'}
                    onPress={
                      giveaway.status === 'CLOSED'
                        ? () => setPending({ giveaway, action: 'draw' })
                        : undefined
                    }
                    showChevron={false}
                  />
                </View>

                {index < all.length - 1 && <Hairline />}
              </View>
            ))}
          </View>
        )}
      </View>

      <Text variant="caption" tone="muted">
        Die Gewinner werden auf dem Server aus den erfassten Losen gezogen, ein Preis pro
        Mitglied, und jede Ziehung wird mit der Anzahl der Lose und dem Hash ihres
        Zufalls-Seeds gespeichert, damit sie sich nachträglich prüfen lässt.
      </Text>

      <ConfirmDialog
        visible={pending !== null}
        eyebrow={pending?.action === 'draw' ? 'GEWINNER ZIEHEN' : 'GEWINNSPIEL SCHLIESSEN'}
        title={pending?.giveaway.title ?? ''}
        message={
          pending?.action === 'draw'
            ? 'Die Gewinner werden jetzt gezogen. Ein Gewinnspiel kann nur einmal gezogen werden, und das Ergebnis lässt sich danach nicht mehr ändern.'
            : 'Es können sofort keine Lose mehr genommen werden. Bereits vergebene Lose bleiben gültig.'
        }
        detail={
          pending
            ? pending.action === 'draw'
              ? `${pending.giveaway.entriesUsed} Lose · ${pending.giveaway.winnerCount} Gewinner`
              : `Endet vorzeitig, bisher ${pending.giveaway.entriesUsed} Lose vergeben`
            : undefined
        }
        confirmLabel={pending?.action === 'draw' ? 'ZIEHEN' : 'SCHLIESSEN'}
        destructive
        loading={applying}
        onConfirm={() => void apply()}
        onCancel={() => setPending(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xxl, paddingTop: spacing.lg },
  section: { gap: spacing.base },
  result: { padding: spacing.base, gap: spacing.xs },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actions: { paddingLeft: spacing.xxl, paddingBottom: spacing.sm },
});
