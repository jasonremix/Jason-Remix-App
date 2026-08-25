import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { Text } from '@/components/ui/Text';
import { alpha, palette, radius, spacing } from '@/constants/theme';

/**
 * Release artwork.
 *
 * When a cover image exists it is shown. When one does not — during demo mode, or for a
 * release whose art has not been uploaded yet — a sleeve is *generated* from the title
 * rather than a grey placeholder box being shown: a facet composition whose angles and
 * light direction are derived deterministically from the title, so the same release
 * always produces the same sleeve.
 */

export function CoverArt({
  uri,
  title,
  size,
  showTitle = true,
  rounded = 'md',
}: {
  uri?: string | null;
  title: string;
  /** Square edge length. Omit to fill the parent. */
  size?: number;
  showTitle?: boolean;
  rounded?: keyof typeof radius;
}) {
  const dimension = size ? { width: size, height: size } : ({ aspectRatio: 1, width: '100%' } as const);
  const borderRadius = radius[rounded];

  return (
    <View style={[styles.root, dimension, { borderRadius }]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={240}
          accessibilityIgnoresInvertColors
          accessibilityLabel={`${title} cover`}
        />
      ) : (
        <GeneratedSleeve title={title} />
      )}

      {!uri && showTitle && (
        <View style={styles.caption} pointerEvents="none">
          <Text variant="labelWide" tone="tertiary" numberOfLines={2} uppercase>
            {title}
          </Text>
        </View>
      )}
    </View>
  );
}

/** Stable 32-bit hash — the sleeve must not change between renders or launches. */
function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function GeneratedSleeve({ title }: { title: string }) {
  const seed = hash(title);
  const id = `sleeve-${seed}`;

  // Every varying quantity is a bounded read from the same hash.
  const angle = (seed % 40) - 20;
  const bandY = 34 + (seed % 22);
  const facetX = 26 + ((seed >> 3) % 46);
  const facetSize = 16 + ((seed >> 7) % 14);
  const lightX = ((seed >> 11) % 60) / 100;

  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={`${id}-ground`} x1="0" y1="0" x2="0.7" y2="1">
          <Stop offset="0" stopColor="#1A1C20" />
          <Stop offset="0.6" stopColor="#101216" />
          <Stop offset="1" stopColor="#08090B" />
        </LinearGradient>
        <LinearGradient id={`${id}-metal`} x1={String(lightX)} y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#EDF0F3" stopOpacity="0.92" />
          <Stop offset="0.3" stopColor="#B7BCC4" stopOpacity="0.62" />
          <Stop offset="0.62" stopColor="#767C85" stopOpacity="0.4" />
          <Stop offset="1" stopColor="#C9CED4" stopOpacity="0.24" />
        </LinearGradient>
      </Defs>

      <Rect x="0" y="0" width="100" height="100" fill={`url(#${id}-ground)`} />

      {/* The band of light across the sleeve. */}
      <Path
        d={`M-10 ${bandY} L110 ${bandY - 14} L110 ${bandY - 6} L-10 ${bandY + 8} Z`}
        fill={`url(#${id}-metal)`}
        transform={`rotate(${angle} 50 50)`}
        opacity={0.55}
      />

      {/* The facet — the same figure as the brand mark, cropped by the sleeve edge. */}
      <Path
        d={`M${facetX} ${50 - facetSize} L${facetX + facetSize} 50 L${facetX} ${50 + facetSize} L${facetX - facetSize} 50 Z`}
        fill={`url(#${id}-metal)`}
        opacity={0.9}
      />
      <Path
        d={`M${facetX} ${50 - facetSize} L${facetX + facetSize / 2} 50 L${facetX} ${50 + facetSize / 2} L${facetX - facetSize / 2} 50 Z`}
        fill="rgba(8,9,11,0.55)"
      />

      {/* Two hairlines to give the composition a horizon. */}
      <Path d={`M0 ${bandY + 26} H100`} stroke="rgba(255,255,255,0.07)" strokeWidth={0.4} />
      <Path d={`M0 ${bandY + 30} H100`} stroke="rgba(255,255,255,0.04)" strokeWidth={0.4} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
    backgroundColor: palette.graphite,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: alpha.edge,
  },
  caption: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
  },
});
