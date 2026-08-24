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
        padding: `${spacing.lg}px ${spacing.lg}px`,
        borderTop: `1px solid ${colors.hairline}`,
        overflow: 'hidden'
      }}
    >
      {/* Keep the brand watermark only in the footer and deliberately compact. */}
      <div
        aria-hidden='true'
        style={{
          fontFamily: fonts.display,
          fontWeight: 900,
          fontSize: 'clamp(24px, 3vw, 36px)',
          lineHeight: 1,
          letterSpacing: '-0.05em',
          color: colors.canvasDim,
          userSelect: 'none',
          marginBottom: spacing.md
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
          <Link to='/policy' style={{ color: 'inherit' }}>
            Chính sách & Quy định
          </Link>
          <Link to='/faq' style={{ color: 'inherit' }}>
            Hỏi đáp (FAQ)
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
