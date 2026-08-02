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
  canvas: '#E8E7E4',
  /** A slightly dimmer canvas for recessed/secondary surfaces. */
  canvasDim: '#DBDAD9',
  /** Floating cards and interactive containers. */
  surface: '#FFFFFF',
  /** Subtle raised fill (e.g. inactive chips, hover wells). */
  surfaceMuted: '#F5F3F3',

  /** High-priority text, primary buttons, structural lines. */
  ink: '#0B0B0B',
  /** Near-ink used for large display headlines that should feel "blocky". */
  inkSoft: '#1B1C1C',
  /** Secondary information, metadata, supporting body copy. */
  slate: '#6B6B6B',
  /** Lower-emphasis captions / placeholder text. */
  slateMuted: '#8A8A8A',

  /** 1px boundary strokes. */
  hairline: '#E2E2E2',
  /** Slightly stronger hairline for inputs / dividers needing more presence. */
  hairlineStrong: '#C4C7C7',

  /** Text/fill on top of ink surfaces. */
  onInk: '#FFFFFF',
  /** Muted text on top of ink surfaces (e.g. captions on dark hero). */
  onInkMuted: '#B5B3B2',

  /**
   * Semantic accents. The design is monochrome, but transactional states
   * (errors, destructive actions) still need a small amount of signal colour.
   * Kept deliberately restrained.
   */
  danger: '#BA1A1A',
  onDanger: '#FFFFFF',
  dangerSurface: '#FFDAD6',
  onDangerSurface: '#93000A',
  /** Success/positive surfaces, rendered as ink-on-light to stay monochrome. */
  successSurface: '#E9E8E7',
  onSuccessSurface: '#1B1C1C'
} as const

/** Font stacks. Hanken Grotesk for display/labels, Inter for body. */
export const fonts = {
  display: "'Hanken Grotesk', system-ui, -apple-system, sans-serif",
  body: "'Inter', system-ui, -apple-system, sans-serif"
} as const

/**
 * Typography presets (px) mirroring DESIGN.md. Display/headline sizes tighten
 * their letter-spacing as they grow for the architectural, blocky look.
 */
export const typography = {
  displayXl: {
    fontFamily: fonts.display,
    fontSize: 80,
    fontWeight: 800,
    lineHeight: '84px',
    letterSpacing: '-0.04em'
  },
  displayLg: {
    fontFamily: fonts.display,
    fontSize: 64,
    fontWeight: 800,
    lineHeight: '68px',
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
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999
} as const

/** 8px spacing scale plus layout-level constants from DESIGN.md. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
  '2xl': 64,
  '3xl': 120,
  containerPadding: 40,
  gutter: 24,
  bentoGap: 16
} as const

/** Soft, highly diffused shadows so white cards hover above the canvas. */
export const shadows = {
  /** Default floating card. */
  card: '0px 20px 40px rgba(0, 0, 0, 0.04)',
  /** Slightly stronger lift on hover. */
  cardHover: '0px 24px 50px rgba(0, 0, 0, 0.08)',
  /** Top layer (modals, dropdowns). */
  overlay: '0px 30px 60px rgba(0, 0, 0, 0.18)'
} as const

/** Glassmorphism preset for nav docks and image overlays. */
export const glass = {
  background: 'rgba(251, 249, 248, 0.72)',
  backdropFilter: 'blur(20px)',
  border: `1px solid ${colors.hairline}`
} as const

/** Max content width for centered layouts. */
export const layout = {
  maxWidth: 1200
} as const

export const tokens = {
  colors,
  fonts,
  typography,
  radius,
  spacing,
  shadows,
  glass,
  layout
} as const

export default tokens
