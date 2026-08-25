import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { alpha, gradients, palette, radius } from '@/constants/theme';

/** A single hairline. Depth comes from these, never from drop shadows. */
export function Hairline({ style, color = alpha.hairline }: { style?: StyleProp<ViewStyle>; color?: string }) {
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: color }, style]} />;
}

/**
 * The fine specular line along the top of a raised element — bright in the middle,
 * fading at both ends, as light would catch a machined edge.
 */
export function LightEdge({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <LinearGradient
      colors={[...gradients.lightEdge.colors]}
      locations={[...gradients.lightEdge.locations]}
      start={gradients.lightEdge.start}
      end={gradients.lightEdge.end}
      style={[styles.lightEdge, style]}
      pointerEvents="none"
    />
  );
}

export type SurfaceProps = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** `flat` for the deepest wells, `raised` for cards, `inset` for inputs. */
  elevation?: 'flat' | 'raised' | 'inset';
  /** Draws the specular top edge. On by default for raised surfaces. */
  edge?: boolean;
  rounded?: keyof typeof radius;
};

/**
 * The one card primitive. Every panel in the app is this: a graphite gradient face, a
 * hairline border, and — when raised — a light edge across the top.
 */
export function Surface({
  children,
  style,
  elevation = 'raised',
  edge,
  rounded = 'lg',
}: SurfaceProps) {
  const showEdge = edge ?? elevation === 'raised';
  const borderRadius = radius[rounded];

  if (elevation === 'inset') {
    return (
      <View
        style={[
          styles.base,
          { borderRadius, backgroundColor: palette.well, borderColor: alpha.edgeSoft },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  if (elevation === 'flat') {
    return (
      <View
        style={[
          styles.base,
          { borderRadius, backgroundColor: palette.graphite, borderColor: alpha.hairline },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.base, { borderRadius, borderColor: alpha.edge }, style]}>
      <LinearGradient
        colors={[...gradients.surface.colors]}
        locations={[...gradients.surface.locations]}
        start={gradients.surface.start}
        end={gradients.surface.end}
        style={[StyleSheet.absoluteFill, { borderRadius }]}
      />
      {showEdge && <LightEdge style={{ borderTopLeftRadius: borderRadius, borderTopRightRadius: borderRadius }} />}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  lightEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
});
