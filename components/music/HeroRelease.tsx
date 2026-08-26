import { Pressable, StyleSheet, View } from 'react-native';

import { CoverArt } from '@/components/music/CoverArt';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/constants/theme';
import { formatReleaseDate } from '@/lib/format';
import { openExternal } from '@/lib/openExternal';
import type { Track } from '@/types/models';

/**
 * Die aktuelle Veröffentlichung, als Plakat.
 *
 * Das Cover trägt die Farbe, der Titel steht darunter auf Papier statt auf einem Scrim
 * über dem Bild — so bleibt die Fläche ungestört und die Typografie scharf.
 */
export function HeroRelease({ track, onOpen }: { track: Track; onOpen: () => void }) {
  const primaryLink = track.links.spotify ?? track.links.youtube ?? track.links.appleMusic;

  return (
    <View style={styles.root}>
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`${track.title} öffnen`}
      >
        <CoverArt uri={track.coverUrl} title={track.title} showTitle={false} rounded="md" />
      </Pressable>

      <View style={styles.caption}>
        <Chip
          label={track.featured ? 'NEUESTE VERÖFFENTLICHUNG' : 'VERÖFFENTLICHUNG'}
          tone="active"
        />
        <Text variant="display" tone="primary" numberOfLines={2}>
          {track.title}
        </Text>
        <Text variant="labelWide" tone="tertiary" uppercase>
          {track.artist}
        </Text>
      </View>

      <Text variant="caption" tone="muted" style={styles.meta}>
        {formatReleaseDate(track.releaseDate)}
        {track.genre ? ` · ${track.genre}` : ''}
      </Text>

      <View style={styles.actions}>
        {primaryLink && (
          <Button label="ABSPIELEN" variant="primary" icon="play" onPress={() => openExternal(primaryLink)} style={styles.action} />
        )}
        {track.links.spotify && (
          <Button
            label="BEI SPOTIFY ÖFFNEN"
            variant="secondary"
            icon="spotify"
            onPress={() => openExternal(track.links.spotify as string)}
            style={styles.action}
          />
        )}
        {track.links.youtube && (
          <Button
            label="BEI YOUTUBE ÖFFNEN"
            variant="secondary"
            icon="youtube"
            onPress={() => openExternal(track.links.youtube as string)}
            style={styles.action}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.base },
  caption: { gap: spacing.sm, marginTop: spacing.xs },
  meta: { marginTop: -spacing.sm },
  actions: { gap: spacing.md },
  action: { alignSelf: 'stretch' },
});
