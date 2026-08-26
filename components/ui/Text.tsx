import { forwardRef } from 'react';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { palette, type as typeScale } from '@/constants/theme';

export type TextVariant = keyof typeof typeScale;

export type TextTone =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'muted'
  | 'accent'
  | 'danger'
  | 'success'
  | 'inverse';

const TONES: Record<TextTone, string> = {
  primary: palette.ink,
  secondary: palette.inkSoft,
  tertiary: palette.muted,
  muted: palette.faint,
  accent: palette.accent,
  danger: palette.danger,
  success: palette.success,
  inverse: palette.onDark,
};

/**
 * Caps on dynamic type. Display sizes scale less than body copy so the biggest
 * accessibility setting still produces a readable layout rather than a broken one.
 */
const SCALE_CAP: Partial<Record<TextVariant, number>> = {
  hero: 1.25,
  display: 1.3,
  numeric: 1.3,
  title: 1.4,
  heading: 1.5,
};

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  tone?: TextTone;
  /** Uppercases the content — used for labels. */
  uppercase?: boolean;
  /** Extra tracking on top of the variant's own, in points. */
  tracking?: number;
  align?: TextStyle['textAlign'];
};

export const Text = forwardRef<RNText, TextProps>(function Text(
  { variant = 'body', tone = 'secondary', uppercase, tracking, align, style, children, ...rest },
  ref,
) {
  const base = typeScale[variant];
  return (
    <RNText
      ref={ref}
      allowFontScaling
      maxFontSizeMultiplier={SCALE_CAP[variant] ?? 1.6}
      style={[
        base,
        { color: TONES[tone] },
        tracking !== undefined && { letterSpacing: base.letterSpacing + tracking },
        align && { textAlign: align },
        style,
      ]}
      {...rest}
    >
      {uppercase && typeof children === 'string' ? children.toLocaleUpperCase('de-DE') : children}
    </RNText>
  );
});

/** Small uppercase label — the app's most-used piece of type after body copy. */
export function Label({ tone = 'tertiary', ...rest }: Omit<TextProps, 'variant'>) {
  return <Text variant="label" tone={tone} uppercase {...rest} />;
}

/** Section marker: wider tracking, quieter, used above every list. */
export function Overline({ tone = 'muted', ...rest }: Omit<TextProps, 'variant'>) {
  return <Text variant="labelWide" tone={tone} uppercase {...rest} />;
}
