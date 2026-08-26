import { Pressable, StyleSheet, View } from 'react-native';

import { CoverArt } from '@/components/music/CoverArt';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { alpha, palette, spacing } from '@/constants/theme';
import { formatDuration, formatReleaseDate } from '@/lib/format';
import type { Track } from '@/types/models';

/** A discography row: sleeve, title, artist, and the release date with genre. */
export function TrackCard({ track, onPress }: { track: Track; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${track.title} by ${track.artist}`}
      style={({ pressed }) => [styles.root, pressed && styles.pressed]}
    >
      <CoverArt uri={track.coverUrl} title={track.title} size={64} showTitle={false} />

      <View style={styles.text}>
        <Text variant="heading" tone="primary" numberOfLines={1}>
          {track.title}
        </Text>
        <Text variant="caption" tone="tertiary" numberOfLines={1}>
          {track.artist}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {formatReleaseDate(track.releaseDate)}
          {track.genre ? ` · ${track.genre}` : ''}
          {track.durationMs ? ` · ${formatDuration(track.durationMs)}` : ''}
        </Text>
      </View>

      <Icon name="chevron-right" size={14} color={palette.titanium} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    paddingVertical: spacing.md,
  },
  pressed: { backgroundColor: alpha.press },
  text: { flex: 1, gap: 3 },
});
