import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CreditCounter } from '@/components/credits/CreditCounter';
import { TransactionRow } from '@/components/credits/TransactionRow';
import { MissionRow } from '@/components/missions/MissionRow';
import { LevelBar } from '@/components/profile/LevelBar';
import { DemoBanner, OfflineBanner } from '@/components/system/Banners';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Hairline, Surface } from '@/components/ui/Surface';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Text } from '@/components/ui/Text';
import { brand } from '@/constants/brand';
import { config } from '@/constants/config';
import { spacing } from '@/constants/theme';
import { useCredits } from '@/hooks/useCredits';
import { useClaimMission, useMissions } from '@/hooks/useMissions';
import { formatCredits } from '@/lib/format';

/**
 * Credits.
 *
 * The balance, how to earn more, and the full ledger. Every figure here comes from the
 * server: the app displays the ledger, it never computes it.
 */
export default function Credits() {
  const credits = useCredits();
  const missions = useMissions();
  const claim = useClaimMission();
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const balance = credits.data?.balance;
  const transactions = credits.data?.transactions ?? [];

  const refresh = useCallback(() => {
    void credits.refetch();
    void missions.refetch();
  }, [credits, missions]);

  const onClaim = useCallback(
    async (missionId: string) => {
      setClaimingId(missionId);
      try {
        await claim.mutateAsync(missionId);
      } catch {
        // The mutation surfaces its own message; nothing more to do here.
      } finally {
        setClaimingId(null);
      }
    },
    [claim],
  );

  return (
    <Screen
      tabBarInset
      onRefresh={refresh}
      refreshing={credits.isRefetching || missions.isRefetching}
      contentStyle={styles.content}
    >
      <View style={styles.head}>
        <Text variant="display" tone="primary" style={styles.heading}>
          CREDITS
        </Text>
        <Text variant="bodySmall" tone="muted">
          {brand.creditsName} — earned through missions, spent on rewards and giveaways.
        </Text>
      </View>

      <View style={styles.notices}>
        <OfflineBanner />
        <DemoBanner />
      </View>

      {/* --- Balance and level ------------------------------------------------ */}
      <Surface style={styles.balanceCard}>
        {credits.isPending ? (
          <View style={styles.balanceSkeleton}>
            <Skeleton height={46} width="55%" />
            <Skeleton height={3} />
            <Skeleton height={10} width="40%" />
          </View>
        ) : credits.isError ? (
          <ErrorState message="Your balance could not be loaded." onRetry={() => void credits.refetch()} />
        ) : balance ? (
          <>
            <CreditCounter amount={balance.balance} />

            <View style={styles.lifetime}>
              <View style={styles.lifetimeItem}>
                <Text variant="labelWide" tone="muted" uppercase>
                  EARNED
                </Text>
                <Text variant="body" tone="secondary" style={styles.tabular}>
                  {formatCredits(balance.lifetimeEarned)}
                </Text>
              </View>
              <View style={styles.lifetimeItem}>
                <Text variant="labelWide" tone="muted" uppercase>
                  SPENT
                </Text>
                <Text variant="body" tone="secondary" style={styles.tabular}>
                  {formatCredits(balance.lifetimeSpent)}
                </Text>
              </View>
            </View>

            <Hairline style={styles.divider} />

            <LevelBar
              level={balance.level}
              title={balance.levelTitle}
              progress={balance.progressToNextLevel}
              lifetimeEarned={balance.lifetimeEarned}
              nextLevelAt={balance.nextLevelAt}
            />
          </>
        ) : null}
      </Surface>

      {/* --- Missions ---------------------------------------------------------- */}
      <View style={styles.section}>
        <SectionHeader title="EARN CREDITS" meta="MISSIONS" />

        {missions.isPending ? (
          <View style={styles.list}>
            <Skeleton height={64} rounded="md" />
            <Skeleton height={64} rounded="md" />
          </View>
        ) : missions.isError ? (
          <ErrorState message="Missions could not be loaded." onRetry={() => void missions.refetch()} />
        ) : (missions.data?.missions ?? []).length === 0 ? (
          <EmptyState icon="token" title="No missions right now." message="New missions appear with each release." />
        ) : (
          <View>
            {(missions.data?.missions ?? []).map((mission, index, all) => {
              // The Spotify mission cannot be claimed until Spotify is actually linked,
              // and that is the server's judgement — the row only explains why.
              const spotifyBlocked =
                mission.type === 'CONNECT_SPOTIFY' && !config.isSpotifyConfigured;

              return (
                <View key={mission.id}>
                  <MissionRow
                    mission={mission}
                    claiming={claimingId === mission.id}
                    disabled={spotifyBlocked}
                    disabledReason={
                      spotifyBlocked
                        ? 'Available once Spotify is configured for this build.'
                        : undefined
                    }
                    onClaim={() => void onClaim(mission.id)}
                  />
                  {index < all.length - 1 && <Hairline />}
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* --- Ledger ------------------------------------------------------------ */}
      <View style={styles.section}>
        <SectionHeader
          title="ACTIVITY"
          actionLabel={transactions.length > 0 ? 'PROFILE' : undefined}
          onAction={() => router.push('/(tabs)/profile')}
        />

        {credits.isPending ? (
          <View style={styles.list}>
            <Skeleton height={44} />
            <Skeleton height={44} />
            <Skeleton height={44} />
          </View>
        ) : transactions.length === 0 ? (
          <EmptyState
            icon="clock"
            title="No activity yet."
            message="Complete your first mission to start your ledger."
          />
        ) : (
          <View>
            {transactions.map((transaction, index) => (
              <View key={transaction.id}>
                <TransactionRow transaction={transaction} />
                {index < transactions.length - 1 && <Hairline />}
              </View>
            ))}
          </View>
        )}
      </View>

      <Text variant="caption" tone="muted" align="center" style={styles.footnote}>
        Credits have no cash value and cannot be bought, sold or transferred.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xxl },
  head: { gap: spacing.sm },
  heading: { letterSpacing: 3 },
  notices: { gap: spacing.md },
  balanceCard: { padding: spacing.lg, gap: spacing.lg },
  balanceSkeleton: { gap: spacing.base },
  lifetime: { flexDirection: 'row', gap: spacing.xxl },
  lifetimeItem: { gap: spacing.xs },
  tabular: { fontVariant: ['tabular-nums'] },
  divider: { marginVertical: spacing.xs },
  section: { gap: spacing.base },
  list: { gap: spacing.md },
  footnote: { marginTop: spacing.base },
});
