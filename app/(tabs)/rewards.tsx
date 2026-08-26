import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CreditPill } from '@/components/credits/CreditPill';
import { RewardCard, resolveAvailability } from '@/components/rewards/RewardCard';
import { DemoBanner, OfflineBanner, UnverifiedEmailBanner } from '@/components/system/Banners';
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

/** Der Server liefert den Status englisch; angezeigt wird er deutsch. */
const REDEMPTION_STATUS: Record<string, string> = {
  PENDING: 'IN PRÜFUNG',
  APPROVED: 'BESTÄTIGT',
  FULFILLED: 'EINGELÖST',
  REJECTED: 'ABGELEHNT',
  CANCELLED: 'STORNIERT',
};

/**
 * Prämien.
 *
 * Wofür Credits da sind, plus der Weg zu den Gewinnspielen. Eingelöst wird immer
 * über eine Rückfrage, die die Kosten noch einmal vollständig nennt.
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
        <Text variant="display" tone="primary">
          Prämien
        </Text>
        <View style={styles.balanceRow}>
          <Text variant="bodySmall" tone="muted">
            Dein Guthaben
          </Text>
          <CreditPill amount={balance} size="sm" onPress={() => router.push('/(tabs)/credits')} />
        </View>
      </View>

      <View style={styles.notices}>
        <OfflineBanner />
        <DemoBanner />
        <UnverifiedEmailBanner />
      </View>

      {/* --- Giveaways entry point ------------------------------------------- */}
      <Surface style={styles.giveawayCard}>
        <View style={styles.giveawayHead}>
          <Text variant="labelWide" tone="muted" uppercase>
            GEWINNSPIELE
          </Text>
          {openGiveaways.length > 0 && (
            <Chip label={`${openGiveaways.length} OFFEN`} tone="active" />
          )}
        </View>
        <Text variant="heading" tone="primary">
          {openGiveaways[0]?.title ?? 'Gerade läuft kein Gewinnspiel'}
        </Text>
        <Text variant="bodySmall" tone="tertiary" numberOfLines={2}>
          {openGiveaways[0]?.description ??
            'Neue Gewinnspiele starten regelmäßig. Mitglieder werden benachrichtigt, sobald eines beginnt.'}
        </Text>
        <Hairline style={styles.divider} />
        <Row title="ALLE GEWINNSPIELE" icon="ticket" onPress={() => router.push('/giveaways')} />
      </Surface>

      {/* --- Reward catalogue -------------------------------------------------- */}
      <View style={styles.section}>
        <SectionHeader title="VERFÜGBARE PRÄMIEN" />

        {rewards.isPending ? (
          <View style={styles.list}>
            <SkeletonCard height={70} />
            <SkeletonCard height={70} />
          </View>
        ) : rewards.isError ? (
          <ErrorState
            message="Die Prämien konnten nicht geladen werden."
            onRetry={() => void rewards.refetch()}
          />
        ) : (rewards.data?.rewards ?? []).length === 0 ? (
          <EmptyState
            icon="gift"
            title="Noch keine Prämien."
            message="Neue Prämien kommen regelmäßig dazu."
          />
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
          <SectionHeader title="EINGELÖSTE PRÄMIEN" />
          <View>
            {(rewards.data?.redemptions ?? []).map((redemption, index, all) => (
              <View key={redemption.id}>
                <Row
                  title={redemption.rewardTitle}
                  subtitle={`${formatDateTime(redemption.createdAt)} · ${formatCredits(redemption.creditsSpent)} Credits`}
                  trailing={
                    <Chip
                      label={REDEMPTION_STATUS[redemption.status] ?? redemption.status}
                      tone={redemption.status === 'FULFILLED' ? 'success' : 'muted'}
                    />
                  }
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
        eyebrow="PRÄMIE EINLÖSEN"
        title={pending?.title ?? ''}
        message={pending?.description ?? ''}
        detail={
          pending
            ? availability && !availability.levelMet
              ? `Diese Prämie schaltet sich ab Level ${pending.minLevel} frei.`
              : availability && !availability.inStock
                ? 'Diese Prämie ist gerade vergriffen.'
                : `Du gibst ${formatCredits(pending.cost)} Credits aus. Danach hast du noch ${formatCredits(Math.max(0, balance - pending.cost))}.`
            : undefined
        }
        confirmLabel="EINLÖSEN"
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
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  notices: { gap: spacing.md },
  section: { gap: spacing.base },
  giveawayCard: { padding: spacing.lg, gap: spacing.md },
  giveawayHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  divider: { marginTop: spacing.xs },
  list: { gap: spacing.md },
});
