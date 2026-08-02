/**
 * RegisterPartnerPage — partner (business) self-registration form (task 11.2).
 *
 * Collects business information, representative details, login credentials, and
 * one or more branch locations, then posts to `POST /auth/register/partner`
 * with a {@link RegisterPartnerRequest} body. On success the partner account is
 * created with a "pending approval" status (Requirement 3.2); we route the user
 * to the login page with a notice that approval is pending.
 *
 * Client-side rules enforced here:
 *  - Email and all business/representative fields are required (Requirement 3.1).
 *  - Password must be at least 8 characters (Requirement 1.3 / 3.x).
 *  - At least one branch with name, address, region, and contact is required
 *    (Requirement 3.1).
 *
 * Duplicate-account errors (HTTP 409) returned by the backend are surfaced in a
 * prominent form-level alert (Requirement 3.3).
 */
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import type { RegisterPartnerRequest } from '@ui-contracts'
import { api } from '../../services/api'
import { Button, Input } from '../../components/ui'
import { colors, fonts, radius, shadows } from '../../theme/tokens'
import type { CSSProperties } from 'react'

/** Minimum password length required at registration (Requirement 1.3). */
export const MIN_PASSWORD_LENGTH = 8

/** A single editable branch row in the form. */
interface BranchForm {
  name: string
  address: string
  region: string
  contact: string
}

interface BranchFieldErrors {
  name?: string
  address?: string
  region?: string
  contact?: string
}

interface FieldErrors {
  email?: string
  password?: string
  businessName?: string
  businessRegNumber?: string
  taxId?: string
  representativeName?: string
  representativeContact?: string
  branches?: BranchFieldErrors[]
}

function emptyBranch(): BranchForm {
  return { name: '', address: '', region: '', contact: '' }
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

export function RegisterPartnerPage() {
  const navigate = useNavigate()

  // Account + business fields.
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [businessRegNumber, setBusinessRegNumber] = useState('')
  const [taxId, setTaxId] = useState('')
  const [representativeName, setRepresentativeName] = useState('')
  const [representativeContact, setRepresentativeContact] = useState('')

  // At least one branch is required (Requirement 3.1).
  const [branches, setBranches] = useState<BranchForm[]>([emptyBranch()])

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateBranch(index: number, patch: Partial<BranchForm>) {
    setBranches((current) => current.map((branch, i) => (i === index ? { ...branch, ...patch } : branch)))
  }

  function addBranch() {
    setBranches((current) => [...current, emptyBranch()])
  }

  function removeBranch(index: number) {
    setBranches((current) => (current.length <= 1 ? current : current.filter((_, i) => i !== index)))
  }

  /** Validate the form locally. Returns the collected field errors. */
  function validate(): FieldErrors {
    const errors: FieldErrors = {}

    if (!email.trim()) errors.email = 'Email is required.'
    if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
    }
    if (!businessName.trim()) errors.businessName = 'Business name is required.'
    if (!businessRegNumber.trim()) {
      errors.businessRegNumber = 'Business registration number is required.'
    }
    if (!taxId.trim()) errors.taxId = 'Tax ID is required.'
    if (!representativeName.trim()) {
      errors.representativeName = 'Representative name is required.'
    }
    if (!representativeContact.trim()) {
      errors.representativeContact = 'Representative contact is required.'
    }

    const branchErrors = branches.map((branch) => {
      const be: BranchFieldErrors = {}
      if (!branch.name.trim()) be.name = 'Branch name is required.'
      if (!branch.address.trim()) be.address = 'Address is required.'
      if (!branch.region.trim()) be.region = 'Region is required.'
      if (!branch.contact.trim()) be.contact = 'Contact is required.'
      return be
    })
    if (branchErrors.some((be) => Object.keys(be).length > 0)) {
      errors.branches = branchErrors
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

    const payload: RegisterPartnerRequest = {
      email: email.trim(),
      password,
      businessName: businessName.trim(),
      businessRegNumber: businessRegNumber.trim(),
      taxId: taxId.trim(),
      representativeName: representativeName.trim(),
      representativeContact: representativeContact.trim(),
      branches: branches.map((branch) => ({
        name: branch.name.trim(),
        address: branch.address.trim(),
        region: branch.region.trim(),
        contact: branch.contact.trim()
      })),
      ...(phone.trim() ? { phone: phone.trim() } : {})
    }

    setIsSubmitting(true)
    try {
      await api.post('/auth/register/partner', payload)
      // Account created with pending-approval status (Requirement 3.2).
      navigate('/login', {
        replace: true,
        state: { registered: true, role: 'PARTNER', pendingApproval: true }
      })
    } catch (err) {
      const { status, message } = describeApiError(err, 'Registration failed. Please try again.')
      // 409 = duplicate email/phone (Requirement 3.3).
      setFormError(status === 409 ? message || 'An account with this email or phone number already exists.' : message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section style={sectionStyle}>
      <p style={eyebrowStyle}>● Partner</p>
      <h1 style={headingStyle}>Register your business</h1>
      <p style={{ color: colors.slate, marginTop: 0, marginBottom: 24, fontSize: 16 }}>
        Submit your business details for review. Your account becomes active once an admin approves it.
      </p>

      {formError && (
        <div role='alert' style={alertStyle}>
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <fieldset style={fieldsetStyle}>
          <legend style={legendStyle}>Account credentials</legend>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input
              label='Email'
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email}
              required
              autoComplete='email'
            />
            <Input
              label='Phone'
              type='tel'
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete='tel'
            />
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
          </div>
        </fieldset>

        <fieldset style={fieldsetStyle}>
          <legend style={legendStyle}>Business information</legend>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input
              label='Business name'
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              error={fieldErrors.businessName}
              required
            />
            <Input
              label='Business registration number'
              value={businessRegNumber}
              onChange={(e) => setBusinessRegNumber(e.target.value)}
              error={fieldErrors.businessRegNumber}
              required
            />
            <Input
              label='Tax ID'
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              error={fieldErrors.taxId}
              required
            />
          </div>
        </fieldset>

        <fieldset style={fieldsetStyle}>
          <legend style={legendStyle}>Representative</legend>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input
              label='Representative name'
              value={representativeName}
              onChange={(e) => setRepresentativeName(e.target.value)}
              error={fieldErrors.representativeName}
              required
            />
            <Input
              label='Representative contact'
              value={representativeContact}
              onChange={(e) => setRepresentativeContact(e.target.value)}
              error={fieldErrors.representativeContact}
              required
            />
          </div>
        </fieldset>

        <fieldset style={fieldsetStyle}>
          <legend style={legendStyle}>Branches</legend>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {branches.map((branch, index) => {
              const be = fieldErrors.branches?.[index] ?? {}
              return (
                <div
                  key={index}
                  style={{
                    border: `1px solid ${colors.hairline}`,
                    borderRadius: radius.lg,
                    padding: 16,
                    background: colors.surfaceMuted
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 10
                    }}
                  >
                    <strong style={{ fontSize: 14, fontFamily: fonts.display, color: colors.ink }}>
                      Branch {index + 1}
                    </strong>
                    {branches.length > 1 && (
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        onClick={() => removeBranch(index)}
                        aria-label={`Remove branch ${index + 1}`}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <Input
                      label='Branch name'
                      value={branch.name}
                      onChange={(e) => updateBranch(index, { name: e.target.value })}
                      error={be.name}
                      required
                    />
                    <Input
                      label='Address'
                      value={branch.address}
                      onChange={(e) => updateBranch(index, { address: e.target.value })}
                      error={be.address}
                      required
                    />
                    <Input
                      label='Region'
                      value={branch.region}
                      onChange={(e) => updateBranch(index, { region: e.target.value })}
                      error={be.region}
                      required
                    />
                    <Input
                      label='Contact'
                      value={branch.contact}
                      onChange={(e) => updateBranch(index, { contact: e.target.value })}
                      error={be.contact}
                      required
                    />
                  </div>
                </div>
              )
            })}
            <div>
              <Button type='button' variant='secondary' size='sm' onClick={addBranch}>
                + Add branch
              </Button>
            </div>
          </div>
        </fieldset>

        <Button type='submit' isLoading={isSubmitting} fullWidth>
          Submit registration
        </Button>
      </form>

      <p style={{ marginTop: 24, fontSize: 14, color: colors.slate }}>
        Already have an account?{' '}
        <Link to='/login' style={linkStyle}>
          Log in
        </Link>
      </p>
      <p style={{ marginTop: 4, fontSize: 14, color: colors.slate }}>
        Registering as a customer?{' '}
        <Link to='/register/customer' style={linkStyle}>
          Customer sign up
        </Link>
      </p>
    </section>
  )
}

const sectionStyle: CSSProperties = {
  maxWidth: 640,
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

const fieldsetStyle = {
  border: `1px solid ${colors.hairline}`,
  borderRadius: radius.lg,
  padding: '16px 18px',
  marginBottom: 18
} as const

const legendStyle = {
  padding: '0 6px',
  fontSize: 12,
  fontWeight: 600,
  fontFamily: fonts.display,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: colors.slate
} as const

export default RegisterPartnerPage
