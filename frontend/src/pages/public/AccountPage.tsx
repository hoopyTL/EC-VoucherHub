/**
 * AccountPage — the signed-in user's profile + password management (Req 2.6).
 *
 * Available to ANY authenticated role (it is mounted behind a role-agnostic
 * `ProtectedRoute`). Shows the current user's name and role from
 * {@link useAuth}, a "Change password" form that calls
 * `PUT /auth/change-password`, and a log-out action.
 *
 * The change-password form validates locally (new password ≥ 8 characters and
 * matching confirmation) before calling the API, then reports success or the
 * backend error via a toast (Requirement 23.4). On success the form clears.
 *
 * Mirrors the centered-card editorial style of {@link LoginPage}.
 *
 * _Requirements: 2.6_
 */
import { useState, type CSSProperties, type FormEvent } from 'react'
import { UserRole } from '@ui-contracts'
import { useAuth } from '../../hooks/useAuth'
import { Badge, Button, Input, useToast } from '../../components/ui'
import { changePassword, getAuthApiError } from '../../services/auth'
import { colors, fonts, radius, shadows } from '../../theme/tokens'

/** Minimum password length enforced by the backend (Req 2.6 / 1.3). */
export const MIN_PASSWORD_LENGTH = 8

interface FieldErrors {
  currentPassword?: string
  newPassword?: string
  confirmNewPassword?: string
}

/** Human-readable label for each role. */
const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.CUSTOMER]: 'Customer',
  [UserRole.PARTNER]: 'Partner',
  [UserRole.ADMIN]: 'Administrator'
}

export function AccountPage() {
  const { user, logout } = useAuth()
  const toast = useToast()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  /** Validate the form locally. Returns the collected field errors. */
  function validate(): FieldErrors {
    const errors: FieldErrors = {}
    if (!currentPassword) {
      errors.currentPassword = 'Please enter your current password.'
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      errors.newPassword = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
    }
    if (confirmNewPassword !== newPassword) {
      errors.confirmNewPassword = 'Passwords do not match.'
    }
    return errors
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      return
    }

    setIsSubmitting(true)
    try {
      const result = await changePassword(currentPassword, newPassword)
      toast.success(result.message ?? 'Password changed successfully.')
      // Clear the form on success so stale values aren't left on screen.
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
    } catch (err) {
      toast.error(getAuthApiError(err, 'Unable to change your password. Please try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section style={{ maxWidth: 440, margin: '24px auto' }}>
      <div style={cardStyle}>
        <p style={eyebrowStyle}>● Account</p>
        <h1 style={titleStyle}>{user?.name ?? 'Your account'}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 14, color: colors.slate }}>Role</span>
          {user && <Badge variant='info'>{ROLE_LABELS[user.role] ?? user.role}</Badge>}
        </div>
      </div>

      <div style={{ ...cardStyle, marginTop: 24 }}>
        <h2 style={subtitleStyle}>Change password</h2>
        <p style={{ marginTop: 0, marginBottom: 24, color: colors.slate, fontSize: 14 }}>
          Enter your current password and choose a new one.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: 16 }}>
            <Input
              label='Current password'
              name='currentPassword'
              type='password'
              autoComplete='current-password'
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              error={fieldErrors.currentPassword}
              disabled={isSubmitting}
              required
            />
          </div>

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
              name='confirmNewPassword'
              type='password'
              autoComplete='new-password'
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              error={fieldErrors.confirmNewPassword}
              disabled={isSubmitting}
              required
            />
          </div>

          <Button type='submit' fullWidth isLoading={isSubmitting} withArrow>
            Change password
          </Button>
        </form>
      </div>

      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <Button variant='secondary' onClick={logout}>
          Log out
        </Button>
      </div>
    </section>
  )
}

const cardStyle: CSSProperties = {
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
  marginBottom: 16,
  fontFamily: fonts.display,
  fontSize: 36,
  fontWeight: 800,
  letterSpacing: '-0.03em',
  color: colors.ink
}

const subtitleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 8,
  fontFamily: fonts.display,
  fontSize: 22,
  fontWeight: 700,
  letterSpacing: '-0.01em',
  color: colors.ink
}

export default AccountPage
