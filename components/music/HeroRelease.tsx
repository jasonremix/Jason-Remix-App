import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

import { CoverArt } from '@/components/music/CoverArt';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Text } from '@/components/ui/Text';
import { gradients, spacing } from '@/constants/theme';
import { formatReleaseDate } from '@/lib/format';
import { openExternal } from '@/lib/openExternal';
import type { Track } from '@/types/models';

/**
 * The current release, presented full-bleed.
 *
 * This is the one place in the app given over to a single image. Everything else on
 * Home sits below it as quiet rows, which is what makes it land.
 */
export function HeroRelease({ track, onOpen }: { track: Track; onOpen: () => void }) {
  const primaryLink = track.links.spotify ?? track.links.youtube ?? track.links.appleMusic;

  return (
    <View style={styles.root}>
      <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Open ${track.title}`}>
        <View style={styles.artwork}>
          <CoverArt uri={track.coverUrl} title={track.title} showTitle={false} rounded="lg" />
          <LinearGradient
            colors={[...gradients.heroScrim.colors]}
            locations={[...gradients.heroScrim.locations]}
            start={gradients.heroScrim.start}
            end={gradients.heroScrim.end}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          <View style={styles.caption} pointerEvents="none">
            <Chip label={track.featured ? 'CURRENT RELEASE' : 'RELEASE'} tone="active" />
            <Text variant="display" tone="primary" numberOfLines={2} style={styles.title}>
              {track.title.toLocaleUpperCase('en-US')}
            </Text>
            <Text variant="labelWide" tone="tertiary" uppercase>
              {track.artist}
            </Text>
          </View>
        </View>
      </Pressable>

      <Text variant="caption" tone="muted" style={styles.meta}>
        {formatReleaseDate(track.releaseDate)}
        {track.genre ? ` · ${track.genre}` : ''}
      </Text>

      <View style={styles.actions}>
        {primaryLink && (
          <Button label="PLAY" variant="primary" icon="play" onPress={() => openExternal(primaryLink)} style={styles.action} />
        )}
        {track.links.spotify && (
          <Button
            label="OPEN ON SPOTIFY"
            variant="secondary"
            icon="spotify"
            onPress={() => openExternal(track.links.spotify as string)}
            style={styles.action}
          />
        )}
        {track.links.youtube && (
          <Button
            label="OPEN ON YOUTUBE"
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
  artwork: { position: 'relative' },
  caption: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    bottom: spacing.xl,
    gap: spacing.sm,
  },
  title: { letterSpacing: 2 },
  meta: { marginTop: -spacing.xs },
  actions: { gap: spacing.md },
  action: { alignSelf: 'stretch' },
});
