/**
 * LoginPage — authentication form for all roles (task 11.1).
 *
 * Renders an email/phone + password form, delegates authentication to the
 * `useAuth().login` action (which stores the JWT and updates global auth
 * state), then redirects the user based on their role — or back to the page
 * they were trying to reach before being bounced to `/login`.
 *
 * Error handling follows Requirements 2.2 / 5.5: a failed login surfaces a
 * single message that never reveals which field was wrong. The backend already
 * returns a deliberately generic credentials message ("Invalid email/phone or
 * password"); account-status messages (locked / rejected) are surfaced as-is so
 * the user understands why access is denied.
 *
 * _Requirements: 2.1, 2.2, 4.1, 5.5_
 */
import { useState, type CSSProperties, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { LoginRequest } from '@ui-contracts'
import { useAuth } from '../../hooks/useAuth'
import { roleHomePath } from '../../components/layout/ProtectedRoute'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { colors, fonts, radius, shadows } from '../../theme/tokens'

/** Fallback message shown when the failure cannot be attributed to a specific,
 * user-safe backend message. Intentionally generic (does not reveal the field). */
const GENERIC_LOGIN_ERROR = 'Email, số điện thoại hoặc mật khẩu không chính xác.'

/** Shape of the structured error body returned by the backend error handler. */
interface ApiErrorBody {
  error?: { code?: string; message?: string }
}

/**
 * Derives a user-facing error message from a failed login.
 *
 * The server returns `{ error: { code, message } }` for known failures. Its
 * messages are designed to be safe to display (e.g. a generic credentials
 * message that does not reveal which field is wrong, plus locked/rejected
 * account notices). We surface those directly. Anything else (network error,
 * unexpected 500) collapses to the generic message so we never leak internals
 * or hint at which field failed.
 */
function resolveLoginError(err: unknown): string {
  const response = (err as { response?: { status?: number; data?: ApiErrorBody } })?.response

  if (!response) {
    // No response → network/timeout error rather than a credential rejection.
    return 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối và thử lại.'
  }

  const apiError = response.data?.error

  if (response.status === 429) {
    return apiError?.message ?? 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.'
  }

  // 401 covers invalid credentials, locked accounts, and rejected partners.
  // These backend messages are already safe/generic, so surface them as-is.
  if (apiError?.message) {
    return apiError.message
  }

  return GENERIC_LOGIN_ERROR
}

/** Resolves the path to send the user to after a successful login. */
function resolveRedirectPath(from: unknown, role: Parameters<typeof roleHomePath>[0]): string {
  // ProtectedRoute stores the attempted location as `state.from` (a location
  // object). Honor it so users return to where they were headed.
  if (typeof from === 'string' && from.startsWith('/')) {
    return from
  }
  if (from && typeof from === 'object' && typeof (from as { pathname?: unknown }).pathname === 'string') {
    const location = from as { pathname: string; search?: string; hash?: string }
    return `${location.pathname}${location.search ?? ''}${location.hash ?? ''}`
  }
  return roleHomePath(role)
}

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()

  const [emailOrPhone, setEmailOrPhone] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // When a guard (ProtectedRoute) bounced the visitor here, it stores the
  // attempted location in `state.from`. Surface a gentle notice so it's clear
  // why they're being asked to sign in.
  const redirectedFrom = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname
  const requiresLoginNotice = Boolean(redirectedFrom)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)

    const trimmed = emailOrPhone.trim()
    if (!trimmed || !password) {
      // Generic prompt — does not single out a specific field as "wrong".
      setErrorMessage('Vui lòng nhập email hoặc số điện thoại và mật khẩu.')
      return
    }

    const credentials: LoginRequest = { emailOrPhone: trimmed, password }

    setIsSubmitting(true)
    try {
      const user = await login(credentials)
      const from = (location.state as { from?: unknown } | null)?.from
      navigate(resolveRedirectPath(from, user.role), { replace: true })
    } catch (err) {
      setErrorMessage(resolveLoginError(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className='auth-form-page' style={sectionStyle}>
      <p
        style={{
          margin: '0 0 12px',
          fontFamily: fonts.display,
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: colors.slate
        }}
      >
        ● {t('auth.accountEyebrow')}
      </p>
      <h1
        style={{
          marginTop: 0,
          marginBottom: 8,
          fontFamily: fonts.display,
          fontSize: 40,
          fontWeight: 800,
          letterSpacing: '-0.03em',
          color: colors.ink
        }}
      >
        {t('auth.welcomeBack')}
      </h1>
      <p style={{ marginTop: 0, marginBottom: 28, color: colors.slate, fontSize: 16 }}>{t('auth.welcomeSubtitle')}</p>

      {requiresLoginNotice && !errorMessage && (
        <div role='status' style={noticeStyle}>
          {t('auth.loginRequiredNotice')}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {errorMessage && (
          <div role='alert' style={alertStyle}>
            {errorMessage}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <Input
            label={t('auth.emailOrPhone')}
            name='emailOrPhone'
            type='text'
            autoComplete='username'
            value={emailOrPhone}
            onChange={(e) => setEmailOrPhone(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <Input
            label={t('auth.password')}
            name='password'
            type='password'
            autoComplete='current-password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>

        <p style={{ margin: '0 0 24px', fontSize: 14, textAlign: 'right' }}>
          <Link to='/forgot-password' style={{ color: colors.ink, fontWeight: 600 }}>
            {t('auth.forgotPassword')}
          </Link>
        </p>

        <Button type='submit' fullWidth isLoading={isSubmitting} withArrow>
          {t('auth.logIn')}
        </Button>
      </form>

      <p style={{ marginTop: 24, fontSize: 14, color: colors.slate }}>
        {t('auth.noAccount')}{' '}
        <Link to='/register' style={{ color: colors.ink, fontWeight: 600 }}>
          {t('auth.signUp')}
        </Link>
      </p>
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

const alertStyle: CSSProperties = {
  marginBottom: 20,
  padding: '12px 16px',
  borderRadius: radius.md,
  background: colors.dangerSurface,
  border: `1px solid ${colors.dangerSurface}`,
  color: colors.onDangerSurface,
  fontSize: 14
}

const noticeStyle: CSSProperties = {
  marginBottom: 20,
  padding: '12px 16px',
  borderRadius: radius.md,
  background: colors.surfaceMuted,
  border: `1px solid ${colors.hairline}`,
  color: colors.ink,
  fontSize: 14
}

export default LoginPage
