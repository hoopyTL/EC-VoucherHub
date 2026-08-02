/**
 * RegisterCustomerPage — customer self-registration form (task 11.2).
 *
 * Collects a display name, a password, and at least one identifier (email or
 * phone). Posts to `POST /auth/register/customer` with a
 * {@link RegisterCustomerRequest} body.
 *
 * Client-side rules enforced here:
 *  - Password must be at least 8 characters (Requirement 1.3).
 *  - At least one of email / phone must be supplied (the server requires an
 *    identifier; we validate early to give immediate feedback).
 *
 * Duplicate-account errors (HTTP 409) returned by the backend are surfaced in a
 * prominent form-level alert (Requirements 1.1, 1.2).
 */
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import type { RegisterCustomerRequest } from '@ui-contracts'
import { api } from '../../services/api'
import { Button, Input } from '../../components/ui'
import { colors, fonts, radius, shadows } from '../../theme/tokens'
import type { CSSProperties } from 'react'

/** Minimum password length required at registration (Requirement 1.3). */
export const MIN_PASSWORD_LENGTH = 8

interface FieldErrors {
  name?: string
  identifier?: string
  password?: string
}

/**
 * Extracts a human-readable message (and HTTP status) from an unknown error,
 * understanding the API's `{ error: { code, message } }` envelope.
 */
function describeApiError(err: unknown, fallback: string): { status?: number; message: string } {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status
    const data = err.response?.data as { error?: { message?: string } } | undefined
    return { status, message: data?.error?.message ?? fallback }
  }
  return { message: fallback }
}

export function RegisterCustomerPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  // Referral code: prefilled from a `?ref=CODE` invite link (Phase 3), editable.
  const [referralCode, setReferralCode] = useState(() => searchParams.get('ref')?.trim().toUpperCase() ?? '')

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  /** Validate the form locally. Returns the collected field errors. */
  function validate(): FieldErrors {
    const errors: FieldErrors = {}

    if (!name.trim()) {
      errors.name = 'Please enter your name.'
    }
    if (!email.trim() && !phone.trim()) {
      errors.identifier = 'Enter an email or a phone number.'
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
    }

    return errors
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      return
    }

    const payload: RegisterCustomerRequest = {
      name: name.trim(),
      password,
      ...(email.trim() ? { email: email.trim() } : {}),
      ...(phone.trim() ? { phone: phone.trim() } : {}),
      ...(referralCode.trim() ? { referralCode: referralCode.trim() } : {})
    }

    setIsSubmitting(true)
    try {
      await api.post('/auth/register/customer', payload)
      // Registration succeeded — send the customer to the login page to sign in.
      navigate('/login', {
        replace: true,
        state: { registered: true, role: 'CUSTOMER' }
      })
    } catch (err) {
      const { status, message } = describeApiError(err, 'Registration failed. Please try again.')
      // 409 = duplicate email/phone (Requirement 1.2).
      setFormError(status === 409 ? message || 'An account with this email or phone number already exists.' : message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section style={sectionStyle}>
      <p style={eyebrowStyle}>● Account</p>
      <h1 style={headingStyle}>Create your customer account</h1>
      <p style={{ color: colors.slate, marginTop: 0, marginBottom: 28, fontSize: 16 }}>
        Register with your email or phone number to start buying vouchers.
      </p>

      {formError && (
        <div role='alert' style={alertStyle}>
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input
            label='Full name'
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={fieldErrors.name}
            required
            autoComplete='name'
          />
          <Input
            label='Email'
            type='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.identifier}
            hint='Provide an email or a phone number.'
            autoComplete='email'
          />
          <Input label='Phone' type='tel' value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete='tel' />
          <Input
            label='Password'
            type='password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
            hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
            required
            autoComplete='new-password'
          />
          <Input
            label='Referral code (optional)'
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
            hint='Got a code from a friend? Enter it to earn bonus points.'
            autoComplete='off'
          />
          <Button type='submit' isLoading={isSubmitting} fullWidth>
            Create account
          </Button>
        </div>
      </form>

      <p style={{ marginTop: 24, fontSize: 14, color: colors.slate }}>
        Already have an account?{' '}
        <Link to='/login' style={linkStyle}>
          Log in
        </Link>
      </p>
      <p style={{ marginTop: 4, fontSize: 14, color: colors.slate }}>
        Registering a business?{' '}
        <Link to='/register/partner' style={linkStyle}>
          Partner sign up
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

const eyebrowStyle: CSSProperties = {
  margin: '0 0 12px',
  fontFamily: fonts.display,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: colors.slate
}

const headingStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 8,
  fontFamily: fonts.display,
  fontSize: 32,
  fontWeight: 800,
  letterSpacing: '-0.03em',
  color: colors.ink
}

const linkStyle: CSSProperties = {
  color: colors.ink,
  fontWeight: 600
}

const alertStyle: CSSProperties = {
  margin: '12px 0',
  padding: '12px 16px',
  borderRadius: radius.md,
  background: colors.dangerSurface,
  border: `1px solid ${colors.dangerSurface}`,
  color: colors.onDangerSurface,
  fontSize: 14
}

export default RegisterCustomerPage
