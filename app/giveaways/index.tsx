import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { GiveawayCard } from '@/components/giveaways/GiveawayCard';
import { DemoBanner, OfflineBanner } from '@/components/system/Banners';
import { Chip } from '@/components/ui/Chip';
import { Row } from '@/components/ui/Row';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { Hairline } from '@/components/ui/Surface';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { useGiveaways } from '@/hooks/useGiveaways';
import { formatDateTime } from '@/lib/format';

/** Der Server liefert den Status englisch; angezeigt wird er deutsch. */
const ENTRY_STATUS: Record<string, string> = {
  ENTERED: 'TEILGENOMMEN',
  WON: 'GEWONNEN',
  LOST: 'NICHT GEZOGEN',
  DISQUALIFIED: 'AUSGESCHLOSSEN',
};

/** Alle Gewinnspiele, offene zuerst, darunter die eigenen Lose. */
export default function GiveawaysIndex() {
  const giveaways = useGiveaways();

  const { open, past } = useMemo(() => {
    const all = giveaways.data?.giveaways ?? [];
    return {
      open: all.filter((giveaway) => giveaway.status === 'OPEN'),
      past: all.filter((giveaway) => giveaway.status !== 'OPEN'),
    };
  }, [giveaways.data]);

  const entries = giveaways.data?.entries ?? [];

  return (
    <Screen
      header={<ScreenHeader title="GEWINNSPIELE" />}
      onRefresh={() => void giveaways.refetch()}
      refreshing={giveaways.isRefetching}
      contentStyle={styles.content}
    >
      <View style={styles.notices}>
        <OfflineBanner />
        <DemoBanner />
      </View>

      {giveaways.isPending ? (
        <View style={styles.list}>
          <SkeletonCard height={140} />
          <SkeletonCard height={140} />
        </View>
      ) : giveaways.isError ? (
        <ErrorState
          message="Die Gewinnspiele konnten nicht geladen werden."
          onRetry={() => void giveaways.refetch()}
        />
      ) : (
        <>
          <View style={styles.section}>
            <SectionHeader title="JETZT OFFEN" meta={open.length ? `${open.length}` : undefined} />
            {open.length === 0 ? (
              <EmptyState
                icon="ticket"
                title="Gerade kein Gewinnspiel offen."
                message="Mitglieder werden benachrichtigt, sobald ein neues startet."
              />
            ) : (
              <View style={styles.list}>
                {open.map((giveaway) => (
                  <GiveawayCard
                    key={giveaway.id}
                    giveaway={giveaway}
                    onPress={() => router.push(`/giveaways/${giveaway.id}`)}
                  />
                ))}
              </View>
            )}
          </View>

          {entries.length > 0 && (
            <View style={styles.section}>
              <SectionHeader title="DEINE LOSE" meta={`${entries.length}`} />
              <View>
                {entries.map((entry, index) => (
                  <View key={entry.id}>
                    <Row
                      title={entry.giveawayTitle}
                      subtitle={formatDateTime(entry.createdAt)}
                      trailing={
                        <Chip
                          label={ENTRY_STATUS[entry.status] ?? entry.status}
                          tone={
                            entry.status === 'WON'
                              ? 'success'
                              : entry.status === 'LOST'
                                ? 'muted'
                                : 'neutral'
                          }
                        />
                      }
                      onPress={() => router.push(`/giveaways/${entry.giveawayId}`)}
                    />
                    {index < entries.length - 1 && <Hairline />}
                  </View>
                ))}
              </View>
            </View>
          )}

          {past.length > 0 && (
            <View style={styles.section}>
              <SectionHeader title="BEENDET" />
              <View style={styles.list}>
                {past.map((giveaway) => (
                  <GiveawayCard
                    key={giveaway.id}
                    giveaway={giveaway}
                    onPress={() => router.push(`/giveaways/${giveaway.id}`)}
                  />
                ))}
              </View>
            </View>
          )}
        </>
      )}

      <Text variant="caption" tone="muted" align="center">
        Die Ziehung findet auf dem Server statt und wird nachvollziehbar protokolliert.
        Für jedes Gewinnspiel gelten die Teilnahmebedingungen.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xxl, paddingTop: spacing.lg },
  notices: { gap: spacing.md },
  section: { gap: spacing.base },
  list: { gap: spacing.base },
});
