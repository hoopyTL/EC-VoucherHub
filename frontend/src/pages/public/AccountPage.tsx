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
import { Link, useSearchParams } from 'react-router-dom'
import { UserRole } from '@ui-contracts'
import { useAuth } from '../../hooks/useAuth'
import { Badge, Button, ConfirmDialog, Input, LoadingSpinner, useToast } from '../../components/ui'
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
  [UserRole.CUSTOMER]: 'Khách hàng',
  [UserRole.PARTNER]: 'Đối tác',
  [UserRole.STAFF]: 'Nhân viên đối tác',
  [UserRole.ADMIN]: 'Quản trị viên'
}

export function AccountPage() {
  const { user, updateProfile, logout } = useAuth()
  const toast = useToast()
  const [searchParams] = useSearchParams()

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
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>(() =>
    searchParams.get('tab') === 'security' ? 'security' : 'profile'
  )
  const [logoutOpen, setLogoutOpen] = useState(false)
  const initial = (fullName.trim().charAt(0) || user?.name?.charAt(0) || 'K').toLocaleUpperCase('vi')

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
        setProfileError(getAuthApiError(err, 'Không thể tải hồ sơ của bạn.'))
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
      setProfileError('Họ và tên không được để trống.')
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
      toast.success('Cập nhật hồ sơ thành công.')
    } catch (err) {
      setProfileError(getAuthApiError(err, 'Không thể cập nhật hồ sơ. Vui lòng thử lại.'))
    } finally {
      setIsProfileSubmitting(false)
    }
  }

  /** Validate the form locally. Returns the collected field errors. */
  function validate(): FieldErrors {
    const errors: FieldErrors = {}
    if (!currentPassword) {
      errors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại.'
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      errors.newPassword = `Mật khẩu phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`
    }
    if (confirmNewPassword !== newPassword) {
      errors.confirmNewPassword = 'Mật khẩu xác nhận không khớp.'
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
      await changePassword(currentPassword, newPassword)
      toast.success('Đổi mật khẩu thành công.')
      // Clear the form on success so stale values aren't left on screen.
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
    } catch (err) {
      const message = getAuthApiError(err, 'Không thể đổi mật khẩu. Vui lòng thử lại.')
      toast.error(/current password is incorrect/i.test(message) ? 'Mật khẩu hiện tại không chính xác.' : message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section
      className={
        user?.role === UserRole.CUSTOMER
          ? 'customer-account-page customer-account-layout account-profile-page'
          : 'customer-account-page'
      }
      style={user?.role === UserRole.CUSTOMER ? undefined : { maxWidth: 760, margin: '24px auto' }}
    >
      {user?.role === UserRole.CUSTOMER && (
        <aside className='customer-account-sidebar' aria-label='Khu vực tài khoản'>
          <div aria-hidden='true' className='customer-account-avatar' style={profileAvatarStyle}>
            {initial}
          </div>
          <strong>Tài khoản của tôi</strong>
          <p>Quản lý thông tin, lịch sử mua hàng và voucher của bạn.</p>
          <nav aria-label='Điều hướng tài khoản'>
            <button
              type='button'
              className={activeTab === 'profile' ? 'is-current' : ''}
              onClick={() => setActiveTab('profile')}
            >
              Thông tin tài khoản
            </button>
            <Link to='/orders'>Lịch sử mua hàng</Link>
            <Link to='/my-vouchers'>Voucher của tôi</Link>
            <button
              type='button'
              className={activeTab === 'security' ? 'is-current' : ''}
              onClick={() => setActiveTab('security')}
            >
              Đổi mật khẩu
            </button>
          </nav>
          <div className='customer-account-member-badge'>Thành viên Bạc · 1.250 điểm</div>
          <button type='button' className='customer-account-logout' onClick={() => setLogoutOpen(true)}>
            Đăng xuất
          </button>
        </aside>
      )}
      <div className={user?.role === UserRole.CUSTOMER ? 'customer-account-content' : undefined}>
        {activeTab === 'profile' && (
          <>
            <div className='customer-account-hero' style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
                <div aria-hidden='true' style={profileAvatarStyle}>
                  {initial}
                </div>
                <div>
                  <p style={eyebrowStyle}>● Tài khoản khách hàng</p>
                  <h1 style={titleStyle}>{user?.name ?? 'Tài khoản của bạn'}</h1>
                  {user && <Badge variant='info'>{ROLE_LABELS[user.role] ?? user.role}</Badge>}
                </div>
              </div>
            </div>

            <div role='tabpanel' style={{ ...cardStyle, marginTop: 20 }}>
              <h2 style={subtitleStyle}>Thông tin hồ sơ</h2>
              <p style={{ marginTop: 0, marginBottom: 24, color: colors.slate, fontSize: 14 }}>
                Cập nhật thông tin liên hệ để nhận hỗ trợ và voucher thuận tiện hơn.
              </p>

              {isProfileLoading ? (
                <LoadingSpinner label='Đang tải hồ sơ' />
              ) : (
                <form onSubmit={handleProfileSubmit} noValidate>
                  {profileError && (
                    <div role='alert' style={alertStyle}>
                      {profileError}
                    </div>
                  )}
                  <div style={{ marginBottom: 16 }}>
                    <Input
                      label='👤  Họ và tên'
                      name='fullName'
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      disabled={isProfileSubmitting}
                      required
                    />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <Input
                      label='✉  Email'
                      name='email'
                      type='email'
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      disabled={isProfileSubmitting}
                    />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <Input
                      label='☎  Số điện thoại'
                      name='phone'
                      type='tel'
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      disabled={isProfileSubmitting}
                    />
                  </div>
                  <div style={{ marginBottom: 24 }}>
                    <Input
                      label='⌂  Địa chỉ'
                      name='address'
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                      disabled={isProfileSubmitting}
                    />
                  </div>
                  <Button type='submit' fullWidth isLoading={isProfileSubmitting}>
                    ✓ Lưu hồ sơ
                  </Button>
                </form>
              )}
            </div>
          </>
        )}

        {activeTab === 'security' && (
          <div role='tabpanel' style={{ ...cardStyle, marginTop: 0 }}>
            <h2 style={subtitleStyle}>Đổi mật khẩu</h2>
            <p style={{ marginTop: 0, marginBottom: 24, color: colors.slate, fontSize: 14 }}>
              Nhập mật khẩu hiện tại và chọn mật khẩu mới an toàn.
            </p>

            <form onSubmit={handlePasswordSubmit} noValidate>
              <div style={{ marginBottom: 16 }}>
                <Input
                  label='Mật khẩu hiện tại'
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
                  label='Mật khẩu mới'
                  name='newPassword'
                  type='password'
                  autoComplete='new-password'
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  error={fieldErrors.newPassword}
                  hint={`Ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <Input
                  label='Xác nhận mật khẩu mới'
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
                Đổi mật khẩu
              </Button>
            </form>
          </div>
        )}

        <ConfirmDialog
          open={logoutOpen}
          title='Đăng xuất VoucherHub?'
          message='Bạn có chắc muốn kết thúc phiên đăng nhập trên thiết bị này không?'
          cancelLabel='Ở lại'
          confirmLabel='Đăng xuất'
          danger
          onCancel={() => setLogoutOpen(false)}
          onConfirm={() => {
            setLogoutOpen(false)
            logout()
          }}
        />
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

const profileAvatarStyle: CSSProperties = {
  width: 86,
  height: 86,
  flex: '0 0 auto',
  display: 'grid',
  placeItems: 'center',
  borderRadius: '50%',
  background: colors.accentSurface,
  color: colors.accentHover,
  border: `2px solid ${colors.accent}`,
  fontFamily: fonts.display,
  fontSize: 36,
  fontWeight: 800
}

export default AccountPage
