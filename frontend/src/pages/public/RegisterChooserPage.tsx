/**
 * RegisterChooserPage — account-type selection for `/register`.
 *
 * Restyled to the VoucherHub design system: a centered editorial heading over
 * two side-by-side floating cards (Customer / Partner), each with a line icon,
 * title, description and an ink pill CTA. Collapses to a single column on
 * narrow viewports.
 */
import { Link } from 'react-router-dom'
import type { CSSProperties, ReactNode } from 'react'
import { useState } from 'react'
import { colors, fonts, radius, shadows, spacing } from '../../theme/tokens'

/** A price-tag line icon for the customer card. */
function TagIcon() {
  return (
    <svg
      width='56'
      height='56'
      viewBox='0 0 24 24'
      fill='none'
      stroke={colors.ink}
      strokeWidth='1.4'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
    >
      <path d='M20.59 13.41 13.42 20.59a2 2 0 0 1-2.83 0L3 13V3h10l7.59 7.59a2 2 0 0 1 0 2.82Z' />
      <circle cx='7.5' cy='7.5' r='1.5' />
      <path d='M9.5 13.5 11 12M11 15l1.5-1.5' />
    </svg>
  )
}

/** A storefront/handshake line icon for the partner card. */
function StoreIcon() {
  return (
    <svg
      width='56'
      height='56'
      viewBox='0 0 24 24'
      fill='none'
      stroke={colors.ink}
      strokeWidth='1.4'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
    >
      <path d='M3 9 4.5 4h15L21 9' />
      <path d='M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0Z' />
      <path d='M4 11v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8' />
      <path d='M8 20v-4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4' />
    </svg>
  )
}

interface ChoiceCardProps {
  icon: ReactNode
  title: string
  description: string
  to: string
  ctaLabel: string
}

function ChoiceCard({ icon, title, description, to, ctaLabel }: ChoiceCardProps) {
  const [hover, setHover] = useState(false)
  return (
    <Link
      to={to}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...cardStyle,
        transform: hover ? 'translateY(-4px)' : 'none',
        boxShadow: hover ? shadows.cardHover : shadows.card
      }}
    >
      <div style={iconWrapStyle}>{icon}</div>
      <h2 style={cardTitleStyle}>{title}</h2>
      <p style={cardDescStyle}>{description}</p>
      <span style={ctaStyle}>
        {ctaLabel}
        <span aria-hidden='true' style={ctaArrowStyle}>
          →
        </span>
      </span>
    </Link>
  )
}

export function RegisterChooserPage() {
  return (
    <div style={{ maxWidth: 860, margin: '0 auto', paddingTop: 24 }}>
      <header style={{ textAlign: 'center', marginBottom: spacing['2xl'] }}>
        <p style={eyebrowStyle}>● Bắt đầu</p>
        <h1 style={titleStyle}>Tạo tài khoản</h1>
        <p style={subtitleStyle}>Chọn loại tài khoản phù hợp với nhu cầu của bạn.</p>
      </header>

      <div style={gridStyle}>
        <ChoiceCard
          icon={<TagIcon />}
          title='Đăng ký khách hàng'
          description='Khám phá và mua voucher từ các đối tác trên hệ thống.'
          to='/register/customer'
          ctaLabel='Tiếp tục với khách hàng'
        />
        <ChoiceCard
          icon={<StoreIcon />}
          title='Đăng ký đối tác'
          description='Đăng bán voucher và tiếp cận thêm khách hàng cho doanh nghiệp.'
          to='/partner/register'
          ctaLabel='Tiếp tục với đối tác'
        />
      </div>

      <p
        style={{
          textAlign: 'center',
          marginTop: spacing.xl,
          fontSize: 14,
          color: colors.slate,
          fontFamily: fonts.body
        }}
      >
        Đã có tài khoản?{' '}
        <Link to='/login' style={{ color: colors.ink, fontWeight: 600 }}>
          Đăng nhập
        </Link>
      </p>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                     */
/* -------------------------------------------------------------------------- */

const eyebrowStyle: CSSProperties = {
  margin: '0 0 12px',
  fontFamily: fonts.display,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: colors.slate
}

const titleStyle: CSSProperties = {
  margin: 0,
  fontFamily: fonts.display,
  fontSize: 'clamp(32px, 5vw, 48px)',
  fontWeight: 800,
  letterSpacing: '-0.03em',
  color: colors.ink
}

const subtitleStyle: CSSProperties = {
  margin: '14px 0 0',
  fontFamily: fonts.body,
  fontSize: 16,
  color: colors.slate
}

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: spacing.lg
}

const cardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  gap: 16,
  padding: '40px 28px',
  background: colors.surface,
  border: `1px solid ${colors.hairline}`,
  borderRadius: radius.xl,
  boxShadow: shadows.card,
  textDecoration: 'none',
  color: 'inherit',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
}

const iconWrapStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 96,
  height: 96,
  borderRadius: radius.full,
  background: colors.surfaceMuted,
  marginBottom: 4
}

const cardTitleStyle: CSSProperties = {
  margin: 0,
  fontFamily: fonts.display,
  fontSize: 24,
  fontWeight: 700,
  letterSpacing: '-0.02em',
  color: colors.ink
}

const cardDescStyle: CSSProperties = {
  margin: 0,
  maxWidth: 260,
  fontFamily: fonts.body,
  fontSize: 15,
  lineHeight: 1.6,
  color: colors.slate
}

const ctaStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  width: '100%',
  marginTop: 8,
  padding: '14px 22px',
  borderRadius: radius.full,
  background: colors.ink,
  color: colors.onInk,
  fontFamily: fonts.display,
  fontSize: 14,
  fontWeight: 600,
  letterSpacing: '0.01em'
}

const ctaArrowStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 20,
  height: 20,
  borderRadius: radius.full,
  background: colors.onInk,
  color: colors.ink,
  fontSize: 12
}

export default RegisterChooserPage
