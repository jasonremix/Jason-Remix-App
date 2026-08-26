import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { palette } from '@/constants/theme';

/**
 * The Jason Remix facet mark — the same figure as the app icon.
 *
 * An outer hairline diamond around a chrome core split down the middle: one form made
 * of two halves. It doubles as the credit token (`◈`), so the brand mark and the
 * currency are one shape at two sizes.
 */
export function Monogram({
  size = 48,
  tone = 'chrome',
}: {
  size?: number;
  /** `chrome` fills the core with metal; `outline` leaves it as an empty recess. */
  tone?: 'chrome' | 'outline';
}) {
  const id = `facet-${tone}`;
  const filled = tone === 'chrome';

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityRole="image">
      <Defs>
        <LinearGradient id={`${id}-l`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#F6F8FA" />
          <Stop offset="0.24" stopColor="#CBD0D7" />
          <Stop offset="0.5" stopColor="#8A9098" />
          <Stop offset="0.72" stopColor="#DCE1E7" />
          <Stop offset="1" stopColor="#9AA0A8" />
        </LinearGradient>
        <LinearGradient id={`${id}-r`} x1="1" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#F6F8FA" />
          <Stop offset="0.24" stopColor="#CBD0D7" />
          <Stop offset="0.5" stopColor="#8A9098" />
          <Stop offset="0.72" stopColor="#DCE1E7" />
          <Stop offset="1" stopColor="#9AA0A8" />
        </LinearGradient>
      </Defs>

      {/* Outer facet */}
      <Path
        d="M50 3 97 50 50 97 3 50Z"
        fill="none"
        stroke={filled ? palette.brushed : palette.steel}
        strokeWidth={2.2}
      />

      {/* Core, split into mirrored halves by a 2.2-unit seam */}
      <Path
        d="M48.9 22.1 48.9 77.9 21 50Z"
        fill={filled ? `url(#${id}-l)` : 'none'}
        stroke={filled ? 'none' : palette.steel}
        strokeWidth={2.2}
      />
      <Path
        d="M51.1 22.1 79 50 51.1 77.9Z"
        fill={filled ? `url(#${id}-r)` : 'none'}
        stroke={filled ? 'none' : palette.steel}
        strokeWidth={2.2}
      />
    </Svg>
  );
}
