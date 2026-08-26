import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { AdminForm } from '@/components/admin/AdminForm';
import { AchievementBadge } from '@/components/profile/AchievementBadge';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState } from '@/components/ui/States';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { useMe } from '@/hooks/useMe';
import { apiClient } from '@/lib/apiClient';
import { config } from '@/constants/config';
import { AppError } from '@/lib/errors';
import type { AchievementTier } from '@/types/models';

const TIERS: AchievementTier[] = ['STANDARD', 'RARE', 'ELITE'];

/** Badges. Codes are referenced by the server's unlock rules, so they are immutable keys. */
export default function AdminBadges() {
  const me = useMe();

  const save = useCallback(
    async (values: Record<string, string | boolean>) => {
      if (config.isDemoMode) {
        throw new AppError('SERVER_ERROR', 'Connect the API to create badges.');
      }

      const raw = String(values.tier ?? '').trim().toUpperCase();
      const tier = (TIERS as string[]).includes(raw) ? (raw as AchievementTier) : 'STANDARD';

      await apiClient.post('/admin/achievements', {
        code: String(values.code).trim().toUpperCase(),
        title: String(values.title).trim(),
        description: String(values.description ?? '').trim(),
        tier,
      });
      await me.refetch();
    },
    [me],
  );

  return (
    <Screen header={<ScreenHeader title="BADGES" />} contentStyle={styles.content}>
      <AdminForm
        title="ADD OR UPDATE A BADGE"
        description="The code is the key the server's unlock rules refer to — choose it once and keep it."
        submitLabel="SAVE BADGE"
        onSubmit={save}
        fields={[
          { name: 'code', label: 'CODE', required: true, placeholder: 'SUPER_FAN', hint: 'Uppercase letters, numbers and underscores.' },
          { name: 'title', label: 'TITLE', required: true, placeholder: 'SUPER FAN' },
          { name: 'description', label: 'DESCRIPTION', type: 'multiline' },
          { name: 'tier', label: 'TIER', initialValue: 'STANDARD', hint: TIERS.join(' · ') },
        ]}
      />

      <View style={styles.section}>
        <SectionHeader title="EXISTING BADGES" meta={`${me.data?.achievements.length ?? 0}`} />
        {(me.data?.achievements ?? []).length === 0 ? (
          <EmptyState icon="star" title="No badges defined yet." />
        ) : (
          <View style={styles.grid}>
            {(me.data?.achievements ?? []).map((achievement) => (
              <AchievementBadge key={achievement.id} achievement={achievement} size={76} />
            ))}
          </View>
        )}
      </View>

      <Text variant="caption" tone="muted">
        Badges shown here are rendered against your own account, so the locked and
        unlocked states reflect your progress rather than every member&rsquo;s.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xxl, paddingTop: spacing.lg },
  section: { gap: spacing.base },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.base },
});
