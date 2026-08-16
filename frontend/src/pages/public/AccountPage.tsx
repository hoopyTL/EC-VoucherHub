/**
 * AccountPage — the signed-in user's profile + password management (Req 2.6).
 *
 * Available to ANY authenticated role (it is mounted behind a role-agnostic
 * `ProtectedRoute`). Loads and updates the backend profile through `/me`, shows
 * the current role, provides password management, and exposes log out.
 *
 * The change-password form validates locally (new password ≥ 8 characters and
 * matching confirmation) before calling the API, then reports success or the
 * backend error via a toast (Requirement 23.4). On success the form clears.
 *
 * Mirrors the centered-card editorial style of {@link LoginPage}.
 *
 * _Requirements: 2.6_
 */
import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { UserRole } from '@ui-contracts'
import { useAuth } from '../../hooks/useAuth'
import { Badge, Button, Input, LoadingSpinner, useToast } from '../../components/ui'
import { changePassword, getAuthApiError, getProfile } from '../../services/auth'
import { colors, fonts, radius, shadows } from '../../theme/tokens'

/** Minimum password length enforced by the backend (Req 2.6 / 1.3). */
export const MIN_PASSWORD_LENGTH = 8
const IS_DESIGN_PREVIEW = import.meta.env.VITE_DESIGN_PREVIEW === 'true'

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
  const { user, updateProfile, logout } = useAuth()
  const toast = useToast()

  const [fullName, setFullName] = useState(user?.name ?? '')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [profileError, setProfileError] = useState<string | null>(null)
  const [isProfileLoading, setIsProfileLoading] = useState(true)
  const [isProfileSubmitting, setIsProfileSubmitting] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (IS_DESIGN_PREVIEW) {
      setIsProfileLoading(false)
      return
    }
    let active = true
    void getProfile()
      .then((profile) => {
        if (!active) return
        setFullName(profile.fullName)
        setEmail(profile.email ?? '')
        setPhone(profile.phone ?? '')
        setAddress(profile.address ?? '')
      })
      .catch((err) => {
        if (!active) return
        setProfileError(getAuthApiError(err, 'Unable to load your profile.'))
      })
      .finally(() => {
        if (active) setIsProfileLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedName = fullName.trim()
    if (!normalizedName) {
      setProfileError('Full name is required.')
      return
    }

    setProfileError(null)
    setIsProfileSubmitting(true)
    try {
      const profile = await updateProfile({
        fullName: normalizedName,
        ...(email.trim() && { email: email.trim() }),
        ...(phone.trim() && { phone: phone.trim() }),
        address: address.trim()
      })
      setFullName(profile.fullName)
      setEmail(profile.email ?? '')
      setPhone(profile.phone ?? '')
      setAddress(profile.address ?? '')
      toast.success('Profile updated successfully.')
    } catch (err) {
      setProfileError(getAuthApiError(err, 'Unable to update your profile. Please try again.'))
    } finally {
      setIsProfileSubmitting(false)
    }
  }

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

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
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
        <h2 style={subtitleStyle}>Profile details</h2>
        <p style={{ marginTop: 0, marginBottom: 24, color: colors.slate, fontSize: 14 }}>
          Keep your contact information up to date.
        </p>

        {isProfileLoading ? (
          <LoadingSpinner label='Loading profile' />
        ) : (
          <form onSubmit={handleProfileSubmit} noValidate>
            {profileError && (
              <div role='alert' style={alertStyle}>
                {profileError}
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <Input
                label='Full name'
                name='fullName'
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                disabled={isProfileSubmitting}
                required
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <Input
                label='Email'
                name='email'
                type='email'
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isProfileSubmitting}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <Input
                label='Phone'
                name='phone'
                type='tel'
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                disabled={isProfileSubmitting}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <Input
                label='Address'
                name='address'
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                disabled={isProfileSubmitting}
              />
            </div>
            <Button type='submit' fullWidth isLoading={isProfileSubmitting}>
              Save profile
            </Button>
          </form>
        )}
      </div>

      <div style={{ ...cardStyle, marginTop: 24 }}>
        <h2 style={subtitleStyle}>Change password</h2>
        <p style={{ marginTop: 0, marginBottom: 24, color: colors.slate, fontSize: 14 }}>
          Enter your current password and choose a new one.
        </p>

        <form onSubmit={handlePasswordSubmit} noValidate>
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

const alertStyle: CSSProperties = {
  marginBottom: 20,
  padding: '12px 16px',
  borderRadius: radius.md,
  background: colors.dangerSurface,
  color: colors.onDangerSurface,
  fontSize: 14
}

export default AccountPage
