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

/**
 * Abzeichen.
 *
 * Auf die Codes beziehen sich die Freischaltregeln des Servers — sie sind feste
 * Schlüssel und werden nach dem Anlegen nicht mehr geändert.
 */
export default function AdminBadges() {
  const me = useMe();

  const save = useCallback(
    async (values: Record<string, string | boolean>) => {
      if (config.isDemoMode) {
        throw new AppError('SERVER_ERROR', 'Zum Anlegen von Abzeichen muss die API verbunden sein.');
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
    <Screen header={<ScreenHeader title="ABZEICHEN" />} contentStyle={styles.content}>
      <AdminForm
        title="ABZEICHEN ANLEGEN ODER ÄNDERN"
        description="Auf den Code beziehen sich die Freischaltregeln des Servers — einmal wählen und dann behalten."
        submitLabel="ABZEICHEN SPEICHERN"
        onSubmit={save}
        fields={[
          {
            name: 'code',
            label: 'CODE',
            required: true,
            placeholder: 'SUPER_FAN',
            hint: 'Großbuchstaben, Ziffern und Unterstriche.',
          },
          { name: 'title', label: 'TITEL', required: true, placeholder: 'SUPER FAN' },
          { name: 'description', label: 'BESCHREIBUNG', type: 'multiline' },
          { name: 'tier', label: 'STUFE', initialValue: 'STANDARD', hint: TIERS.join(' · ') },
        ]}
      />

      <View style={styles.section}>
        <SectionHeader title="VORHANDENE ABZEICHEN" meta={`${me.data?.achievements.length ?? 0}`} />
        {(me.data?.achievements ?? []).length === 0 ? (
          <EmptyState icon="star" title="Noch keine Abzeichen angelegt." />
        ) : (
          <View style={styles.grid}>
            {(me.data?.achievements ?? []).map((achievement) => (
              <AchievementBadge key={achievement.id} achievement={achievement} size={76} />
            ))}
          </View>
        )}
      </View>

      <Text variant="caption" tone="muted">
        Die Abzeichen hier werden gegen dein eigenes Konto gezeichnet: gesperrt und
        freigeschaltet zeigen deinen Fortschritt, nicht den aller Mitglieder.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xxl, paddingTop: spacing.lg },
  section: { gap: spacing.base },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.base },
});
