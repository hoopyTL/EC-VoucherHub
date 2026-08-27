/**
 * VoucherHub design tokens — the single source of truth for the UI's visual
 * language, translated from the Stitch "VoucherHub Design System" export
 * (stitch_voucherhub_minimalist_design_system/voucherhub_design_system/DESIGN.md).
 *
 * Aesthetic: Swiss minimalism / "Canvas and Ink". Strictly monochrome chrome —
 * colour only ever comes from photographic content (voucher images). Bold
 * Hanken Grotesk display type over Inter body text, large-radius floating white
 * cards on a warm light-gray canvas, pill-shaped buttons, and 1px hairlines.
 *
 * Components consume these tokens instead of hardcoding hex values so the whole
 * app stays consistent and is trivial to retheme.
 */

/** Monochrome palette. Hue is avoided entirely; hierarchy comes from value. */
export const colors = {
  /** Global background — a warm light gray, more premium than pure white. */
  canvas: '#F7F8FA',
  /** A slightly dimmer canvas for recessed/secondary surfaces. */
  canvasDim: '#EEF0F4',
  /** Floating cards and interactive containers. */
  surface: '#FFFFFF',
  /** Subtle raised fill (e.g. inactive chips, hover wells). */
  surfaceMuted: '#F2F4F7',

  /** High-priority text, primary buttons, structural lines. */
  ink: '#101828',
  /** Near-ink used for large display headlines that should feel "blocky". */
  inkSoft: '#1D2939',
  /** Secondary information, metadata, supporting body copy. */
  slate: '#667085',
  /** Lower-emphasis captions / placeholder text. */
  slateMuted: '#98A2B3',

  /** 1px boundary strokes. */
  hairline: '#E4E7EC',
  /** Slightly stronger hairline for inputs / dividers needing more presence. */
  hairlineStrong: '#D0D5DD',

  /** Core marketplace accent: navy-indigo, matching the product reference. */
  accent: '#312E81',
  accentHover: '#1E1B4B',
  accentSurface: '#EEF2FF',
  onAccent: '#FFFFFF',
  brand: '#4F46E5',
  brandHover: '#4338CA',
  brandSurface: '#EEF2FF',
  /** Commerce-only accent for prices, discounts and destructive attention. */
  commerce: '#EF4444',
  commerceSurface: '#FEF2F2',

  /** Text/fill on top of ink surfaces. */
  onInk: '#FFFFFF',
  /** Muted text on top of ink surfaces (e.g. captions on dark hero). */
  onInkMuted: '#D0D5DD',

  /**
   * Semantic accents. The design is monochrome, but transactional states
   * (errors, destructive actions) still need a small amount of signal colour.
   * Kept deliberately restrained.
   */
  danger: '#B42318',
  onDanger: '#FFFFFF',
  dangerSurface: '#FEE4E2',
  onDangerSurface: '#912018',
  /** Success/positive surfaces, rendered as ink-on-light to stay monochrome. */
  successSurface: '#D1FADF',
  onSuccessSurface: '#067647',
  warning: '#B54708',
  warningSurface: '#FEF0C7',
  info: '#175CD3',
  infoSurface: '#EAF2FF'
} as const

/** Font stacks. Hanken Grotesk for display/labels, Inter for body. */
export const fonts = {
  display: "'Be Vietnam Pro', system-ui, -apple-system, sans-serif",
  body: "'Be Vietnam Pro', system-ui, -apple-system, sans-serif",
  mono: "'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace"
} as const

/**
 * Typography presets (px) mirroring DESIGN.md. Display/headline sizes tighten
 * their letter-spacing as they grow for the architectural, blocky look.
 */
export const typography = {
  displayXl: {
    fontFamily: fonts.display,
    fontSize: 60,
    fontWeight: 800,
    lineHeight: '66px',
    letterSpacing: '-0.04em'
  },
  displayLg: {
    fontFamily: fonts.display,
    fontSize: 48,
    fontWeight: 800,
    lineHeight: '54px',
    letterSpacing: '-0.04em'
  },
  headlineLg: {
    fontFamily: fonts.display,
    fontSize: 48,
    fontWeight: 700,
    lineHeight: '52px',
    letterSpacing: '-0.03em'
  },
  headlineMd: {
    fontFamily: fonts.display,
    fontSize: 32,
    fontWeight: 700,
    lineHeight: '38px',
    letterSpacing: '-0.02em'
  },
  headlineSm: {
    fontFamily: fonts.display,
    fontSize: 22,
    fontWeight: 700,
    lineHeight: '28px',
    letterSpacing: '-0.01em'
  },
  bodyLg: {
    fontFamily: fonts.body,
    fontSize: 18,
    fontWeight: 400,
    lineHeight: '32px'
  },
  bodyMd: {
    fontFamily: fonts.body,
    fontSize: 16,
    fontWeight: 400,
    lineHeight: '28px'
  },
  bodySm: {
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 400,
    lineHeight: '22px'
  },
  /** Small uppercase technical labels ("● BROWSE", "#TRAVEL"). */
  label: {
    fontFamily: fonts.display,
    fontSize: 12,
    fontWeight: 600,
    lineHeight: '16px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const
  }
} as const

/** Corner radii. Cards use `xl` (24px); buttons/chips use `full` (pill). */
export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999
} as const

/** Chuẩn spacing 4/8/12/16/24/32/48/64. */
export const spacing = {
  xs: 4,
  sm: 8,
  smPlus: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xlPlus: 48,
  '2xl': 64,
  '3xl': 120,
  containerPadding: 40,
  gutter: 24,
  bentoGap: 16
} as const

/** Soft, highly diffused shadows so white cards hover above the canvas. */
export const shadows = {
  sm: '0 1px 3px rgba(16, 24, 40, 0.08)',
  md: '0 6px 16px rgba(16, 24, 40, 0.08)',
  lg: '0 16px 32px rgba(16, 24, 40, 0.12)',
  /** Default floating card. */
  card: '0 1px 3px rgba(16, 24, 40, 0.08), 0 1px 2px rgba(16, 24, 40, 0.04)',
  /** Slightly stronger lift on hover. */
  cardHover: '0 12px 24px rgba(16, 24, 40, 0.12)',
  /** Top layer (modals, dropdowns). */
  overlay: '0 24px 48px rgba(16, 24, 40, 0.18)'
} as const

/** Glassmorphism preset for nav docks and image overlays. */
export const glass = {
  background: colors.surface,
  backdropFilter: 'none',
  border: `1px solid ${colors.hairline}`
} as const

/** Max content width for centered layouts. */
export const layout = {
  maxWidth: 1200
} as const

export const breakpoints = {
  mobile: 390,
  mobileWide: 430,
  tablet: 768,
  laptop: 1024,
  desktop: 1280,
  wide: 1440
} as const

export const motion = {
  fast: '150ms',
  standard: '180ms',
  slow: '220ms',
  easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)'
} as const

export const chartColors = {
  primary: '#5145CD',
  secondary: '#0E9384',
  commerce: '#F26B38',
  neutral: '#98A2B3',
  grid: '#E4E7EC'
} as const

export const tokens = {
  colors,
  fonts,
  typography,
  radius,
  spacing,
  shadows,
  glass,
  layout,
  breakpoints,
  motion,
  chartColors
} as const

export default tokens
