import { StyleSheet, View } from 'react-native';

import { AchievementBadge } from '@/components/profile/AchievementBadge';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Hairline } from '@/components/ui/Surface';
import { EmptyState } from '@/components/ui/States';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { useMe } from '@/hooks/useMe';
import { formatDateTime } from '@/lib/format';

/** Die vollständige Sammlung: freigeschaltete Plaketten zuerst, dann was noch aussteht. */
export default function Achievements() {
  const me = useMe();
  const achievements = me.data?.achievements ?? [];
  const unlocked = achievements.filter((achievement) => achievement.unlockedAt);
  const locked = achievements.filter((achievement) => !achievement.unlockedAt);

  return (
    <Screen header={<ScreenHeader title="ERFOLGE" />} contentStyle={styles.content}>
      {me.isPending ? (
        <View style={styles.grid}>
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} width={84} height={84} rounded="md" />
          ))}
        </View>
      ) : achievements.length === 0 ? (
        <EmptyState
          icon="star"
          title="Noch keine Erfolge."
          message="Sie schalten sich frei, während du mitmachst."
        />
      ) : (
        <>
          <View style={styles.section}>
            <SectionHeader
              title="FREIGESCHALTET"
              meta={`${unlocked.length} / ${achievements.length}`}
            />
            {unlocked.length === 0 ? (
              <Text variant="bodySmall" tone="muted">
                Noch nichts freigeschaltet — deine erste Mission ändert das.
              </Text>
            ) : (
              <View style={styles.grid}>
                {unlocked.map((achievement) => (
                  <AchievementBadge key={achievement.id} achievement={achievement} />
                ))}
              </View>
            )}
          </View>

          <Hairline />

          <View style={styles.section}>
            <SectionHeader title="NOCH ZU HOLEN" />
            <View style={styles.grid}>
              {locked.map((achievement) => (
                <AchievementBadge key={achievement.id} achievement={achievement} />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <SectionHeader title="IM EINZELNEN" />
            <View>
              {achievements.map((achievement, index) => (
                <View key={achievement.id}>
                  <View style={styles.detailRow}>
                    <View style={styles.detailText}>
                      <Text variant="label" tone={achievement.unlockedAt ? 'accent' : 'muted'} uppercase>
                        {achievement.title}
                      </Text>
                      <Text variant="bodySmall" tone="muted">
                        {achievement.description}
                      </Text>
                    </View>
                    <Text variant="caption" tone="muted">
                      {achievement.unlockedAt
                        ? formatDateTime(achievement.unlockedAt)
                        : `${Math.round(achievement.progress * 100)}%`}
                    </Text>
                  </View>
                  {index < achievements.length - 1 && <Hairline />}
                </View>
              ))}
            </View>
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xxl, paddingTop: spacing.lg },
  section: { gap: spacing.base },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.base },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    paddingVertical: spacing.base,
  },
  detailText: { flex: 1, gap: spacing.xs },
});
