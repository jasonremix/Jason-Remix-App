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

  // Every varying quantity is a bounded read from the same hash, so a title always
  // produces the same sleeve. The ranges are deliberately wide: at a 64pt thumbnail
  // a subtle variation is no variation at all, and the discography would read as one
  // repeated tile.
  const pick = (shift: number, range: number) => (seed >> shift) % range;

  const angle = pick(0, 70) - 35;
  const bandY = 22 + pick(3, 56);
  const bandWeight = 6 + pick(6, 16);
  const facetX = 18 + pick(9, 64);
  const facetY = 30 + pick(13, 40);
  const facetSize = 14 + pick(17, 34);
  const lightX = pick(21, 80) / 100;
  const ground = pick(25, 3);
  const hasSecondFacet = pick(27, 2) === 1;

  // Three ground ramps rather than one, so tiles differ in overall value and not
  // only in the arrangement of their marks.
  const grounds = [
    ['#1E2126', '#111317', '#08090B'],
    ['#15171B', '#0D0E11', '#050506'],
    ['#232629', '#14161A', '#0A0B0D'],
  ][ground];

  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={`${id}-ground`} x1="0" y1="0" x2="0.7" y2="1">
          <Stop offset="0" stopColor={grounds[0]} />
          <Stop offset="0.6" stopColor={grounds[1]} />
          <Stop offset="1" stopColor={grounds[2]} />
        </LinearGradient>
        <LinearGradient id={`${id}-metal`} x1={String(lightX)} y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#F2F5F8" stopOpacity="0.96" />
          <Stop offset="0.3" stopColor="#BCC1C9" stopOpacity="0.72" />
          <Stop offset="0.62" stopColor="#767C85" stopOpacity="0.46" />
          <Stop offset="1" stopColor="#CDD2D8" stopOpacity="0.3" />
        </LinearGradient>
      </Defs>

      <Rect x="0" y="0" width="100" height="100" fill={`url(#${id}-ground)`} />

      {/* The band of light across the sleeve. */}
      <Path
        d={`M-20 ${bandY} L120 ${bandY - bandWeight} L120 ${bandY + 2} L-20 ${bandY + bandWeight + 2} Z`}
        fill={`url(#${id}-metal)`}
        transform={`rotate(${angle} 50 50)`}
        opacity={0.62}
      />

      {/* The facet — the brand mark, cropped by the sleeve edge as often as not. */}
      <Path
        d={`M${facetX} ${facetY - facetSize} L${facetX + facetSize} ${facetY} L${facetX} ${facetY + facetSize} L${facetX - facetSize} ${facetY} Z`}
        fill={`url(#${id}-metal)`}
      />
      <Path
        d={`M${facetX} ${facetY - facetSize / 2} L${facetX + facetSize / 2} ${facetY} L${facetX} ${facetY + facetSize / 2} L${facetX - facetSize / 2} ${facetY} Z`}
        fill={grounds[2]}
        opacity={0.85}
      />

      {hasSecondFacet && (
        <Path
          d={`M${100 - facetX} ${100 - facetY - facetSize / 3} L${100 - facetX + facetSize / 3} ${100 - facetY} L${100 - facetX} ${100 - facetY + facetSize / 3} L${100 - facetX - facetSize / 3} ${100 - facetY} Z`}
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity="0.22"
          strokeWidth={0.8}
        />
      )}

      {/* Two hairlines to give the composition a horizon. */}
      <Path d={`M0 ${bandY + 26} H100`} stroke="rgba(255,255,255,0.08)" strokeWidth={0.4} />
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
