/**
 * Badge — compact status/label indicator.
 *
 * Used for voucher/order/account statuses. The `status` helper maps the domain
 * status strings used across the app to an appropriate color variant.
 */
import type { CSSProperties, ReactNode } from 'react'
import { colors, fonts, radius } from '../../theme/tokens'

export type BadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

export interface BadgeProps {
  /** Color variant. Defaults to `neutral`. */
  variant?: BadgeVariant
  children: ReactNode
  style?: CSSProperties
  className?: string
}

interface VariantColors {
  background: string
  color: string
  border: string
}

/**
 * Monochrome status palette. To stay within the Swiss-minimalist "Canvas and
 * Ink" language, positive/active states render as solid ink chips, neutral and
 * in-progress states as light wells, and only destructive/error states carry a
 * restrained red. Hierarchy comes from value (fill vs. outline), not hue.
 */
const VARIANT_COLORS: Record<BadgeVariant, VariantColors> = {
  neutral: { background: colors.surfaceMuted, color: colors.slate, border: colors.hairline },
  info: { background: colors.surface, color: colors.ink, border: colors.ink },
  success: { background: colors.ink, color: colors.onInk, border: colors.ink },
  warning: { background: colors.surfaceMuted, color: colors.inkSoft, border: colors.hairlineStrong },
  danger: {
    background: colors.dangerSurface,
    color: colors.onDangerSurface,
    border: colors.dangerSurface
  }
}

/**
 * Maps a domain status string (voucher / order / account / code statuses) to a
 * badge variant. Unknown values fall back to `neutral`.
 */
export function variantForStatus(status: string): BadgeVariant {
  switch (status.toUpperCase()) {
    case 'APPROVED':
    case 'ACTIVE':
    case 'PAID':
    case 'USED':
      return 'success'
    case 'PENDING_APPROVAL':
    case 'PENDING_PAYMENT':
    case 'DRAFT':
      return 'warning'
    case 'REJECTED':
    case 'CANCELLED':
    case 'LOCKED':
    case 'EXPIRED':
      return 'danger'
    case 'PAUSED':
    case 'APPROVED_PARTNER':
      return 'info'
    default:
      return 'neutral'
  }
}

export function Badge({ variant = 'neutral', children, style, className }: BadgeProps) {
  const c = VARIANT_COLORS[variant]

  const badgeStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 12px',
    fontFamily: fonts.display,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    lineHeight: 1.5,
    borderRadius: radius.full,
    background: c.background,
    color: c.color,
    border: `1px solid ${c.border}`,
    whiteSpace: 'nowrap',
    ...style
  }

  return (
    <span className={className} style={badgeStyle}>
      {children}
    </span>
  )
}

export default Badge
