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
export function AchievementBadge({ achievement, size = 92 }: { achievement: Achievement; size?: number }) {
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
            {/*
              The facet is struck into the plate: a dark core with a bright lip above it.
              Wrapped in a positioned view rather than sitting in flow — react-native-web
              renders Svg as a static `<svg>`, which CSS paints *below* the absolutely
              positioned gradient above, leaving the plaque blank. A View is
              position:relative by default, so this puts the engraving back on top, and
              it composites identically on native.
            */}
            <View style={styles.engraving}>
              <Svg width={size * 0.56} height={size * 0.56} viewBox="0 0 100 100">
                <Path d="M50 4 96 50 50 96 4 50Z" fill="rgba(10,10,12,0.30)" />
                <Path d="M50 20 80 50 50 80 20 50Z" fill="rgba(10,10,12,0.82)" />
                <Path d="M50 20 65 35 50 50 35 35Z" fill="rgba(255,255,255,0.45)" />
              </Svg>
            </View>
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
  plaque: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: palette.graphite,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: alpha.edge,
  },
  engraving: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locked: { alignItems: 'center', justifyContent: 'center', opacity: 0.7 },
});
