import { router } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { CreditCounter } from '@/components/credits/CreditCounter';
import { HeroRelease } from '@/components/music/HeroRelease';
import { Wordmark } from '@/components/brand/Wordmark';
import { DemoBanner, OfflineBanner } from '@/components/system/Banners';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { Hairline, Surface } from '@/components/ui/Surface';
import { ErrorState } from '@/components/ui/States';
import { Text } from '@/components/ui/Text';
import { brand } from '@/constants/brand';
import { spacing } from '@/constants/theme';
import { useCatalog } from '@/hooks/useCatalog';
import { useCredits } from '@/hooks/useCredits';
import { formatRelative } from '@/lib/format';
import type { NewsItem } from '@/types/models';

const NEWS_LABELS: Record<NewsItem['category'], string> = {
  RELEASE: 'NEUE VERÖFFENTLICHUNG',
  TOUR: 'TOUR',
  REWARD: 'NEUE PRÄMIE',
  ANNOUNCEMENT: 'ANKÜNDIGUNG',
};

/**
 * Start.
 *
 * Eine Veröffentlichung, ein Guthaben, drei Meldungen. Die Zurückhaltung ist der Punkt:
 * alles Weitere ist von der Leiste unten aus einen Fingertipp entfernt.
 */
export default function Home() {
  const catalog = useCatalog();
  const credits = useCredits();

  const refresh = useCallback(() => {
    void catalog.refetch();
    void credits.refetch();
  }, [catalog, credits]);

  const refreshing = catalog.isRefetching || credits.isRefetching;

  return (
    <Screen
      tabBarInset
      onRefresh={refresh}
      refreshing={refreshing}
      contentStyle={styles.content}
    >
      <Wordmark size="md" tagline />

      <View style={styles.notices}>
        <OfflineBanner />
        <DemoBanner />
      </View>

      {/* --- Current release ------------------------------------------------ */}
      {catalog.isPending ? (
        <View style={styles.heroSkeleton}>
          <Skeleton height={320} rounded="lg" />
          <Skeleton height={12} width="45%" />
          <Skeleton height={48} rounded="md" />
        </View>
      ) : catalog.isError ? (
        <ErrorState
          message="Die Veröffentlichung konnte nicht geladen werden."
          onRetry={() => void catalog.refetch()}
        />
      ) : catalog.featuredTrack ? (
        <HeroRelease
          track={catalog.featuredTrack}
          onOpen={() => router.push(`/track/${catalog.featuredTrack?.id}`)}
        />
      ) : null}

      {/* --- Balance -------------------------------------------------------- */}
      <View style={styles.section}>
        <SectionHeader title="DEIN GUTHABEN" />
        <Surface style={styles.creditCard}>
          {credits.isPending ? (
            <Skeleton height={46} width="60%" />
          ) : credits.isError ? (
            <Text variant="body" tone="tertiary">
              Guthaben gerade nicht verfügbar.
            </Text>
          ) : (
            <>
              <CreditCounter amount={credits.data?.balance.balance ?? 0} />
              <View style={styles.creditMeta}>
                <Chip
                  label={`LEVEL ${(credits.data?.balance.level ?? 1).toString().padStart(2, '0')}`}
                  tone="active"
                />
                <Text variant="caption" tone="muted">
                  {credits.data?.balance.levelTitle}
                </Text>
              </View>
            </>
          )}

          <Hairline style={styles.divider} />
          <Button
            label="GUTHABEN ANSEHEN"
            variant="ghost"
            size="sm"
            icon="chevron-right"
            iconTrailing
            onPress={() => router.push('/(tabs)/credits')}
          />
        </Surface>
      </View>

      {/* --- News ----------------------------------------------------------- */}
      <View style={styles.section}>
        <SectionHeader title="AKTUELLES" />

        {catalog.isPending ? (
          <SkeletonCard lines={2} height={14} />
        ) : (
          <View style={styles.news}>
            {(catalog.data?.news ?? []).slice(0, 3).map((item, index, all) => (
              <View key={item.id}>
                <View style={styles.newsItem}>
                  <View style={styles.newsHead}>
                    <Text variant="labelWide" tone="muted" uppercase>
                      {NEWS_LABELS[item.category]}
                    </Text>
                    <Text variant="labelWide" tone="muted" uppercase>
                      {formatRelative(item.publishedAt)}
                    </Text>
                  </View>
                  <Text variant="title" tone="primary">
                    {item.title}
                  </Text>
                  <Text variant="bodySmall" tone="tertiary">
                    {item.body}
                  </Text>
                </View>
                {index < all.length - 1 && <Hairline />}
              </View>
            ))}
          </View>
        )}
      </View>

      <Text variant="caption" tone="muted" align="center" style={styles.footprint}>
        {brand.artist} · {brand.origin}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xxl },
  notices: { gap: spacing.md },
  heroSkeleton: { gap: spacing.base },
  section: { gap: 0 },
  creditCard: { padding: spacing.lg, gap: spacing.base },
  creditMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  divider: { marginTop: spacing.xs },
  news: { gap: spacing.lg },
  newsItem: { gap: spacing.sm, paddingBottom: spacing.lg },
  newsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footprint: { marginTop: spacing.xl },
});
