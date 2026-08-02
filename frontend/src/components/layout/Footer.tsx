/**
 * Footer — global page footer.
 *
 * Restyled to the VoucherHub design system: a large ghost wordmark watermark
 * over a hairline-separated row of secondary links, on the canvas.
 */
import { Link } from 'react-router-dom'
import { colors, fonts, spacing } from '../../theme/tokens'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer
      style={{
        marginTop: 'auto',
        padding: `${spacing.xl}px ${spacing.lg}px ${spacing.lg}px`,
        borderTop: `1px solid ${colors.hairline}`,
        overflow: 'hidden'
      }}
    >
      {/* Oversized faint watermark, a hallmark of the design language. */}
      <div
        aria-hidden='true'
        style={{
          fontFamily: fonts.display,
          fontWeight: 900,
          fontSize: 'clamp(64px, 14vw, 160px)',
          lineHeight: 0.9,
          letterSpacing: '-0.05em',
          color: colors.canvasDim,
          userSelect: 'none',
          marginBottom: spacing.lg
        }}
      >
        VoucherHub
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: spacing.md,
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: fonts.body,
          fontSize: 13,
          color: colors.slate
        }}
      >
        <span>© {year} VoucherHub. Bảo lưu mọi quyền.</span>
        <nav aria-label='Liên kết cuối trang' style={{ display: 'flex', gap: spacing.lg, flexWrap: 'wrap' }}>
          <Link to='/search' style={{ color: 'inherit' }}>
            Khám phá voucher
          </Link>
          <Link to='/login' style={{ color: 'inherit' }}>
            Đăng nhập đối tác
          </Link>
          <a href='#top' style={{ color: 'inherit' }} aria-label='Về đầu trang'>
            Về đầu trang
          </a>
        </nav>
      </div>
    </footer>
  )
}

export default Footer
