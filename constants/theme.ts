/**
 * JASON REMIX — Design tokens.
 *
 * The visual language is paper and pigment: a cool off-white ground, near-black type
 * set large, crisp hairlines instead of shadows, and one saturated ultramarine used
 * decisively and almost nowhere else. Release artwork carries the colour; the
 * interface stays quiet around it.
 *
 * Ultramarine rather than a screen blue: it is an artist's pigment, and it places the
 * app in a gallery rather than in a dashboard.
 */

export const palette = {
  /** The ground. Cool off-white — never pure screen white, which reads as unfinished. */
  paper: '#F0F1F3',
  /** A shade below the ground, for wells and inset areas. */
  paperSunk: '#E7E9EC',
  /** Raised surfaces. Pure white, so a card lifts off the paper without a shadow. */
  card: '#FFFFFF',

  /** Primary type. Near-black with a cool cast, so it sits with the accent. */
  ink: '#0D0E11',
  /** Secondary type and active icons. */
  inkSoft: '#3A3E45',
  /** Tertiary type, metadata. */
  muted: '#6B7078',
  /** Disabled type, inactive icons. */
  faint: '#9BA1A9',

  /** Hairlines and borders. */
  rule: '#D9DCE1',
  ruleStrong: '#BFC4CC',

  /** The one accent. Used for active state, key figures and nothing decorative. */
  accent: '#001EC8',
  /** Type and icons placed on the accent. */
  onAccent: '#FFFFFF',
  /** A wash of the accent for fills and selected rows. */
  accentWash: '#E4E8FA',
  /** A darker accent for pressed states. */
  accentDeep: '#00169A',

  /** Semantic tones, kept separate from the accent. */
  success: '#1F6B3A',
  successWash: '#E3F1E8',
  danger: '#B3261E',
  dangerWash: '#FBE7E5',
  warning: '#8A5A00',
  warningWash: '#FAEFDC',

  /** Used only where a surface must sit on the accent or on artwork. */
  onDark: '#FFFFFF',
} as const;

/** Transparencies. Used sparingly — this design draws lines rather than layering veils. */
export const alpha = {
  press: 'rgba(13,14,17,0.05)',
  pressAccent: 'rgba(0,30,200,0.08)',
  scrim: 'rgba(13,14,17,0.32)',
  hairline: 'rgba(13,14,17,0.10)',
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 44,
  huge: 64,
} as const;

/**
 * Corners are nearly square. A large radius is what makes an interface read as generic;
 * a 4pt corner reads as printed matter.
 */
export const radius = {
  none: 0,
  sm: 3,
  md: 4,
  lg: 6,
  xl: 10,
  pill: 999,
} as const;

export const fonts = {
  /** Display — Syne. Geometric and slightly odd; carries the personality of the app. */
  display: 'Syne_600SemiBold',
  displayBold: 'Syne_700Bold',
  displayHeavy: 'Syne_800ExtraBold',
  displayRegular: 'Syne_500Medium',
  /** Interface — Manrope. Calm and highly legible, so Syne can be the loud one. */
  light: 'Manrope_300Light',
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
} as const;

/**
 * Type scale. Display sizes are set tight and heavy; interface text stays calm.
 * Tracking is negative on the big sizes — at this weight, default spacing looks loose.
 */
export const type = {
  hero: { fontFamily: fonts.displayHeavy, fontSize: 46, lineHeight: 46, letterSpacing: -1.8 },
  display: { fontFamily: fonts.displayHeavy, fontSize: 34, lineHeight: 36, letterSpacing: -1.2 },
  title: { fontFamily: fonts.displayBold, fontSize: 23, lineHeight: 27, letterSpacing: -0.6 },
  heading: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 23, letterSpacing: -0.2 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 23, letterSpacing: 0 },
  bodySmall: { fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 20, letterSpacing: 0 },
  label: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, letterSpacing: 0.9 },
  labelWide: { fontFamily: fonts.bold, fontSize: 10, lineHeight: 13, letterSpacing: 1.4 },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, letterSpacing: 0 },
  numeric: { fontFamily: fonts.displayHeavy, fontSize: 44, lineHeight: 46, letterSpacing: -2 },
} as const;

/** Motion. Short and eased — the design is still, movement only confirms an action. */
export const motion = {
  instant: 90,
  fast: 160,
  base: 220,
  slow: 340,
  deliberate: 560,
} as const;

export const layout = {
  gutter: 22,
  maxContentWidth: 560,
  tabBarHeight: 58,
  hairlineWidth: 1,
} as const;

export const theme = {
  palette,
  alpha,
  spacing,
  radius,
  fonts,
  type,
  motion,
  layout,
} as const;

export type Theme = typeof theme;
