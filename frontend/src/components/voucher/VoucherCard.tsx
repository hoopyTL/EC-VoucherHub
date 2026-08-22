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

function categoryBadgeColor(category: string): string {
  const normalized = category.toLocaleLowerCase('vi')
  if (normalized.includes('du lịch')) return '#556B5D'
  if (normalized.includes('giải trí')) return '#6B5B73'
  if (normalized.includes('làm đẹp')) return '#8A5D62'
  if (normalized.includes('cà phê')) return '#71543B'
  if (normalized.includes('buffet')) return '#8A4F3D'
  if (normalized.includes('ăn uống')) return '#9A642F'
  if (normalized.includes('mua sắm')) return '#4F6B58'
  return '#5F594E'
}

export function VoucherCard({ voucher }: VoucherCardProps) {
  const remaining = voucher.totalQuantity - voucher.soldQuantity
  const discountPercent = Math.max(0, Math.round((1 - Number(voucher.salePrice) / Number(voucher.originalPrice)) * 100))
  const [hover, setHover] = useState(false)

  // Flash sale: when active, the effective price replaces the sale price (the
  // original stays struck-through) and a countdown badge is shown.
  const flashActive = Boolean(voucher.flashSale?.active && voucher.flashSale.flashSaleEnd)
  const effectiveSalePrice = flashActive ? (voucher.flashSale!.effectivePrice as number) : voucher.salePrice
  const spriteCell = voucher.imageUrl?.startsWith('/assets/voucher-catalogue-sprite.png')
    ? Number(new URL(voucher.imageUrl, window.location.origin).searchParams.get('cell'))
    : null

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
      aria-label={`Xem voucher: ${voucher.title}`}
      data-testid='voucher-card'
      className='voucher-ticket'
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
        {spriteCell !== null && Number.isFinite(spriteCell) && (
          <div
            role='img'
            aria-label={`Ảnh ${voucher.title}`}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: "url('/assets/voucher-catalogue-sprite.png')",
              backgroundSize: '1000% auto',
              backgroundPosition: `${((spriteCell % 10) * 100) / 9}% ${(Math.floor(spriteCell / 10) * 100) / 6}%`,
              backgroundRepeat: 'no-repeat',
              transform: hover ? 'scale(1.08)' : 'scale(1)',
              transition: 'transform .5s ease'
            }}
          />
        )}
        {voucher.imageUrl && spriteCell === null && (
          <img
            src={voucher.imageUrl}
            alt=''
            loading='lazy'
            onError={(event) => {
              event.currentTarget.style.display = 'none'
            }}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: hover ? 'scale(1.08)' : 'none',
              transition: 'transform 0.5s ease'
            }}
          />
        )}
        <div
          aria-hidden='true'
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.18) 0%, transparent 42%, rgba(0,0,0,0.5) 100%)',
            pointerEvents: 'none'
          }}
        />
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
            background: categoryBadgeColor(voucher.category),
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
          <Badge variant={remaining > 0 ? 'success' : 'neutral'}>
            {remaining > 0 ? `Còn ${remaining}` : 'Hết hàng'}
          </Badge>
        </span>
        {flashActive && (
          <span style={{ position: 'absolute', bottom: 14, left: 14 }}>
            <FlashSaleBadge endsAt={voucher.flashSale!.flashSaleEnd as string} size='sm' />
          </span>
        )}
      </div>

      <div className='voucher-ticket__tear' aria-hidden='true'>
        <span className='voucher-ticket__stamp'>-{discountPercent}%</span>
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
          style={{ marginTop: 'auto', paddingTop: 8, fontFamily: fonts.mono }}
        />

        <p style={{ margin: 0, fontSize: 12, color: colors.slateMuted, fontFamily: fonts.body }}>
          Mở bán: {formatDateRange(voucher.salePeriodStart, voucher.salePeriodEnd)}
        </p>
      </div>
    </Link>
  )
}

export default VoucherCard
