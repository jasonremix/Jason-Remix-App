import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CreditPill } from '@/components/credits/CreditPill';
import { RewardCard, resolveAvailability } from '@/components/rewards/RewardCard';
import { DemoBanner, OfflineBanner } from '@/components/system/Banners';
import { Chip } from '@/components/ui/Chip';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { Hairline, Surface } from '@/components/ui/Surface';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Text } from '@/components/ui/Text';
import { Row } from '@/components/ui/Row';
import { spacing } from '@/constants/theme';
import { useCredits } from '@/hooks/useCredits';
import { useGiveaways } from '@/hooks/useGiveaways';
import { useRedeemReward, useRewards } from '@/hooks/useRewards';
import { formatCredits, formatDateTime } from '@/lib/format';
import type { Reward } from '@/types/models';

/**
 * Rewards.
 *
 * The ladder of what credits are for, plus a way through to giveaways. Redemption
 * always passes through a confirmation that restates the cost in full.
 */
export default function Rewards() {
  const rewards = useRewards();
  const credits = useCredits();
  const giveaways = useGiveaways();
  const redeem = useRedeemReward();

  const [pending, setPending] = useState<Reward | null>(null);

  const balance = credits.data?.balance.balance ?? 0;
  const level = credits.data?.balance.level ?? 1;

  const openGiveaways = useMemo(
    () => (giveaways.data?.giveaways ?? []).filter((giveaway) => giveaway.status === 'OPEN'),
    [giveaways.data],
  );

  const refresh = useCallback(() => {
    void rewards.refetch();
    void credits.refetch();
    void giveaways.refetch();
  }, [credits, giveaways, rewards]);

  const confirmRedeem = useCallback(async () => {
    if (!pending) return;
    try {
      await redeem.mutateAsync(pending.id);
    } finally {
      setPending(null);
    }
  }, [pending, redeem]);

  const availability = pending ? resolveAvailability(pending, balance, level) : null;

  return (
    <Screen
      tabBarInset
      onRefresh={refresh}
      refreshing={rewards.isRefetching || credits.isRefetching}
      contentStyle={styles.content}
    >
      <View style={styles.head}>
        <Text variant="display" tone="primary" style={styles.heading}>
          REWARDS
        </Text>
        <View style={styles.balanceRow}>
          <Text variant="bodySmall" tone="muted">
            Your balance
          </Text>
          <CreditPill amount={balance} size="sm" onPress={() => router.push('/(tabs)/credits')} />
        </View>
      </View>

      <View style={styles.notices}>
        <OfflineBanner />
        <DemoBanner />
      </View>

      {/* --- Giveaways entry point ------------------------------------------- */}
      <Surface style={styles.giveawayCard}>
        <View style={styles.giveawayHead}>
          <Text variant="labelWide" tone="muted" uppercase>
            GIVEAWAYS
          </Text>
          {openGiveaways.length > 0 && <Chip label={`${openGiveaways.length} OPEN`} tone="active" />}
        </View>
        <Text variant="heading" tone="primary">
          {openGiveaways[0]?.title ?? 'No giveaways open right now'}
        </Text>
        <Text variant="bodySmall" tone="tertiary" numberOfLines={2}>
          {openGiveaways[0]?.description ??
            'New giveaways open regularly. Members are notified when one starts.'}
        </Text>
        <Hairline style={styles.divider} />
        <Row title="VIEW ALL GIVEAWAYS" icon="ticket" onPress={() => router.push('/giveaways')} />
      </Surface>

      {/* --- Reward catalogue -------------------------------------------------- */}
      <View style={styles.section}>
        <SectionHeader title="AVAILABLE REWARDS" />

        {rewards.isPending ? (
          <View style={styles.list}>
            <SkeletonCard height={70} />
            <SkeletonCard height={70} />
          </View>
        ) : rewards.isError ? (
          <ErrorState message="Rewards could not be loaded." onRetry={() => void rewards.refetch()} />
        ) : (rewards.data?.rewards ?? []).length === 0 ? (
          <EmptyState icon="gift" title="No rewards yet." message="New rewards are added regularly." />
        ) : (
          <View style={styles.list}>
            {(rewards.data?.rewards ?? []).map((reward) => (
              <RewardCard
                key={reward.id}
                reward={reward}
                balance={balance}
                level={level}
                onPress={() => setPending(reward)}
              />
            ))}
          </View>
        )}
      </View>

      {/* --- My redemptions ---------------------------------------------------- */}
      {(rewards.data?.redemptions ?? []).length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="REWARDS WON" />
          <View>
            {(rewards.data?.redemptions ?? []).map((redemption, index, all) => (
              <View key={redemption.id}>
                <Row
                  title={redemption.rewardTitle}
                  subtitle={`${formatDateTime(redemption.createdAt)} · ${formatCredits(redemption.creditsSpent)} credits`}
                  trailing={<Chip label={redemption.status} tone={redemption.status === 'FULFILLED' ? 'success' : 'muted'} />}
                  showChevron={false}
                />
                {index < all.length - 1 && <Hairline />}
              </View>
            ))}
          </View>
        </View>
      )}

      <ConfirmDialog
        visible={pending !== null}
        eyebrow="REDEEM REWARD"
        title={pending?.title ?? ''}
        message={pending?.description ?? ''}
        detail={
          pending
            ? availability && !availability.levelMet
              ? `This reward unlocks at level ${pending.minLevel}.`
              : availability && !availability.inStock
                ? 'This reward is currently sold out.'
                : `You are spending ${formatCredits(pending.cost)} credits. Your balance afterwards will be ${formatCredits(Math.max(0, balance - pending.cost))}.`
            : undefined
        }
        confirmLabel="CONFIRM"
        loading={redeem.isPending}
        onConfirm={() => void confirmRedeem()}
        onCancel={() => setPending(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xxl },
  head: { gap: spacing.md },
  heading: { letterSpacing: 3 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  notices: { gap: spacing.md },
  section: { gap: spacing.base },
  giveawayCard: { padding: spacing.lg, gap: spacing.md },
  giveawayHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  divider: { marginTop: spacing.xs },
  list: { gap: spacing.md },
});
