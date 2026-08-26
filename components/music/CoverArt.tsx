import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Text } from '@/components/ui/Text';
import { palette, radius, spacing } from '@/constants/theme';

/**
 * Release artwork.
 *
 * When a cover image exists it is shown. When one does not — during demo mode, or for
 * a release whose art has not been uploaded yet — a sleeve is *generated* from the
 * title: flat colour fields in the manner of a Swiss concert poster, composed
 * deterministically so the same release always produces the same sleeve.
 *
 * This is the one place in the app that carries colour beyond the single accent. The
 * pigments below are artwork, not interface: they never appear on a control, a label
 * or a surface, which is what keeps the app quiet around them.
 */

/** Poster pigments. Artwork only — see the note above. */
const PIGMENTS = [
  '#001EC8', // ultramarine, the brand accent
  '#0D0E11', // ink
  '#E8402A', // cadmium red
  '#F0B323', // ochre
  '#0E7C5A', // viridian
  '#F0F1F3', // paper
] as const;

export function CoverArt({
  uri,
  title,
  size,
  showTitle = false,
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
          transition={220}
          accessibilityIgnoresInvertColors
          accessibilityLabel={`Cover von ${title}`}
        />
      ) : (
        <GeneratedSleeve title={title} />
      )}

      {!uri && showTitle && (
        <View style={styles.caption} pointerEvents="none">
          <Text variant="labelWide" tone="inverse" numberOfLines={2} uppercase>
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
  const pick = (shift: number, range: number) => (seed >> shift) % range;

  // Two pigments that are never the same, plus the composition archetype.
  const groundIndex = pick(0, PIGMENTS.length);
  const figureIndex = (groundIndex + 1 + pick(4, PIGMENTS.length - 1)) % PIGMENTS.length;
  const ground = PIGMENTS[groundIndex];
  const figure = PIGMENTS[figureIndex];
  const composition = pick(8, 5);

  /**
   * The split facet, drawn in the figure colour.
   *
   * Every archetype places it on bare ground rather than over its own field: a mark that
   * half-overlaps the main shape reads as a printing fault, not as a composition.
   */
  const facet = (cx: number, cy: number, s: number) => (
    <>
      <Path d={`M${cx - 1} ${cy - s} L${cx - 1} ${cy + s} L${cx - s * 0.9} ${cy} Z`} fill={figure} />
      <Path d={`M${cx + 1} ${cy - s} L${cx + s * 0.9} ${cy} L${cx + 1} ${cy + s} Z`} fill={figure} />
    </>
  );

  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100">
      <Rect x="0" y="0" width="100" height="100" fill={ground} />

      {composition === 0 &&
        (() => {
          // Diagonal split: the field takes the lower half, the facet sits above it.
          const left = 52 + pick(23, 26);
          const right = 44 + pick(25, 26);
          return (
            <>
              <Path d={`M0 ${left} L100 ${right} L100 100 L0 100 Z`} fill={figure} />
              {facet(30 + pick(27, 40), 24, 13)}
            </>
          );
        })()}

      {composition === 1 &&
        (() => {
          // Offset disc, with the facet on the opposite side of the square.
          const cx = 32 + pick(23, 12);
          const r = 20 + pick(27, 8);
          return (
            <>
              <Circle cx={cx} cy={38 + pick(25, 10)} r={r} fill={figure} />
              {facet(78, 80, 12)}
            </>
          );
        })()}

      {composition === 2 &&
        (() => {
          // Stacked bands, with the facet in the gap between them.
          const top = 12 + pick(23, 8);
          const height = 12 + pick(25, 8);
          return (
            <>
              <Rect x="0" y={top} width="100" height={height} fill={figure} />
              <Rect x="0" y="74" width="100" height={8 + pick(29, 8)} fill={figure} />
              {facet(50, (top + height + 74) / 2, 14)}
            </>
          );
        })()}

      {composition === 3 &&
        (() => {
          // Corner wedge out of the top left, facet in the free bottom-right corner.
          const reach = 48 + pick(23, 26);
          return (
            <>
              <Path d={`M0 0 L${reach} 0 L0 ${reach} Z`} fill={figure} />
              {facet(72, 72, 16)}
            </>
          );
        })()}

      {composition === 4 && (
        // The facet alone, large and centred, over a single rule.
        <>
          <Rect x="14" y={72 + pick(23, 8)} width="72" height="2" fill={figure} />
          {facet(50, 44, 28)}
        </>
      )}
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
    backgroundColor: palette.paperSunk,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.rule,
  },
  caption: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
  },
});
