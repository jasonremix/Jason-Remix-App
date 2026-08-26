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

/**
 * Giveaway administration.
 *
 * Closing and drawing are separate, deliberate steps: a giveaway must be closed before
 * it can be drawn, and the draw itself happens entirely on the server.
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
        showToast('GIVEAWAY CLOSED', 'neutral');
      } else {
        const result = await adminService.drawGiveaway(pending.giveaway.id);
        setLastDraw(
          `${result.winners.length} winner${result.winners.length === 1 ? '' : 's'} drawn · seed ${result.drawSeedHash.slice(0, 16)}…`,
        );
        showToast('WINNERS DRAWN', 'positive');
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
    <Screen header={<ScreenHeader title="GIVEAWAYS" />} contentStyle={styles.content}>
      <AdminForm
        title="CREATE A GIVEAWAY"
        description="Leave the total entry cap blank for an unlimited giveaway."
        submitLabel="SAVE GIVEAWAY"
        onSubmit={create}
        fields={[
          { name: 'id', label: 'ID (LEAVE BLANK TO CREATE)', placeholder: 'gwy-tour-vip' },
          { name: 'title', label: 'TITLE', required: true, placeholder: 'SEE YOU SOON TOUR 2027' },
          { name: 'subtitle', label: 'SUBTITLE', placeholder: 'VIP EXPERIENCE' },
          { name: 'description', label: 'DESCRIPTION', type: 'multiline' },
          { name: 'startsAt', label: 'OPENS AT', required: true, placeholder: '2026-09-01T12:00:00Z' },
          { name: 'endsAt', label: 'CLOSES AT', required: true, placeholder: '2026-09-30T23:59:00Z' },
          { name: 'entryCost', label: 'COST PER ENTRY', type: 'number', required: true, placeholder: '1000' },
          { name: 'totalEntries', label: 'TOTAL ENTRIES AVAILABLE', type: 'number', placeholder: '5000' },
          { name: 'maxEntriesPerUser', label: 'MAX ENTRIES PER MEMBER', type: 'number', initialValue: '1' },
          { name: 'winnerCount', label: 'NUMBER OF WINNERS', type: 'number', initialValue: '1' },
          { name: 'terms', label: 'CONDITIONS', type: 'multiline' },
        ]}
      />

      {lastDraw && (
        <Surface elevation="inset" style={styles.result}>
          <Text variant="labelWide" tone="muted" uppercase>
            LAST DRAW
          </Text>
          <Text variant="bodySmall" tone="secondary">
            {lastDraw}
          </Text>
        </Surface>
      )}

      <View style={styles.section}>
        <SectionHeader title="ALL GIVEAWAYS" meta={`${all.length}`} />
        {all.length === 0 ? (
          <EmptyState icon="ticket" title="No giveaways yet." />
        ) : (
          <View>
            {all.map((giveaway, index) => (
              <View key={giveaway.id}>
                <Row
                  title={giveaway.title}
                  subtitle={`${giveaway.entriesUsed} entries · closes ${formatDateTime(giveaway.endsAt)}`}
                  icon="ticket"
                  showChevron={false}
                  trailing={
                    <View style={styles.trailing}>
                      <Chip
                        label={giveaway.status}
                        tone={giveaway.status === 'OPEN' ? 'active' : 'muted'}
                      />
                      <CreditPill amount={giveaway.entryCost} size="sm" />
                    </View>
                  }
                />

                <View style={styles.actions}>
                  <Row
                    title={giveaway.status === 'OPEN' ? 'CLOSE NOW' : 'ALREADY CLOSED'}
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
                    title={giveaway.status === 'DRAWN' ? 'WINNERS DRAWN' : 'DRAW WINNERS'}
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
        Winners are selected on the server from the recorded entries, one prize per member,
        and each draw is stored with the entry count and the hash of its random seed so it
        can be checked afterwards.
      </Text>

      <ConfirmDialog
        visible={pending !== null}
        eyebrow={pending?.action === 'draw' ? 'DRAW WINNERS' : 'CLOSE GIVEAWAY'}
        title={pending?.giveaway.title ?? ''}
        message={
          pending?.action === 'draw'
            ? 'Winners will be selected now. A giveaway can only be drawn once and the result cannot be changed afterwards.'
            : 'Entries will stop immediately. Members who have already entered keep their entries.'
        }
        detail={
          pending
            ? pending.action === 'draw'
              ? `${pending.giveaway.entriesUsed} entries · ${pending.giveaway.winnerCount} winner${pending.giveaway.winnerCount === 1 ? '' : 's'}`
              : `Closes early, ${pending.giveaway.entriesUsed} entries taken so far`
            : undefined
        }
        confirmLabel={pending?.action === 'draw' ? 'DRAW' : 'CLOSE'}
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
