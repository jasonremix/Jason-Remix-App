import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AdminForm, toNumber } from '@/components/admin/AdminForm';
import { Chip } from '@/components/ui/Chip';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Row } from '@/components/ui/Row';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Hairline } from '@/components/ui/Surface';
import { EmptyState } from '@/components/ui/States';
import { spacing } from '@/constants/theme';
import { useCatalog } from '@/hooks/useCatalog';
import { formatReleaseDate } from '@/lib/format';
import { adminService } from '@/services/admin.service';
import type { Track } from '@/types/models';

/** Releases: create or update a track, and remove one. */
export default function AdminTracks() {
  const catalog = useCatalog();
  const [pendingDelete, setPendingDelete] = useState<Track | null>(null);
  const [deleting, setDeleting] = useState(false);

  const save = useCallback(
    async (values: Record<string, string | boolean>) => {
      const links: Record<string, string> = {};
      for (const [key, field] of [
        ['spotify', 'spotifyUrl'],
        ['youtube', 'youtubeUrl'],
        ['appleMusic', 'appleMusicUrl'],
      ] as const) {
        const value = String(values[field] ?? '').trim();
        if (value) links[key] = value;
      }

      await adminService.upsertTrack({
        id: String(values.id ?? '').trim() || undefined,
        title: String(values.title).trim(),
        artist: String(values.artist ?? 'Jason Remix').trim() || 'Jason Remix',
        releaseDate: String(values.releaseDate).trim(),
        genre: String(values.genre ?? '').trim() || null,
        durationMs: toNumber(values.durationSeconds) ? (toNumber(values.durationSeconds) as number) * 1000 : null,
        coverUrl: String(values.coverUrl ?? '').trim() || null,
        featured: Boolean(values.featured),
        links,
      });
      await catalog.refetch();
    },
    [catalog],
  );

  // Deletion is irreversible, so it goes through the same confirmation every
  // destructive action in the app uses.
  const confirmRemove = useCallback(async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await adminService.deleteTrack(pendingDelete.id);
      await catalog.refetch();
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  }, [catalog, pendingDelete]);

  return (
    <Screen header={<ScreenHeader title="RELEASES" />} contentStyle={styles.content}>
      <AdminForm
        title="ADD OR UPDATE A RELEASE"
        description="Leave the id blank to create a new release; supply it to edit an existing one."
        submitLabel="SAVE RELEASE"
        onSubmit={save}
        fields={[
          { name: 'id', label: 'ID (LEAVE BLANK TO CREATE)', placeholder: 'trk-zeitgeist' },
          { name: 'title', label: 'TITLE', required: true, placeholder: 'Zeitgeist' },
          { name: 'artist', label: 'ARTIST', initialValue: 'Jason Remix' },
          { name: 'releaseDate', label: 'RELEASE DATE', required: true, placeholder: '2026-07-29', hint: 'Format YYYY-MM-DD' },
          { name: 'genre', label: 'GENRE', placeholder: 'Electronic' },
          { name: 'durationSeconds', label: 'LENGTH IN SECONDS', type: 'number', placeholder: '214' },
          { name: 'coverUrl', label: 'COVER URL', placeholder: 'https://…', hint: 'Leave blank to use the generated sleeve.' },
          { name: 'spotifyUrl', label: 'SPOTIFY LINK', placeholder: 'https://open.spotify.com/track/…' },
          { name: 'youtubeUrl', label: 'YOUTUBE LINK', placeholder: 'https://www.youtube.com/watch?v=…' },
          { name: 'appleMusicUrl', label: 'APPLE MUSIC LINK', placeholder: 'https://music.apple.com/…' },
          { name: 'featured', label: 'Feature on Home', type: 'switch', hint: 'Only one release can be featured at a time.' },
        ]}
      />

      <View style={styles.section}>
        <SectionHeader title="CURRENT DISCOGRAPHY" meta={`${catalog.data?.tracks.length ?? 0}`} />
        {(catalog.data?.tracks ?? []).length === 0 ? (
          <EmptyState icon="disc" title="No releases yet." />
        ) : (
          <View>
            {(catalog.data?.tracks ?? []).map((track, index, all) => (
              <View key={track.id}>
                <Row
                  title={track.title}
                  subtitle={`${track.id} · ${formatReleaseDate(track.releaseDate)}`}
                  icon="disc"
                  trailing={track.featured ? <Chip label="FEATURED" tone="active" /> : undefined}
                  onPress={() => setPendingDelete(track)}
                  showChevron={false}
                />
                {index < all.length - 1 && <Hairline />}
              </View>
            ))}
          </View>
        )}
      </View>

      <ConfirmDialog
        visible={pendingDelete !== null}
        eyebrow="DELETE RELEASE"
        title={pendingDelete?.title ?? ''}
        message="The release will be removed from the app for everyone. This cannot be undone."
        detail={pendingDelete ? `ID ${pendingDelete.id}` : undefined}
        confirmLabel="DELETE"
        destructive
        loading={deleting}
        onConfirm={() => void confirmRemove()}
        onCancel={() => setPendingDelete(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xxl, paddingTop: spacing.lg },
  section: { gap: spacing.base },
});
