/**
 * VoucherCard — compact catalogue tile for a single voucher (task 12.1).
 *
 * Restyled to the VoucherHub design system: a white, 24px-radius floating card
 * with a desaturated image header, a category micro-label, bold display title,
 * price block ({@link PriceDisplay}) and a remaining-inventory chip. The whole
 * card links to the voucher detail page (Req 12.1) and lifts subtly on hover.
 *
 * _Requirements: 11.1, 12.1_
 */
import { Link } from 'react-router-dom'
import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Badge } from '../ui/Badge'
import { PriceDisplay } from './PriceDisplay'
import { FlashSaleBadge } from './FlashSaleBadge'
import { formatDateRange } from '../../utils/format'
import type { VoucherListItem } from '../../services/voucher.service'
import { colors, fonts, radius, shadows } from '../../theme/tokens'

export interface VoucherCardProps {
  voucher: VoucherListItem
}

const cardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  borderRadius: radius.xl,
  border: `1px solid ${colors.hairline}`,
  background: colors.surface,
  textDecoration: 'none',
  color: 'inherit',
  boxSizing: 'border-box',
  overflow: 'hidden',
  boxShadow: shadows.card,
  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
}

/**
 * Deterministic desaturated gradient header derived from the voucher id, so
 * each card has a stable "photographic" feel until real imagery is wired in.
 */
function headerGradient(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 360
  const a = hash % 18 // near-grayscale lightness shift
  return `linear-gradient(135deg, hsl(${hash}, 6%, ${24 + a}%), hsl(${(hash + 40) % 360}, 8%, ${12 + a}%))`
}

export function VoucherCard({ voucher }: VoucherCardProps) {
  const remaining = voucher.totalQuantity - voucher.soldQuantity
  const [hover, setHover] = useState(false)

  // Flash sale: when active, the effective price replaces the sale price (the
  // original stays struck-through) and a countdown badge is shown.
  const flashActive = Boolean(voucher.flashSale?.active && voucher.flashSale.flashSaleEnd)
  const effectiveSalePrice = flashActive ? (voucher.flashSale!.effectivePrice as number) : voucher.salePrice

  return (
    <Link
      to={`/vouchers/${voucher.id}`}
      style={{
        ...cardStyle,
        transform: hover ? 'translateY(-4px)' : 'none',
        boxShadow: hover ? shadows.cardHover : shadows.card
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={`View voucher: ${voucher.title}`}
      data-testid='voucher-card'
    >
      {/* Desaturated image header with the category micro-label overlaid. */}
      <div
        style={{
          position: 'relative',
          aspectRatio: '16 / 10',
          background: headerGradient(voucher.id),
          overflow: 'hidden'
        }}
      >
        {voucher.imageUrl && (
          <img
            src={voucher.imageUrl}
            alt=''
            loading='lazy'
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              // Desaturated, high-contrast per the design language; lifts on hover.
              filter: hover ? 'grayscale(40%) contrast(1.05)' : 'grayscale(70%) contrast(1.05)',
              transform: hover ? 'scale(1.04)' : 'none',
              transition: 'transform 0.3s ease, filter 0.3s ease'
            }}
          />
        )}
        <span
          style={{
            position: 'absolute',
            top: 14,
            left: 14,
            fontFamily: fonts.display,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: colors.onInk,
            background: 'rgba(11, 11, 11, 0.45)',
            backdropFilter: 'blur(6px)',
            borderRadius: radius.full,
            padding: '4px 12px'
          }}
        >
          {voucher.category}
        </span>
        <span
          style={{
            position: 'absolute',
            bottom: 14,
            right: 14
          }}
        >
          <Badge variant={remaining > 0 ? 'success' : 'danger'}>
            {remaining > 0 ? `Còn ${remaining}` : 'Hết hàng'}
          </Badge>
        </span>
        {flashActive && (
          <span style={{ position: 'absolute', bottom: 14, left: 14 }}>
            <FlashSaleBadge endsAt={voucher.flashSale!.flashSaleEnd as string} size='sm' />
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 20, flex: 1 }}>
        <p
          style={{
            margin: 0,
            fontFamily: fonts.display,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: colors.slateMuted
          }}
        >
          {voucher.partner.businessName}
        </p>

        <h3
          style={{
            margin: 0,
            fontFamily: fonts.display,
            fontSize: 19,
            fontWeight: 700,
            letterSpacing: '-0.01em',
            lineHeight: 1.25,
            color: colors.ink
          }}
        >
          {voucher.title}
        </h3>

        <PriceDisplay
          originalPrice={voucher.originalPrice}
          salePrice={effectiveSalePrice}
          style={{ marginTop: 'auto', paddingTop: 8 }}
        />

        <p style={{ margin: 0, fontSize: 12, color: colors.slateMuted, fontFamily: fonts.body }}>
          Mở bán: {formatDateRange(voucher.salePeriodStart, voucher.salePeriodEnd)}
        </p>
      </div>
    </Link>
  )
}

export default VoucherCard
