import Svg, { Path } from 'react-native-svg';

import { palette } from '@/constants/theme';

/**
 * The Jason Remix facet mark — the same figure as the app icon.
 *
 * A solid ultramarine diamond split down the middle: one form made of two halves, the
 * mark for a remix. Flat pigment, no bevel and no gradient — on paper the shape does
 * the work that metal shading used to do on black.
 *
 * It doubles as the credit token, so the brand mark and the currency are one shape at
 * two sizes.
 */
export function Monogram({
  size = 48,
  tone = 'accent',
}: {
  size?: number;
  /** `accent` is the pigment mark; `ink` for use on an accent ground; `outline` is hollow. */
  tone?: 'accent' | 'ink' | 'outline' | 'inverse';
}) {
  const fill =
    tone === 'accent' ? palette.accent : tone === 'ink' ? palette.ink : tone === 'inverse' ? palette.onAccent : 'none';
  const stroke = tone === 'outline' ? palette.ruleStrong : 'none';

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityRole="image">
      {/* Left half */}
      <Path
        d="M47.4 6 47.4 94 5 50Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={tone === 'outline' ? 5 : 0}
        strokeLinejoin="round"
      />
      {/* Right half — the seam between them is the ground showing through */}
      <Path
        d="M52.6 6 95 50 52.6 94Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={tone === 'outline' ? 5 : 0}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
