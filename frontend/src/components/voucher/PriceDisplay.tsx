/**
 * PriceDisplay — shows a voucher's sale price alongside its struck-through
 * original price and a discount percentage badge (task 12.1).
 *
 * Used by both the voucher card (compact) and the detail page (large). The
 * discount percentage is computed from the two prices when not supplied
 * explicitly, so callers can pass the server-provided `discountPercentage`
 * (detail view) or let the component derive it (list view).
 *
 * _Requirements: 12.1_
 */
import type { CSSProperties } from 'react'
import { discountPercent, formatCurrency } from '../../utils/format'
import { colors, fonts, radius } from '../../theme/tokens'

export interface PriceDisplayProps {
  /** Original (pre-discount) price — Decimal string or number. */
  originalPrice: string | number
  /** Discounted sale price — Decimal string or number. */
  salePrice: string | number
  /** Pre-computed discount percentage; derived from the prices when omitted. */
  discountPercentage?: number
  /** Visual scale. `lg` is used on the detail page. Defaults to `md`. */
  size?: 'md' | 'lg'
  style?: CSSProperties
}

export function PriceDisplay({ originalPrice, salePrice, discountPercentage, size = 'md', style }: PriceDisplayProps) {
  const percent = discountPercentage ?? discountPercent(originalPrice, salePrice)
  const saleFontSize = size === 'lg' ? 34 : 20
  const originalFontSize = size === 'lg' ? 16 : 13

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        flexWrap: 'wrap',
        gap: 10,
        ...style
      }}
    >
      <span
        data-testid='sale-price'
        style={{
          fontFamily: fonts.display,
          fontSize: saleFontSize,
          fontWeight: 800,
          letterSpacing: '-0.02em',
          color: colors.ink
        }}
      >
        {formatCurrency(salePrice)}
      </span>

      {percent > 0 && (
        <>
          <span
            data-testid='original-price'
            style={{
              fontFamily: fonts.body,
              fontSize: originalFontSize,
              color: colors.slateMuted,
              textDecoration: 'line-through'
            }}
          >
            {formatCurrency(originalPrice)}
          </span>
          <span
            data-testid='discount-badge'
            style={{
              fontFamily: fonts.display,
              fontSize: originalFontSize,
              fontWeight: 700,
              letterSpacing: '0.02em',
              color: colors.onInk,
              background: colors.ink,
              borderRadius: radius.full,
              padding: '2px 10px'
            }}
          >
            -{percent}%
          </span>
        </>
      )}
    </div>
  )
}

export default PriceDisplay
