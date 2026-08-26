/**
 * JASON REMIX — Design tokens.
 *
 * The visual language is obsidian + machined metal: deep black grounds, graphite
 * surfaces separated by hairlines rather than shadows, and titanium/chrome type.
 * Colour is used almost nowhere; hierarchy comes from luminance, weight and space.
 */

export const palette = {
  /** Deepest ground — behind everything. */
  obsidian: '#050506',
  /** Default screen background. */
  black: '#0A0A0C',
  /** Raised surface (cards, sheets). */
  graphite: '#121316',
  /** Second-level surface / pressed state. */
  gunmetal: '#191B1F',
  /** Inset wells, inputs. */
  well: '#0E0F12',
  /** Structural metal — borders, dividers at full strength. */
  steel: '#26292F',
  /** Muted metal — disabled type, tertiary icons. */
  titanium: '#565B64',
  /** Secondary type. */
  silver: '#8D939C',
  /** Primary metal type — labels, icons. */
  brushed: '#BFC4CB',
  /** Highlight metal — active states, key numerals. */
  chrome: '#E4E7EB',
  /** Highest-contrast type. Never pure white. */
  offWhite: '#F4F5F7',

  /** Sparingly used semantic tones — desaturated to stay inside the palette. */
  danger: '#C2544F',
  dangerDim: '#3A2220',
  success: '#7FA184',
  successDim: '#1E2A20',
  warning: '#B79A63',
  warningDim: '#2E2718',
} as const;

/** Transparent metal — used for hairlines, glass and light edges. */
export const alpha = {
  edgeStrong: 'rgba(255,255,255,0.14)',
  edge: 'rgba(255,255,255,0.08)',
  edgeSoft: 'rgba(255,255,255,0.05)',
  hairline: 'rgba(255,255,255,0.06)',
  scrim: 'rgba(5,5,6,0.82)',
  scrimSoft: 'rgba(5,5,6,0.55)',
  press: 'rgba(255,255,255,0.04)',
  glass: 'rgba(18,19,22,0.72)',
} as const;

/**
 * Gradients. Metal is described by an uneven light ramp — a bright band, a fast
 * fall-off and a second weak return — not by a smooth two-stop fade.
 */
export const gradients = {
  /** Brushed chrome for primary buttons and the credit token. */
  chrome: {
    colors: ['#F2F4F6', '#C6CBD2', '#8F959D', '#D3D8DE', '#A2A8B0'] as const,
    locations: [0, 0.26, 0.52, 0.76, 1] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  /** Darker machined metal for secondary surfaces. */
  gunmetal: {
    colors: ['#24272C', '#171A1E', '#101215', '#1B1E22'] as const,
    locations: [0, 0.4, 0.72, 1] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  /** Card face — a barely-there sheen from the top-left. */
  surface: {
    colors: ['#191B1F', '#131418', '#0F1013'] as const,
    locations: [0, 0.55, 1] as const,
    start: { x: 0, y: 0 },
    end: { x: 0.6, y: 1 },
  },
  /** Vertical scrim laid over hero artwork so type stays legible. */
  heroScrim: {
    colors: ['rgba(5,5,6,0)', 'rgba(5,5,6,0.55)', 'rgba(10,10,12,0.97)'] as const,
    locations: [0, 0.5, 1] as const,
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
  },
  /** Fine light edge drawn along the top of raised elements. */
  lightEdge: {
    colors: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.24)', 'rgba(255,255,255,0)'] as const,
    locations: [0, 0.5, 1] as const,
    start: { x: 0, y: 0.5 },
    end: { x: 1, y: 0.5 },
  },
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

export const radius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 18,
  pill: 999,
} as const;

export const fonts = {
  /** Display / wordmark — geometric, slightly futurist. */
  displayLight: 'Sora_300Light',
  display: 'Sora_400Regular',
  displayMedium: 'Sora_500Medium',
  displaySemi: 'Sora_600SemiBold',
  /** Interface — neutral grotesque. */
  light: 'Inter_300Light',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

/**
 * Type scale. Tracking is the main expressive lever: brand terms and labels are
 * set wide and uppercase, body copy stays neutral.
 */
export const type = {
  hero: { fontFamily: fonts.displayLight, fontSize: 44, lineHeight: 48, letterSpacing: 1.5 },
  display: { fontFamily: fonts.displayLight, fontSize: 34, lineHeight: 40, letterSpacing: 1.2 },
  title: { fontFamily: fonts.display, fontSize: 24, lineHeight: 30, letterSpacing: 0.6 },
  heading: { fontFamily: fonts.medium, fontSize: 18, lineHeight: 24, letterSpacing: 0.2 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, letterSpacing: 0.1 },
  bodySmall: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, letterSpacing: 0.1 },
  label: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14, letterSpacing: 2.2 },
  labelWide: { fontFamily: fonts.medium, fontSize: 10, lineHeight: 13, letterSpacing: 3.2 },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, letterSpacing: 0.2 },
  numeric: { fontFamily: fonts.displayLight, fontSize: 40, lineHeight: 46, letterSpacing: -0.5 },
} as const;

/** Motion. Everything is short and eased — nothing bounces. */
export const motion = {
  instant: 90,
  fast: 160,
  base: 240,
  slow: 380,
  deliberate: 620,
  /** Standard ease — matches the platform "decelerate" feel. */
  easing: [0.22, 0.61, 0.36, 1] as const,
} as const;

export const layout = {
  gutter: spacing.xl,
  maxContentWidth: 560,
  tabBarHeight: 58,
  hairlineWidth: 1,
} as const;

export const theme = {
  palette,
  alpha,
  gradients,
  spacing,
  radius,
  fonts,
  type,
  motion,
  layout,
} as const;

export type Theme = typeof theme;
