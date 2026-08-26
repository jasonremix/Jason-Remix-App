import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CoverArt } from '@/components/music/CoverArt';
import { TrackCard } from '@/components/music/TrackCard';
import { DemoBanner, OfflineBanner, SpotifyUnavailableNotice } from '@/components/system/Banners';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Hairline, Surface } from '@/components/ui/Surface';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Text } from '@/components/ui/Text';
import { config } from '@/constants/config';
import { palette, spacing } from '@/constants/theme';
import { useCatalog } from '@/hooks/useCatalog';
import {
  useConnectSpotify,
  useNowPlaying,
  useRecentlyPlayed,
  useSpotifyConnection,
} from '@/hooks/useSpotify';
import { formatDuration, formatRelative } from '@/lib/format';
import { useSpotifyStore } from '@/store/spotifyStore';

/**
 * Musik.
 *
 * Die Diskografie und — wenn Spotify verbunden ist — was gerade läuft. Nichts hiervon
 * streamt oder speichert Audio: jedes Abspielen öffnet die Plattform, die den Titel
 * lizenziert.
 */
export default function Music() {
  const catalog = useCatalog();
  const [screenFocused, setScreenFocused] = useState(false);

  useSpotifyConnection();
  const connection = useSpotifyStore((state) => state.connection);
  const connecting = useSpotifyStore((state) => state.connecting);
  const connectSpotify = useConnectSpotify();

  const nowPlaying = useNowPlaying(screenFocused);
  const recentlyPlayed = useRecentlyPlayed(screenFocused);

  // Polling only runs while this screen is actually on screen.
  useFocusEffect(
    useCallback(() => {
      setScreenFocused(true);
      return () => setScreenFocused(false);
    }, []),
  );

  const tracks = useMemo(() => catalog.data?.tracks ?? [], [catalog.data]);
  const connected = Boolean(connection?.connected);

  return (
    <Screen
      tabBarInset
      onRefresh={() => void catalog.refetch()}
      refreshing={catalog.isRefetching}
      contentStyle={styles.content}
    >
      <View style={styles.head}>
        <Text variant="display" tone="primary">
          Musik
        </Text>
        <Text variant="body" tone="tertiary">
          Jede Veröffentlichung von Jason Remix, mit Links zu der Plattform, auf der du hörst.
        </Text>
      </View>

      <View style={styles.notices}>
        <OfflineBanner />
        <DemoBanner />
      </View>

      {/* --- Spotify ---------------------------------------------------------- */}
      {!config.isSpotifyConfigured ? (
        <SpotifyUnavailableNotice />
      ) : !connected ? (
        <Surface style={styles.connectCard}>
          <Text variant="labelWide" tone="muted" uppercase>
            SPOTIFY
          </Text>
          <Text variant="title" tone="primary">
            Spotify verbinden
          </Text>
          <Text variant="bodySmall" tone="tertiary">
            Sieh in der App, was du gerade hörst, und verdiene Credits fürs Verbinden.
            Du kannst die Verbindung jederzeit wieder trennen.
          </Text>
          <Button
            label="SPOTIFY VERBINDEN"
            variant="secondary"
            icon="spotify"
            loading={connecting}
            onPress={() => void connectSpotify()}
          />
        </Surface>
      ) : (
        <View style={styles.section}>
          <SectionHeader
            title="MIT SPOTIFY VERBUNDEN"
            meta={connection?.displayName ?? undefined}
          />

          <Surface style={styles.nowPlaying}>
            {nowPlaying.isPending ? (
              <View style={styles.nowPlayingRow}>
                <Skeleton width={64} height={64} rounded="md" />
                <View style={styles.nowPlayingText}>
                  <Skeleton height={14} width="70%" />
                  <Skeleton height={10} width="45%" />
                </View>
              </View>
            ) : nowPlaying.data ? (
              <>
                <View style={styles.nowPlayingRow}>
                  <CoverArt
                    uri={nowPlaying.data.coverUrl}
                    title={nowPlaying.data.title}
                    size={64}
                    showTitle={false}
                  />
                  <View style={styles.nowPlayingText}>
                    <Text variant="labelWide" tone="muted" uppercase>
                      {nowPlaying.data.isPlaying ? 'LÄUFT GERADE' : 'PAUSIERT'}
                    </Text>
                    <Text variant="title" tone="primary" numberOfLines={1}>
                      {nowPlaying.data.title}
                    </Text>
                    <Text variant="caption" tone="tertiary" numberOfLines={1}>
                      {nowPlaying.data.artist}
                    </Text>
                  </View>
                  {nowPlaying.data.isJasonRemix && <Chip label="JR" tone="active" />}
                </View>

                <View style={styles.progress}>
                  <ProgressBar
                    progress={
                      nowPlaying.data.durationMs > 0
                        ? nowPlaying.data.progressMs / nowPlaying.data.durationMs
                        : 0
                    }
                    animated={false}
                    accessibilityLabel="Wiedergabeposition"
                  />
                  <View style={styles.timings}>
                    <Text variant="caption" tone="muted">
                      {formatDuration(nowPlaying.data.progressMs)}
                    </Text>
                    <Text variant="caption" tone="muted">
                      {formatDuration(nowPlaying.data.durationMs)}
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <Text variant="bodySmall" tone="tertiary">
                Auf Spotify läuft gerade nichts.
              </Text>
            )}
          </Surface>

          {(recentlyPlayed.data?.length ?? 0) > 0 && (
            <View style={styles.recent}>
              <SectionHeader title="ZULETZT GEHÖRT" />
              {(recentlyPlayed.data ?? []).slice(0, 5).map((item) => (
                <View key={`${item.trackId}-${item.playedAt}`}>
                  <View style={styles.recentRow}>
                    <CoverArt uri={item.coverUrl} title={item.title} size={38} showTitle={false} rounded="sm" />
                    <View style={styles.recentText}>
                      <Text variant="bodySmall" tone="secondary" numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text variant="caption" tone="muted" numberOfLines={1}>
                        {item.artist}
                      </Text>
                    </View>
                    <Text variant="caption" tone="muted">
                      {formatRelative(item.playedAt)}
                    </Text>
                  </View>
                  <Hairline />
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* --- Discography ------------------------------------------------------ */}
      <View style={styles.section}>
        <SectionHeader
          title="DISKOGRAFIE"
          meta={tracks.length ? `${tracks.length} TITEL` : undefined}
        />

        {catalog.isPending ? (
          <View style={styles.list}>
            {Array.from({ length: 4 }, (_, index) => (
              <View key={index} style={styles.skeletonRow}>
                <Skeleton width={64} height={64} rounded="md" />
                <View style={styles.skeletonText}>
                  <Skeleton height={14} width="65%" />
                  <Skeleton height={10} width="40%" />
                </View>
              </View>
            ))}
          </View>
        ) : catalog.isError ? (
          <ErrorState message="Die Diskografie konnte nicht geladen werden." onRetry={() => void catalog.refetch()} />
        ) : tracks.length === 0 ? (
          <EmptyState icon="disc" title="Noch keine Veröffentlichungen." message="Neue Musik erscheint zuerst hier." />
        ) : (
          <View>
            {tracks.map((track, index) => (
              <View key={track.id}>
                <TrackCard track={track} onPress={() => router.push(`/track/${track.id}`)} />
                {index < tracks.length - 1 && <Hairline />}
              </View>
            ))}
          </View>
        )}
      </View>

      <Text variant="caption" tone="muted" align="center" style={styles.disclaimer}>
        Die Wiedergabe findet auf der von dir gewählten Streaming-Plattform statt. Diese
        App speichert, lädt und vervielfältigt keine Audioinhalte.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xxl },
  head: { gap: spacing.sm },
  notices: { gap: spacing.md },
  section: { gap: spacing.base },
  connectCard: { padding: spacing.lg, gap: spacing.md },
  nowPlaying: { padding: spacing.lg, gap: spacing.lg },
  nowPlayingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.base },
  nowPlayingText: { flex: 1, gap: 3 },
  progress: { gap: spacing.sm },
  timings: { flexDirection: 'row', justifyContent: 'space-between' },
  recent: { gap: spacing.xs, marginTop: spacing.md },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  recentText: { flex: 1, gap: 2 },
  list: { gap: spacing.lg },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.base },
  skeletonText: { flex: 1, gap: spacing.sm },
  disclaimer: { marginTop: spacing.base, color: palette.faint },
});
