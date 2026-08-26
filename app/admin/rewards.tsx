import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { AdminForm, toNumber } from '@/components/admin/AdminForm';
import { CreditPill } from '@/components/credits/CreditPill';
import { Chip } from '@/components/ui/Chip';
import { Row } from '@/components/ui/Row';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Hairline } from '@/components/ui/Surface';
import { EmptyState } from '@/components/ui/States';
import { spacing } from '@/constants/theme';
import { useRewards } from '@/hooks/useRewards';
import { adminService } from '@/services/admin.service';
import type { RewardCategory } from '@/types/models';

const CATEGORIES: RewardCategory[] = ['MERCH', 'COLLECTOR', 'TICKET', 'EXPERIENCE', 'DIGITAL'];

/** Der Server liefert den Status englisch; angezeigt wird er deutsch. */
const REDEMPTION_STATUS: Record<string, string> = {
  PENDING: 'IN PRÜFUNG',
  APPROVED: 'BESTÄTIGT',
  FULFILLED: 'EINGELÖST',
  REJECTED: 'ABGELEHNT',
  CANCELLED: 'STORNIERT',
};

/** Prämien: Katalog, Bestand und die noch offenen Einlösungen. */
export default function AdminRewards() {
  const rewards = useRewards();

  const save = useCallback(
    async (values: Record<string, string | boolean>) => {
      const raw = String(values.category ?? '').trim().toUpperCase();
      const category = (CATEGORIES as string[]).includes(raw) ? (raw as RewardCategory) : 'MERCH';

      await adminService.upsertReward({
        id: String(values.id ?? '').trim() || undefined,
        title: String(values.title).trim(),
        subtitle: String(values.subtitle ?? '').trim() || null,
        description: String(values.description ?? '').trim(),
        category,
        cost: toNumber(values.cost) ?? 0,
        stock: toNumber(values.stock),
        minLevel: toNumber(values.minLevel),
        requiresShipping: Boolean(values.requiresShipping),
        active: Boolean(values.active),
      });
      await rewards.refetch();
    },
    [rewards],
  );

  return (
    <Screen header={<ScreenHeader title="PRÄMIEN" />} contentStyle={styles.content}>
      <AdminForm
        title="PRÄMIE ANLEGEN ODER ÄNDERN"
        description="Bestand leer lassen für eine unbegrenzte Prämie, Level leer lassen, um sie für alle zu öffnen."
        submitLabel="PRÄMIE SPEICHERN"
        onSubmit={save}
        fields={[
          { name: 'id', label: 'ID (LEER = NEU ANLEGEN)', placeholder: 'rwd-merch' },
          { name: 'title', label: 'TITEL', required: true, placeholder: 'SAMMLERBOX' },
          { name: 'subtitle', label: 'UNTERTITEL', placeholder: 'Nummerierte Auflage' },
          { name: 'description', label: 'BESCHREIBUNG', type: 'multiline' },
          { name: 'category', label: 'KATEGORIE', initialValue: 'MERCH', hint: CATEGORIES.join(' · ') },
          {
            name: 'cost',
            label: 'KOSTEN IN CREDITS',
            type: 'number',
            required: true,
            placeholder: '2500',
          },
          { name: 'stock', label: 'BESTAND', type: 'number', placeholder: '100' },
          { name: 'minLevel', label: 'MINDESTLEVEL', type: 'number', placeholder: '3' },
          { name: 'requiresShipping', label: 'Benötigt eine Lieferadresse', type: 'switch' },
          { name: 'active', label: 'Für Mitglieder sichtbar', type: 'switch', initialValue: true },
        ]}
      />

      <View style={styles.section}>
        <SectionHeader title="AKTUELLER KATALOG" meta={`${rewards.data?.rewards.length ?? 0}`} />
        {(rewards.data?.rewards ?? []).length === 0 ? (
          <EmptyState icon="gift" title="Noch keine Prämien." />
        ) : (
          <View>
            {(rewards.data?.rewards ?? []).map((reward, index, all) => (
              <View key={reward.id}>
                <Row
                  title={reward.title}
                  subtitle={`${reward.id}${reward.remaining !== null ? ` · noch ${reward.remaining} von ${reward.stock}` : ' · unbegrenzt'}`}
                  icon="gift"
                  showChevron={false}
                  trailing={
                    <View style={styles.trailing}>
                      {reward.minLevel !== null && <Chip label={`LV ${reward.minLevel}`} tone="muted" />}
                      <CreditPill amount={reward.cost} size="sm" />
                    </View>
                  }
                />
                {index < all.length - 1 && <Hairline />}
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="OFFENE EINLÖSUNGEN"
          meta={`${rewards.data?.redemptions.length ?? 0}`}
        />
        {(rewards.data?.redemptions ?? []).length === 0 ? (
          <EmptyState icon="box" title="Nichts wartet auf Bearbeitung." />
        ) : (
          <View>
            {(rewards.data?.redemptions ?? []).map((redemption, index, all) => (
              <View key={redemption.id}>
                <Row
                  title={redemption.rewardTitle}
                  subtitle={redemption.id}
                  trailing={
                    <Chip label={REDEMPTION_STATUS[redemption.status] ?? redemption.status} tone="muted" />
                  }
                  showChevron={false}
                />
                {index < all.length - 1 && <Hairline />}
              </View>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xxl, paddingTop: spacing.lg },
  section: { gap: spacing.base },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
