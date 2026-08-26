import { router } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CreditPill } from '@/components/credits/CreditPill';
import { AchievementBadge } from '@/components/profile/AchievementBadge';
import { LevelBar } from '@/components/profile/LevelBar';
import { DemoBanner, OfflineBanner, UnverifiedEmailBanner } from '@/components/system/Banners';
import { Avatar } from '@/components/ui/Avatar';
import { Chip } from '@/components/ui/Chip';
import { Row } from '@/components/ui/Row';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Hairline, Surface } from '@/components/ui/Surface';
import { ErrorState } from '@/components/ui/States';
import { Text } from '@/components/ui/Text';
import { brand } from '@/constants/brand';
import { config } from '@/constants/config';
import { layout, spacing } from '@/constants/theme';
import { useCredits } from '@/hooks/useCredits';
import { useGiveaways } from '@/hooks/useGiveaways';
import { useMe } from '@/hooks/useMe';
import { useRewards } from '@/hooks/useRewards';
import { formatLevel } from '@/lib/levels';
import { useAuthStore, useIsAdmin } from '@/store/authStore';

/**
 * Profil.
 *
 * Identität, Stand und jede Liste, die ein Mitglied über sich selbst nachschlagen
 * möchte — Erfolge, Aktivität, eingelöste Prämien, Gewinnspiel-Lose.
 */
export default function Profile() {
  const me = useMe();
  const credits = useCredits();
  const rewards = useRewards();
  const giveaways = useGiveaways();
  const isAdmin = useIsAdmin();
  const signOut = useAuthStore((state) => state.signOut);

  const profile = me.data?.profile;
  const balance = credits.data?.balance;
  const spotify = me.data?.spotify;
  const achievements = me.data?.achievements ?? [];
  const unlocked = achievements.filter((achievement) => achievement.unlockedAt).length;

  const refresh = useCallback(() => {
    void me.refetch();
    void credits.refetch();
  }, [credits, me]);

  const onSignOut = useCallback(async () => {
    await signOut();
    router.replace('/(auth)/login');
  }, [signOut]);

  return (
    <Screen
      tabBarInset
      onRefresh={refresh}
      refreshing={me.isRefetching || credits.isRefetching}
      contentStyle={styles.content}
    >
      <View style={styles.notices}>
        <OfflineBanner />
        <DemoBanner />
        <UnverifiedEmailBanner />
      </View>

      {/* --- Identity ---------------------------------------------------------- */}
      {me.isPending ? (
        <View style={styles.identitySkeleton}>
          <Skeleton width={72} height={72} rounded="pill" />
          <View style={styles.identityText}>
            <Skeleton height={16} width="55%" />
            <Skeleton height={10} width="35%" />
          </View>
        </View>
      ) : me.isError ? (
        <ErrorState
          message="Dein Profil konnte nicht geladen werden."
          onRetry={() => void me.refetch()}
        />
      ) : (
        <View style={styles.identity}>
          <Avatar uri={profile?.avatarUrl} name={profile?.username ?? me.data?.user.email} size={72} />
          <View style={styles.identityText}>
            <Text variant="labelWide" tone="muted" uppercase>
              {brand.memberTitle}
            </Text>
            <Text variant="title" tone="primary" numberOfLines={1}>
              {profile?.username ?? 'Mitglied'}
            </Text>
            <View style={styles.identityMeta}>
              <Chip label={formatLevel(balance?.level ?? 1)} tone="active" />
              {isAdmin && <Chip label="ADMIN" tone="warning" />}
            </View>
          </View>
        </View>
      )}

      {/* --- Standing ---------------------------------------------------------- */}
      <Surface style={styles.card}>
        <View style={styles.balanceRow}>
          <Text variant="labelWide" tone="muted" uppercase>
            GUTHABEN
          </Text>
          <CreditPill amount={balance?.balance ?? 0} onPress={() => router.push('/(tabs)/credits')} />
        </View>

        {balance && (
          <>
            <Hairline style={styles.divider} />
            <LevelBar
              level={balance.level}
              title={balance.levelTitle}
              progress={balance.progressToNextLevel}
              lifetimeEarned={balance.lifetimeEarned}
              nextLevelAt={balance.nextLevelAt}
            />
          </>
        )}
      </Surface>

      {/* --- Spotify ----------------------------------------------------------- */}
      <Surface style={styles.card}>
        <View style={styles.balanceRow}>
          <Text variant="labelWide" tone="muted" uppercase>
            SPOTIFY
          </Text>
          <Chip
            label={
              !config.isSpotifyConfigured
                ? 'NICHT EINGERICHTET'
                : spotify?.connected
                  ? 'VERBUNDEN'
                  : 'NICHT VERBUNDEN'
            }
            tone={spotify?.connected ? 'success' : 'muted'}
          />
        </View>

        {spotify?.connected && (
          <Text variant="bodySmall" tone="tertiary">
            {spotify.displayName ?? spotify.spotifyUserId}
          </Text>
        )}

        <Hairline style={styles.divider} />
        <Row
          title={spotify?.connected ? 'VERBINDUNG VERWALTEN' : 'SPOTIFY VERBINDEN'}
          icon="spotify"
          onPress={() => router.push('/settings/spotify')}
        />
      </Surface>

      {/* --- Achievements ------------------------------------------------------- */}
      <View style={styles.section}>
        <SectionHeader
          title="ERFOLGE"
          meta={achievements.length ? `${unlocked} / ${achievements.length}` : undefined}
          actionLabel="ALLE"
          onAction={() => router.push('/achievements')}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.badges}
          style={styles.badgeScroll}
        >
          {achievements.slice(0, 6).map((achievement) => (
            <AchievementBadge key={achievement.id} achievement={achievement} />
          ))}
        </ScrollView>
      </View>

      {/* --- Lists -------------------------------------------------------------- */}
      <View style={styles.section}>
        <SectionHeader title="DEINE ÜBERSICHT" />
        <View>
          <Row
            title="AKTIVITÄT"
            subtitle="Jede Credit-Bewegung auf deinem Konto"
            value={credits.data ? String(credits.data.transactions.length) : undefined}
            icon="clock"
            onPress={() => router.push('/(tabs)/credits')}
          />
          <Hairline />
          <Row
            title="EINGELÖSTE PRÄMIEN"
            subtitle="Einlösungen und ihr Status"
            value={rewards.data ? String(rewards.data.redemptions.length) : undefined}
            icon="gift"
            onPress={() => router.push('/(tabs)/rewards')}
          />
          <Hairline />
          <Row
            title="GEWINNSPIEL-LOSE"
            subtitle="Deine Lose und ihr Ergebnis"
            value={giveaways.data ? String(giveaways.data.entries.length) : undefined}
            icon="ticket"
            onPress={() => router.push('/giveaways')}
          />
        </View>
      </View>

      {/* --- Account ------------------------------------------------------------ */}
      <View style={styles.section}>
        <SectionHeader title="KONTO" />
        <View>
          <Row title="EINSTELLUNGEN" icon="settings" onPress={() => router.push('/settings')} />
          <Hairline />
          <Row
            title="BENACHRICHTIGUNGEN"
            icon="bell"
            onPress={() => router.push('/settings/notifications')}
          />
          <Hairline />
          <Row title="RECHTLICHES" icon="shield" onPress={() => router.push('/legal/privacy')} />
          {isAdmin && (
            <>
              <Hairline />
              <Row title="ADMIN-BEREICH" icon="lock" onPress={() => router.push('/admin')} />
            </>
          )}
          <Hairline />
          <Row title="ABMELDEN" icon="logout" onPress={() => void onSignOut()} showChevron={false} />
        </View>
      </View>

      <Text variant="caption" tone="muted" align="center">
        {brand.name} · v{config.appVersion}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xxl },
  notices: { gap: spacing.md },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  identitySkeleton: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  identityText: { flex: 1, gap: spacing.sm },
  identityMeta: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xxs },
  card: { padding: spacing.lg, gap: spacing.md },
  balanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  divider: { marginVertical: spacing.xs },
  section: { gap: spacing.base },
  badgeScroll: { marginHorizontal: -layout.gutter },
  badges: { paddingHorizontal: layout.gutter, gap: spacing.base },
});
