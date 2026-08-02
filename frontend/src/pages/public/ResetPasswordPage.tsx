/**
 * ResetPasswordPage — set a new password from a reset link (task 11.x — Req 2.5).
 *
 * Reads the single-use `token` from the query string (delivered via the
 * forgot-password link) and submits it together with the new password to
 * `POST /auth/reset-password`. The client validates that the new password is at
 * least 8 characters (matching the backend rule) and that the confirmation
 * matches before calling the API.
 *
 * On success it shows a confirmation with a link to `/login`. Invalid or
 * expired tokens (HTTP 400 from the backend) are surfaced inline so the user
 * can request a fresh link.
 *
 * Mirrors the centered-card editorial style of {@link LoginPage}.
 *
 * _Requirements: 2.5_
 */
import { useState, type CSSProperties, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { getAuthApiError, resetPassword } from '../../services/auth'
import { colors, fonts, radius, shadows } from '../../theme/tokens'

/** Minimum password length enforced by the backend (Req 2.5 / 1.3). */
export const MIN_PASSWORD_LENGTH = 8

interface FieldErrors {
  newPassword?: string
  confirmPassword?: string
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDone, setIsDone] = useState(false)

  /** Validate the form locally. Returns the collected field errors. */
  function validate(): FieldErrors {
    const errors: FieldErrors = {}
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      errors.newPassword = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
    }
    if (confirmPassword !== newPassword) {
      errors.confirmPassword = 'Passwords do not match.'
    }
    return errors
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)

    if (!token) {
      setErrorMessage('This reset link is missing its token. Please request a new link.')
      return
    }

    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      return
    }

    setIsSubmitting(true)
    try {
      await resetPassword(token, newPassword)
      setIsDone(true)
    } catch (err) {
      setErrorMessage(getAuthApiError(err, 'Unable to reset your password. The link may be invalid or expired.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section style={sectionStyle}>
      <p style={eyebrowStyle}>● Reset password</p>
      <h1 style={titleStyle}>Choose a new password</h1>

      {isDone ? (
        <>
          <p style={{ marginTop: 0, marginBottom: 20, color: colors.slate, fontSize: 16 }}>
            Your password has been reset.
          </p>
          <div role='status' style={successStyle}>
            Password has been reset successfully. You can now log in with your new password.
          </div>
          <p style={{ marginTop: 24, fontSize: 14, color: colors.slate }}>
            <Link to='/login' style={{ color: colors.ink, fontWeight: 600 }}>
              Continue to log in →
            </Link>
          </p>
        </>
      ) : (
        <>
          <p style={{ marginTop: 0, marginBottom: 28, color: colors.slate, fontSize: 16 }}>
            Enter and confirm your new password below.
          </p>

          <form onSubmit={handleSubmit} noValidate>
            {errorMessage && (
              <div role='alert' style={alertStyle}>
                {errorMessage}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <Input
                label='New password'
                name='newPassword'
                type='password'
                autoComplete='new-password'
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                error={fieldErrors.newPassword}
                hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
                disabled={isSubmitting}
                required
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <Input
                label='Confirm new password'
                name='confirmPassword'
                type='password'
                autoComplete='new-password'
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={fieldErrors.confirmPassword}
                disabled={isSubmitting}
                required
              />
            </div>

            <Button type='submit' fullWidth isLoading={isSubmitting} withArrow>
              Reset password
            </Button>
          </form>

          <p style={{ marginTop: 24, fontSize: 14, color: colors.slate }}>
            <Link to='/login' style={{ color: colors.ink, fontWeight: 600 }}>
              Back to log in
            </Link>
          </p>
        </>
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

export default ResetPasswordPage
