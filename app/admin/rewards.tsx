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
    <Screen header={<ScreenHeader title="REWARDS" />} contentStyle={styles.content}>
      <AdminForm
        title="ADD OR UPDATE A REWARD"
        description="Leave stock blank for an unlimited reward, and level blank to open it to everyone."
        submitLabel="SAVE REWARD"
        onSubmit={save}
        fields={[
          { name: 'id', label: 'ID (LEAVE BLANK TO CREATE)', placeholder: 'rwd-merch' },
          { name: 'title', label: 'TITLE', required: true, placeholder: 'COLLECTOR BOX' },
          { name: 'subtitle', label: 'SUBTITLE', placeholder: 'Numbered edition' },
          { name: 'description', label: 'DESCRIPTION', type: 'multiline' },
          { name: 'category', label: 'CATEGORY', initialValue: 'MERCH', hint: CATEGORIES.join(' · ') },
          { name: 'cost', label: 'COST IN CREDITS', type: 'number', required: true, placeholder: '2500' },
          { name: 'stock', label: 'STOCK', type: 'number', placeholder: '100' },
          { name: 'minLevel', label: 'MINIMUM LEVEL', type: 'number', placeholder: '3' },
          { name: 'requiresShipping', label: 'Requires a shipping address', type: 'switch' },
          { name: 'active', label: 'Visible to members', type: 'switch', initialValue: true },
        ]}
      />

      <View style={styles.section}>
        <SectionHeader title="CURRENT LADDER" meta={`${rewards.data?.rewards.length ?? 0}`} />
        {(rewards.data?.rewards ?? []).length === 0 ? (
          <EmptyState icon="gift" title="No rewards yet." />
        ) : (
          <View>
            {(rewards.data?.rewards ?? []).map((reward, index, all) => (
              <View key={reward.id}>
                <Row
                  title={reward.title}
                  subtitle={`${reward.id}${reward.remaining !== null ? ` · ${reward.remaining} of ${reward.stock} left` : ' · unlimited'}`}
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
        <SectionHeader title="PENDING REDEMPTIONS" meta={`${rewards.data?.redemptions.length ?? 0}`} />
        {(rewards.data?.redemptions ?? []).length === 0 ? (
          <EmptyState icon="box" title="Nothing waiting to be fulfilled." />
        ) : (
          <View>
            {(rewards.data?.redemptions ?? []).map((redemption, index, all) => (
              <View key={redemption.id}>
                <Row
                  title={redemption.rewardTitle}
                  subtitle={redemption.id}
                  trailing={<Chip label={redemption.status} tone="muted" />}
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
