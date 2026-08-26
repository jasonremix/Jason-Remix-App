import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { palette, radius } from '@/constants/theme';

/** A single hairline. Structure comes from these, never from drop shadows. */
export function Hairline({ style, color = palette.rule }: { style?: StyleProp<ViewStyle>; color?: string }) {
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: color }, style]} />;
}

export type SurfaceProps = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * `raised` is a white card on the paper ground; `sunk` is a well pressed into it;
   * `accent` is the one loud surface, reserved for a single element per screen.
   */
  elevation?: 'raised' | 'sunk' | 'accent' | 'plain';
  rounded?: keyof typeof radius;
  /** Draws the hairline border. On for everything except accent fills. */
  bordered?: boolean;
};

/**
 * The one card primitive.
 *
 * White on paper, a crisp hairline, and nearly square corners — the card reads as a
 * printed panel rather than a floating tile. Nothing here casts a shadow.
 */
export function Surface({
  children,
  style,
  elevation = 'raised',
  rounded = 'md',
  bordered,
}: SurfaceProps) {
  const borderRadius = radius[rounded];
  const showBorder = bordered ?? elevation !== 'accent';

  const background =
    elevation === 'raised'
      ? palette.card
      : elevation === 'sunk'
        ? palette.paperSunk
        : elevation === 'accent'
          ? palette.accent
          : 'transparent';

  return (
    <View
      style={[
        {
          borderRadius,
          backgroundColor: background,
          borderWidth: showBorder ? StyleSheet.hairlineWidth : 0,
          borderColor: elevation === 'sunk' ? palette.ruleStrong : palette.rule,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
