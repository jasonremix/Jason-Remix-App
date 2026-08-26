import Svg, { Circle, Path, Polyline, Rect } from 'react-native-svg';

import { palette } from '@/constants/theme';

/**
 * Hand-authored line icons.
 *
 * Drawn on a 24pt grid at a 1.6pt stroke. On a light ground a hairline icon goes
 * weak and grey, so these are set heavier than their dark-mode ancestors while
 * staying geometric. Round caps and joins only; no fills except where a shape is
 * meant to read as solid.
 */

export type IconName =
  | 'home'
  | 'disc'
  | 'gift'
  | 'token'
  | 'user'
  | 'chevron-right'
  | 'chevron-left'
  | 'chevron-down'
  | 'external'
  | 'play'
  | 'check'
  | 'lock'
  | 'settings'
  | 'bell'
  | 'shield'
  | 'trash'
  | 'plus'
  | 'minus'
  | 'close'
  | 'alert'
  | 'offline'
  | 'refresh'
  | 'logout'
  | 'ticket'
  | 'box'
  | 'star'
  | 'spotify'
  | 'youtube'
  | 'apple'
  | 'link'
  | 'search'
  | 'eye'
  | 'eye-off'
  | 'edit'
  | 'clock'
  | 'info'
  | 'document';

export type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

type StrokeProps = {
  stroke: string;
  strokeWidth: number;
  strokeLinecap: 'round';
  strokeLinejoin: 'round';
  fill: 'none';
};

export function Icon({ name, size = 22, color = palette.inkSoft, strokeWidth = 1.6 }: IconProps) {
  const stroke: StrokeProps = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    fill: 'none',
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {renderPaths(name, stroke, color)}
    </Svg>
  );
}

function renderPaths(name: IconName, s: StrokeProps, color: string) {
  switch (name) {
    case 'home':
      return (
        <>
          <Path {...s} d="M3.5 10.2 12 3.6l8.5 6.6" />
          <Path {...s} d="M5.6 11.8V20h12.8v-8.2" />
          <Path {...s} d="M9.9 20v-5.1h4.2V20" />
        </>
      );
    case 'disc':
      return (
        <>
          <Circle {...s} cx={12} cy={12} r={8.4} />
          <Circle {...s} cx={12} cy={12} r={2.6} />
          <Path {...s} d="M12 3.6a8.4 8.4 0 0 1 5.94 2.46" opacity={0.55} />
        </>
      );
    case 'gift':
      return (
        <>
          <Rect {...s} x={3.6} y={9.4} width={16.8} height={10.9} rx={1.4} />
          <Path {...s} d="M2.6 9.4h18.8" />
          <Path {...s} d="M12 9.4v10.9" />
          <Path {...s} d="M12 9.4C10.6 6.4 9.4 5 8 5a2 2 0 0 0 0 4.4Z" />
          <Path {...s} d="M12 9.4c1.4-3 2.6-4.4 4-4.4a2 2 0 0 1 0 4.4Z" />
        </>
      );
    case 'token':
      // The credits facet mark: an elongated diamond with an inner bevel.
      return (
        <>
          <Path {...s} d="M12 2.9 20.2 12 12 21.1 3.8 12Z" />
          <Path {...s} d="M12 7.2 16.4 12 12 16.8 7.6 12Z" opacity={0.6} />
        </>
      );
    case 'user':
      return (
        <>
          <Circle {...s} cx={12} cy={8.4} r={3.9} />
          <Path {...s} d="M4.6 20.3c1.1-3.8 3.9-5.8 7.4-5.8s6.3 2 7.4 5.8" />
        </>
      );
    case 'chevron-right':
      return <Polyline {...s} points="9.5,4.8 16.4,12 9.5,19.2" />;
    case 'chevron-left':
      return <Polyline {...s} points="14.5,4.8 7.6,12 14.5,19.2" />;
    case 'chevron-down':
      return <Polyline {...s} points="4.8,9.5 12,16.4 19.2,9.5" />;
    case 'external':
      return (
        <>
          <Path {...s} d="M8.4 15.6 19 5" />
          <Path {...s} d="M13.4 5H19v5.6" />
          <Path {...s} d="M19 14.2V19H5V5h4.8" />
        </>
      );
    case 'play':
      return <Path {...s} d="M8.4 5.4 18.6 12 8.4 18.6Z" />;
    case 'check':
      return <Polyline {...s} points="4.6,12.6 9.5,17.4 19.4,6.8" />;
    case 'lock':
      return (
        <>
          <Rect {...s} x={4.6} y={10.4} width={14.8} height={9.6} rx={1.6} />
          <Path {...s} d="M8.2 10.4V7.9a3.8 3.8 0 0 1 7.6 0v2.5" />
        </>
      );
    case 'settings':
      return (
        <>
          <Circle {...s} cx={12} cy={12} r={2.9} />
          <Path
            {...s}
            d="M12 2.8v2.4M12 18.8v2.4M4.5 12H2.1M21.9 12h-2.4M6.7 6.7 5 5M19 19l-1.7-1.7M17.3 6.7 19 5M5 19l1.7-1.7"
          />
        </>
      );
    case 'bell':
      return (
        <>
          <Path {...s} d="M6.4 10.2a5.6 5.6 0 0 1 11.2 0c0 4 1.5 5.6 1.5 5.6H4.9s1.5-1.6 1.5-5.6Z" />
          <Path {...s} d="M10.2 19a2 2 0 0 0 3.6 0" />
        </>
      );
    case 'shield':
      return (
        <>
          <Path {...s} d="M12 2.9 19.6 6v6c0 4.3-3 7.6-7.6 9.1C7.4 19.6 4.4 16.3 4.4 12V6Z" />
          <Polyline {...s} points="9,12 11.3,14.3 15.4,10.2" />
        </>
      );
    case 'trash':
      return (
        <>
          <Path {...s} d="M3.9 6.6h16.2" />
          <Path {...s} d="M8.6 6.6V4.9a1.4 1.4 0 0 1 1.4-1.4h4a1.4 1.4 0 0 1 1.4 1.4v1.7" />
          <Path {...s} d="M6.2 6.6 7 19.2a1.5 1.5 0 0 0 1.5 1.4h7a1.5 1.5 0 0 0 1.5-1.4l.8-12.6" />
        </>
      );
    case 'plus':
      return <Path {...s} d="M12 4.8v14.4M4.8 12h14.4" />;
    case 'minus':
      return <Path {...s} d="M4.8 12h14.4" />;
    case 'close':
      return <Path {...s} d="M5.6 5.6 18.4 18.4M18.4 5.6 5.6 18.4" />;
    case 'alert':
      return (
        <>
          <Path {...s} d="M12 3.6 21.4 20H2.6Z" />
          <Path {...s} d="M12 9.6v4.6" />
          <Circle cx={12} cy={17.2} r={0.9} fill={color} />
        </>
      );
    case 'offline':
      return (
        <>
          <Path {...s} d="M2.4 8.9a15 15 0 0 1 6-3.3" />
          <Path {...s} d="M21.6 8.9a15 15 0 0 0-6.6-3.4" />
          <Path {...s} d="M6 12.5a9.6 9.6 0 0 1 3-1.8" />
          <Path {...s} d="M18 12.5a9.6 9.6 0 0 0-3.2-1.9" />
          <Path {...s} d="M9.4 16.1a4.6 4.6 0 0 1 5.2 0" />
          <Circle cx={12} cy={19.4} r={0.9} fill={color} />
          <Path {...s} d="M3.2 3.2 20.8 20.8" />
        </>
      );
    case 'refresh':
      return (
        <>
          <Path {...s} d="M20.2 12a8.2 8.2 0 1 1-2.4-5.8" />
          <Polyline {...s} points="20.2,3.4 20.2,7.6 16,7.6" />
        </>
      );
    case 'logout':
      return (
        <>
          <Path {...s} d="M14.8 4.6H6.4A1.6 1.6 0 0 0 4.8 6.2v11.6a1.6 1.6 0 0 0 1.6 1.6h8.4" />
          <Path {...s} d="M15.6 8.4 19.2 12l-3.6 3.6" />
          <Path {...s} d="M19.2 12H9.4" />
        </>
      );
    case 'ticket':
      return (
        <>
          <Path
            {...s}
            d="M3.6 8.2V6.6h16.8v1.6a2.2 2.2 0 0 0 0 4.4v1.6H3.6v-1.6a2.2 2.2 0 0 0 0-4.4Z"
            transform="translate(0 1.4)"
          />
          <Path {...s} d="M13.2 8v8" strokeDasharray="1.6 2" />
        </>
      );
    case 'box':
      return (
        <>
          <Path {...s} d="M3.8 7.6 12 3.4l8.2 4.2v8.8L12 20.6l-8.2-4.2Z" />
          <Path {...s} d="M3.8 7.6 12 11.9l8.2-4.3M12 11.9v8.7" />
        </>
      );
    case 'star':
      return <Path {...s} d="m12 3.6 2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.9l6-.8Z" />;
    case 'spotify':
      return (
        <>
          <Circle {...s} cx={12} cy={12} r={8.6} />
          <Path {...s} d="M7.4 9.4c3-.9 6.2-.6 8.9.9" />
          <Path {...s} d="M8 12.4c2.4-.7 5-.4 7.2.8" />
          <Path {...s} d="M8.7 15.2c1.9-.5 3.9-.3 5.7.7" />
        </>
      );
    case 'youtube':
      return (
        <>
          <Rect {...s} x={2.8} y={5.6} width={18.4} height={12.8} rx={3.2} />
          <Path {...s} d="M10.4 9.2 15.4 12l-5 2.8Z" />
        </>
      );
    case 'apple':
      return (
        <>
          <Path
            {...s}
            d="M15.6 12.6c0-2.2 1.8-3.2 1.9-3.3-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.7.8-3.3.8-.7 0-1.7-.8-2.8-.8-1.5 0-2.8.9-3.5 2.2-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.5 2.2 2.6 2.1 1.1 0 1.5-.7 2.8-.7s1.6.7 2.8.7c1.1 0 1.9-1 2.6-2a9 9 0 0 0 1.2-2.4c-.1 0-2.2-.9-2.2-3.5Z"
          />
          <Path {...s} d="M13.6 6.1c.6-.7 1-1.7.9-2.7-.9 0-2 .6-2.6 1.3-.6.6-1.1 1.6-.9 2.6 1 0 2-.5 2.6-1.2" />
        </>
      );
    case 'link':
      return (
        <>
          <Path {...s} d="M10.2 13.8a3.8 3.8 0 0 0 5.6.3l2.6-2.6a3.8 3.8 0 0 0-5.4-5.4l-1.4 1.4" />
          <Path {...s} d="M13.8 10.2a3.8 3.8 0 0 0-5.6-.3l-2.6 2.6a3.8 3.8 0 0 0 5.4 5.4l1.4-1.4" />
        </>
      );
    case 'search':
      return (
        <>
          <Circle {...s} cx={10.8} cy={10.8} r={6.4} />
          <Path {...s} d="M15.6 15.6 20.2 20.2" />
        </>
      );
    case 'eye':
      return (
        <>
          <Path {...s} d="M1.9 12S5.6 5.4 12 5.4 22.1 12 22.1 12 18.4 18.6 12 18.6 1.9 12 1.9 12Z" />
          <Circle {...s} cx={12} cy={12} r={3.1} />
        </>
      );
    case 'eye-off':
      return (
        <>
          <Path {...s} d="M9.6 5.8a8.9 8.9 0 0 1 2.4-.4c6.4 0 10.1 6.6 10.1 6.6a17 17 0 0 1-2.9 3.7" />
          <Path {...s} d="M6.3 7.4A17 17 0 0 0 1.9 12s3.7 6.6 10.1 6.6a9.4 9.4 0 0 0 3.9-.8" />
          <Path {...s} d="M9.9 9.9a3.1 3.1 0 0 0 4.3 4.3" />
          <Path {...s} d="M3.2 3.2 20.8 20.8" />
        </>
      );
    case 'edit':
      return (
        <>
          <Path {...s} d="M4.6 19.4h3.2L18.6 8.6a2.3 2.3 0 0 0-3.2-3.2L4.6 16.2Z" />
          <Path {...s} d="M14.4 6.4l3.2 3.2" />
        </>
      );
    case 'clock':
      return (
        <>
          <Circle {...s} cx={12} cy={12} r={8.4} />
          <Polyline {...s} points="12,7 12,12 15.6,14.2" />
        </>
      );
    case 'info':
      return (
        <>
          <Circle {...s} cx={12} cy={12} r={8.4} />
          <Path {...s} d="M12 11v5.4" />
          <Circle cx={12} cy={7.9} r={0.9} fill={color} />
        </>
      );
    case 'document':
      return (
        <>
          <Path {...s} d="M6 3.6h7.4L18.6 8.8v11.6H6Z" />
          <Path {...s} d="M13.4 3.6v5.2h5.2" />
          <Path {...s} d="M9 13h6.4M9 16.4h4.6" />
        </>
      );
    default:
      return null;
  }
}
