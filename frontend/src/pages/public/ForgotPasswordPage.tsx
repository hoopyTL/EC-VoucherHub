/**
 * ForgotPasswordPage — request a password reset link (task 11.x — Req 2.4).
 *
 * Renders an email/phone field and submits to `POST /auth/password-reset`. To
 * avoid account enumeration the page always shows the SAME generic confirmation
 * message regardless of whether the account exists — it never branches on the
 * outcome (Requirement 2.4).
 *
 * For local/demo environments the backend returns the `resetToken` in the
 * response (it is omitted in production). When present, a clearly-labelled
 * "Demo only" helper links straight to `/reset-password?token=…` so the flow
 * can be exercised without real email/SMS delivery.
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
  const [resetToken, setResetToken] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)

    const trimmed = emailOrPhone.trim()
    if (!trimmed) {
      setErrorMessage('Please enter your email or phone.')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await forgotPassword(trimmed)
      // Surface the backend's generic message verbatim — never reveal whether
      // the account exists (Req 2.4).
      setSuccessMessage(result.message)
      setResetToken(result.resetToken ?? null)
    } catch (err) {
      setErrorMessage(getAuthApiError(err, 'Unable to process your request. Please try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section style={sectionStyle}>
      <p style={eyebrowStyle}>● Reset password</p>
      <h1 style={titleStyle}>Forgot your password?</h1>
      <p style={{ marginTop: 0, marginBottom: 28, color: colors.slate, fontSize: 16 }}>
        Enter your email or phone and we&apos;ll send you a link to reset it.
      </p>

      {successMessage ? (
        <>
          <div role='status' style={successStyle}>
            {successMessage}
          </div>

          {resetToken && (
            <div style={demoStyle}>
              <p style={demoLabelStyle}>Demo only</p>
              <p style={{ margin: '0 0 10px', fontSize: 14, color: colors.slate }}>
                A reset link is normally delivered by email or SMS. In this demo environment you can continue directly:
              </p>
              <Link
                to={`/reset-password?token=${encodeURIComponent(resetToken)}`}
                style={{ color: colors.ink, fontWeight: 600, fontSize: 14 }}
              >
                Continue to reset password →
              </Link>
            </div>
          )}

          <p style={{ marginTop: 24, fontSize: 14, color: colors.slate }}>
            <Link to='/login' style={{ color: colors.ink, fontWeight: 600 }}>
              Back to log in
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
              label='Email or phone'
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
            Send reset link
          </Button>

          <p style={{ marginTop: 24, fontSize: 14, color: colors.slate }}>
            Remembered it?{' '}
            <Link to='/login' style={{ color: colors.ink, fontWeight: 600 }}>
              Back to log in
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

const demoStyle: CSSProperties = {
  marginTop: 16,
  padding: '14px 16px',
  borderRadius: radius.md,
  background: colors.surfaceMuted,
  border: `1px dashed ${colors.hairlineStrong}`
}

const demoLabelStyle: CSSProperties = {
  margin: '0 0 6px',
  fontFamily: fonts.display,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: colors.slateMuted
}

export default ForgotPasswordPage
