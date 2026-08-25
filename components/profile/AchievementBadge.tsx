import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui/Text';
import { alpha, gradients, palette, radius, spacing } from '@/constants/theme';
import type { Achievement } from '@/types/models';

/**
 * A struck metal plaque.
 *
 * Unlocked badges get the brushed-chrome face and a bevel; locked ones stay as an
 * empty machined recess, so a full grid reads as a collection with gaps rather than
 * a grid of greyed-out icons.
 */
export function AchievementBadge({ achievement, size = 84 }: { achievement: Achievement; size?: number }) {
  const unlocked = Boolean(achievement.unlockedAt);

  return (
    <View style={[styles.root, { width: size }]}>
      <View style={[styles.plaque, { width: size, height: size, borderRadius: radius.md }]}>
        {unlocked ? (
          <>
            <LinearGradient
              colors={[...gradients.chrome.colors]}
              locations={[...gradients.chrome.locations]}
              start={gradients.chrome.start}
              end={gradients.chrome.end}
              style={StyleSheet.absoluteFill}
            />
            {/* A single engraved facet, cut into the plate. */}
            <Svg width={size * 0.42} height={size * 0.42} viewBox="0 0 100 100">
              <Path d="M50 6 94 50 50 94 6 50Z" fill="rgba(10,10,12,0.16)" />
              <Path d="M50 22 78 50 50 78 22 50Z" fill="rgba(10,10,12,0.5)" />
              <Path d="M50 22 64 36 50 50 36 36Z" fill="rgba(255,255,255,0.24)" />
            </Svg>
          </>
        ) : (
          <View style={styles.locked}>
            <Svg width={size * 0.34} height={size * 0.34} viewBox="0 0 100 100">
              <Path
                d="M50 6 94 50 50 94 6 50Z"
                fill="none"
                stroke={palette.steel}
                strokeWidth={4}
                strokeLinejoin="round"
              />
            </Svg>
          </View>
        )}
      </View>

      <Text
        variant="labelWide"
        tone={unlocked ? 'secondary' : 'muted'}
        uppercase
        align="center"
        numberOfLines={2}
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
  plaque: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: palette.graphite,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: alpha.edge,
  },
  locked: { alignItems: 'center', justifyContent: 'center', opacity: 0.7 },
});
