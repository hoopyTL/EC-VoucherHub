/**
 * ForgotPasswordPage — request a password reset link (task 11.x — Req 2.4).
 *
 * Renders an email/phone field and submits to `POST /auth/password-reset`. To
 * avoid account enumeration the page always shows the SAME generic confirmation
 * message regardless of whether the account exists — it never branches on the
 * outcome (Requirement 2.4).
 *
 * TASK-004 only simulates requesting a reset code. Completion is intentionally
 * not exposed until the backend has a secure reset-token lifecycle.
 *
 * Mirrors the centered-card editorial style of {@link LoginPage}.
 *
 * _Requirements: 2.4_
 */
import { useState, type CSSProperties, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { forgotPassword, getAuthApiError } from '../../services/auth'
import { colors, fonts, radius, shadows } from '../../theme/tokens'

export function ForgotPasswordPage() {
  const [emailOrPhone, setEmailOrPhone] = useState('')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)

    const trimmed = emailOrPhone.trim()
    if (!trimmed) {
      setErrorMessage('Vui lòng nhập email hoặc số điện thoại.')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await forgotPassword(trimmed)
      // Surface the backend's generic message verbatim — never reveal whether
      // the account exists (Req 2.4).
      setSuccessMessage(result.message)
    } catch (err) {
      setErrorMessage(getAuthApiError(err, 'Không thể xử lý yêu cầu. Vui lòng thử lại.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section style={sectionStyle}>
      <p style={eyebrowStyle}>● KHÔI PHỤC MẬT KHẨU</p>
      <h1 style={titleStyle}>Quên mật khẩu?</h1>
      <p style={{ marginTop: 0, marginBottom: 28, color: colors.slate, fontSize: 16 }}>
        Nhập email hoặc số điện thoại để nhận hướng dẫn đặt lại mật khẩu.
      </p>

      {successMessage ? (
        <>
          <div role='status' style={successStyle}>
            {successMessage}
          </div>

          <p style={{ marginTop: 24, fontSize: 14, color: colors.slate }}>
            <Link to='/login' style={{ color: colors.ink, fontWeight: 600 }}>
              Quay lại đăng nhập
            </Link>
          </p>
        </>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          {errorMessage && (
            <div role='alert' style={alertStyle}>
              {errorMessage}
            </div>
          )}

          <div style={{ marginBottom: 24 }}>
            <Input
              label='Email hoặc số điện thoại'
              name='emailOrPhone'
              type='text'
              autoComplete='username'
              value={emailOrPhone}
              onChange={(e) => setEmailOrPhone(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <Button type='submit' fullWidth isLoading={isSubmitting} withArrow>
            Gửi yêu cầu khôi phục
          </Button>

          <p style={{ marginTop: 24, fontSize: 14, color: colors.slate }}>
            Đã nhớ mật khẩu?{' '}
            <Link to='/login' style={{ color: colors.ink, fontWeight: 600 }}>
              Quay lại đăng nhập
            </Link>
          </p>
        </form>
      )}
    </section>
  )
}

const sectionStyle: CSSProperties = {
  maxWidth: 440,
  margin: '24px auto',
  padding: 40,
  background: colors.surface,
  border: `1px solid ${colors.hairline}`,
  borderRadius: radius.xl,
  boxShadow: shadows.card
}

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
  marginTop: 0,
  marginBottom: 8,
  fontFamily: fonts.display,
  fontSize: 40,
  fontWeight: 800,
  letterSpacing: '-0.03em',
  color: colors.ink
}

const alertStyle: CSSProperties = {
  marginBottom: 20,
  padding: '12px 16px',
  borderRadius: radius.md,
  background: colors.dangerSurface,
  border: `1px solid ${colors.dangerSurface}`,
  color: colors.onDangerSurface,
  fontSize: 14
}

const successStyle: CSSProperties = {
  padding: '12px 16px',
  borderRadius: radius.md,
  background: colors.successSurface,
  border: `1px solid ${colors.hairline}`,
  color: colors.onSuccessSurface,
  fontSize: 14
}

export default ForgotPasswordPage
