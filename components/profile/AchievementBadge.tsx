import { StyleSheet, View } from 'react-native';

import { Monogram } from '@/components/brand/Monogram';
import { Text } from '@/components/ui/Text';
import { palette, radius, spacing } from '@/constants/theme';
import type { Achievement } from '@/types/models';

/**
 * A printed plaque.
 *
 * An unlocked badge is a solid ultramarine tile carrying the facet in paper; a locked
 * one is an empty outlined square. A full grid then reads as a collection with gaps
 * rather than a row of greyed-out icons.
 */
export function AchievementBadge({ achievement, size = 92 }: { achievement: Achievement; size?: number }) {
  const unlocked = Boolean(achievement.unlockedAt);

  return (
    <View style={[styles.root, { width: size }]}>
      <View
        style={[
          styles.plaque,
          { width: size, height: size, borderRadius: radius.md },
          unlocked ? styles.plaqueUnlocked : styles.plaqueLocked,
        ]}
      >
        <Monogram size={size * 0.46} tone={unlocked ? 'inverse' : 'outline'} />
      </View>

      <Text
        variant="labelWide"
        tone={unlocked ? 'primary' : 'muted'}
        uppercase
        align="center"
        numberOfLines={2}
        // Full tracking clipped longer titles at this width; the label still reads as
        // tracked-out next to the plaque without it.
        style={styles.label}
      >
        {achievement.title}
      </Text>

      {!unlocked && achievement.progress > 0 && (
        <Text variant="caption" tone="muted" align="center">
          {Math.round(achievement.progress * 100)}%
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm, alignItems: 'center' },
  label: { letterSpacing: 1.4 },
  plaque: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  plaqueUnlocked: { backgroundColor: palette.accent },
  plaqueLocked: {
    backgroundColor: palette.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.rule,
  },
});
