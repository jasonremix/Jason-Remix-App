import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { CoverArt } from '@/components/music/CoverArt';
import { StreamingLinks } from '@/components/music/StreamingLinks';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { Hairline } from '@/components/ui/Surface';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { useTrack } from '@/hooks/useCatalog';
import { formatDuration, formatReleaseDate } from '@/lib/format';
import { openExternal } from '@/lib/openExternal';

/** Eine einzelne Veröffentlichung: Cover, Angaben und jede Plattform, auf der es sie gibt. */
export default function TrackDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const track = useTrack(id);

  const primaryLink =
    track.data?.links.spotify ?? track.data?.links.youtube ?? track.data?.links.appleMusic;

  return (
    <Screen
      header={<ScreenHeader title="VERÖFFENTLICHUNG" />}
      contentStyle={styles.content}
    >
      {track.isPending ? (
        <View style={styles.skeleton}>
          <Skeleton height={300} rounded="lg" />
          <Skeleton height={22} width="60%" />
          <Skeleton height={12} width="35%" />
        </View>
      ) : track.isError ? (
        <ErrorState
          message="Diese Veröffentlichung konnte nicht geladen werden."
          onRetry={() => void track.refetch()}
        />
      ) : !track.data ? (
        <EmptyState
          icon="disc"
          title="Veröffentlichung nicht gefunden."
          message="Möglicherweise wurde sie entfernt."
        />
      ) : (
        <>
          <CoverArt uri={track.data.coverUrl} title={track.data.title} showTitle={false} rounded="lg" />

          <View style={styles.titleBlock}>
            <Text variant="display" tone="primary">
              {track.data.title}
            </Text>
            <Text variant="labelWide" tone="tertiary" uppercase>
              {track.data.artist}
            </Text>
          </View>

          <View style={styles.tags}>
            <Chip label={formatReleaseDate(track.data.releaseDate)} />
            {track.data.genre && <Chip label={track.data.genre} />}
            {track.data.durationMs && <Chip label={formatDuration(track.data.durationMs)} />}
          </View>

          {primaryLink && (
            <Button
              label="ABSPIELEN"
              variant="primary"
              icon="play"
              fullWidth
              onPress={() => openExternal(primaryLink)}
            />
          )}

          <View style={styles.section}>
            <SectionHeader title="HÖREN AUF" />
            <StreamingLinks links={track.data.links} title={track.data.title} />
          </View>

          <Hairline />

          <View style={styles.section}>
            <SectionHeader title="ANGABEN" />
            <View style={styles.details}>
              <DetailRow label="KÜNSTLER" value={track.data.artist} />
              <DetailRow
                label="VERÖFFENTLICHT"
                value={formatReleaseDate(track.data.releaseDate)}
              />
              {track.data.genre && <DetailRow label="GENRE" value={track.data.genre} />}
              {track.data.durationMs && (
                <DetailRow label="LÄNGE" value={formatDuration(track.data.durationMs)} />
              )}
              {track.data.isrc && <DetailRow label="ISRC" value={track.data.isrc} />}
            </View>
          </View>

          <Text variant="caption" tone="muted" align="center">
            Die Wiedergabe öffnet sich auf der Plattform deiner Wahl. Diese App speichert
            und gibt keine Audiodateien wieder.
          </Text>
        </>
      )}
    </Screen>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text variant="labelWide" tone="muted" uppercase>
        {label}
      </Text>
      <Text variant="bodySmall" tone="secondary">
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingTop: spacing.lg },
  skeleton: { gap: spacing.base },
  titleBlock: { gap: spacing.sm },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  section: { gap: spacing.base },
  details: { gap: spacing.md },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.base },
});
