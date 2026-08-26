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

/** Veröffentlichungen: einen Titel anlegen, ändern oder entfernen. */
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

  // Löschen ist unumkehrbar und läuft deshalb über dieselbe Rückfrage wie jede andere
  // zerstörerische Aktion in dieser App.
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
    <Screen header={<ScreenHeader title="VERÖFFENTLICHUNGEN" />} contentStyle={styles.content}>
      <AdminForm
        title="VERÖFFENTLICHUNG ANLEGEN ODER ÄNDERN"
        description="ID leer lassen, um neu anzulegen; ID angeben, um eine bestehende zu bearbeiten."
        submitLabel="VERÖFFENTLICHUNG SPEICHERN"
        onSubmit={save}
        fields={[
          { name: 'id', label: 'ID (LEER = NEU ANLEGEN)', placeholder: 'trk-zeitgeist' },
          { name: 'title', label: 'TITEL', required: true, placeholder: 'Zeitgeist' },
          { name: 'artist', label: 'KÜNSTLER', initialValue: 'Jason Remix' },
          {
            name: 'releaseDate',
            label: 'VERÖFFENTLICHUNGSDATUM',
            required: true,
            placeholder: '2026-07-29',
            hint: 'Format JJJJ-MM-TT',
          },
          { name: 'genre', label: 'GENRE', placeholder: 'Electronic' },
          { name: 'durationSeconds', label: 'LÄNGE IN SEKUNDEN', type: 'number', placeholder: '214' },
          {
            name: 'coverUrl',
            label: 'COVER-URL',
            placeholder: 'https://…',
            hint: 'Leer lassen, um das erzeugte Cover zu verwenden.',
          },
          { name: 'spotifyUrl', label: 'SPOTIFY-LINK', placeholder: 'https://open.spotify.com/track/…' },
          { name: 'youtubeUrl', label: 'YOUTUBE-LINK', placeholder: 'https://www.youtube.com/watch?v=…' },
          { name: 'appleMusicUrl', label: 'APPLE-MUSIC-LINK', placeholder: 'https://music.apple.com/…' },
          {
            name: 'featured',
            label: 'Auf der Startseite hervorheben',
            type: 'switch',
            hint: 'Es kann immer nur eine Veröffentlichung hervorgehoben sein.',
          },
        ]}
      />

      <View style={styles.section}>
        <SectionHeader title="AKTUELLE DISKOGRAFIE" meta={`${catalog.data?.tracks.length ?? 0}`} />
        {(catalog.data?.tracks ?? []).length === 0 ? (
          <EmptyState icon="disc" title="Noch keine Veröffentlichungen." />
        ) : (
          <View>
            {(catalog.data?.tracks ?? []).map((track, index, all) => (
              <View key={track.id}>
                <Row
                  title={track.title}
                  subtitle={`${track.id} · ${formatReleaseDate(track.releaseDate)}`}
                  icon="disc"
                  trailing={track.featured ? <Chip label="HERVORGEHOBEN" tone="active" /> : undefined}
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
        eyebrow="VERÖFFENTLICHUNG LÖSCHEN"
        title={pendingDelete?.title ?? ''}
        message="Die Veröffentlichung verschwindet für alle aus der App. Das lässt sich nicht rückgängig machen."
        detail={pendingDelete ? `ID ${pendingDelete.id}` : undefined}
        confirmLabel="LÖSCHEN"
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
