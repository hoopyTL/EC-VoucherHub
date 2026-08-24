/**
 * RegisterPartnerPage — partner (business) self-registration form (task 11.2).
 *
 * Collects business information, representative details, login credentials, and
 * one or more branch locations, then posts to `POST /partners`
 * with a {@link RegisterPartnerDto} body. On success the partner account is
 * created with a "pending approval" status (Requirement 3.2); we route the user
 * to the login page with a notice that approval is pending.
 *
 * Client-side rules enforced here:
 *  - Email and all business/representative fields are required (Requirement 3.1).
 *  - Password must be at least 8 characters (Requirement 1.3 / 3.x).
 *  - At least one branch with name, address, and region is required
 *    (Requirement 3.1).
 *
 * Duplicate-account errors (HTTP 409) returned by the backend are surfaced in a
 * prominent form-level alert (Requirement 3.3).
 */
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import type { RegisterPartnerDto } from '@voucher/shared'
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
}

interface BranchFieldErrors {
  name?: string
  address?: string
  region?: string
}

interface FieldErrors {
  email?: string
  phone?: string
  password?: string
  legalName?: string
  taxCode?: string
  representative?: string
  branches?: BranchFieldErrors[]
}

function emptyBranch(): BranchForm {
  return { name: '', address: '', region: '' }
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
  const [legalName, setLegalName] = useState('')
  const [taxCode, setTaxCode] = useState('')
  const [representative, setRepresentative] = useState('')

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

    if (!email.trim() && !phone.trim()) {
      errors.email = 'Vui lòng cung cấp email hoặc số điện thoại.'
      errors.phone = 'Vui lòng cung cấp email hoặc số điện thoại.'
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `Mật khẩu phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`
    }
    if (!legalName.trim()) errors.legalName = 'Vui lòng nhập tên pháp lý của doanh nghiệp.'
    if (!taxCode.trim()) errors.taxCode = 'Vui lòng nhập mã số thuế.'
    if (!representative.trim()) errors.representative = 'Vui lòng nhập tên người đại diện.'

    const branchErrors = branches.map((branch) => {
      const be: BranchFieldErrors = {}
      if (!branch.name.trim()) be.name = 'Vui lòng nhập tên chi nhánh.'
      if (!branch.address.trim()) be.address = 'Vui lòng nhập địa chỉ.'
      if (!branch.region.trim()) be.region = 'Vui lòng nhập khu vực.'
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

    const payload: RegisterPartnerDto = {
      password,
      legalName: legalName.trim(),
      taxCode: taxCode.trim(),
      representative: representative.trim(),
      branches: branches.map((branch) => ({
        name: branch.name.trim(),
        address: branch.address.trim(),
        region: branch.region.trim()
      })),
      ...(email.trim() ? { email: email.trim() } : {}),
      ...(phone.trim() ? { phone: phone.trim() } : {})
    }

    setIsSubmitting(true)
    try {
      await api.post('/partners', payload)
      // Account created with pending-approval status (Requirement 3.2).
      navigate('/login', {
        replace: true,
        state: { registered: true, role: 'PARTNER', pendingApproval: true }
      })
    } catch (err) {
      const { status, message } = describeApiError(err, 'Đăng ký thất bại. Vui lòng thử lại.')
      // 409 = duplicate email/phone (Requirement 3.3).
      setFormError(status === 409 ? message || 'Email hoặc số điện thoại này đã được sử dụng.' : message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section style={sectionStyle}>
      <p style={eyebrowStyle}>● Đăng ký đối tác</p>
      <h1 style={headingStyle}>Đưa doanh nghiệp lên VoucherHub</h1>
      <p style={{ color: colors.slate, marginTop: 0, marginBottom: 24, fontSize: 16 }}>
        Gửi hồ sơ doanh nghiệp để kiểm duyệt. Tài khoản sẽ hoạt động sau khi quản trị viên phê duyệt.
      </p>

      {formError && (
        <div role='alert' style={alertStyle}>
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <fieldset style={fieldsetStyle}>
          <legend style={legendStyle}>Thông tin đăng nhập</legend>
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
              label='Số điện thoại'
              type='tel'
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              error={fieldErrors.phone}
              autoComplete='tel'
            />
            <Input
              label='Mật khẩu'
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
              hint={`Ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`}
              required
              autoComplete='new-password'
            />
          </div>
        </fieldset>

        <fieldset style={fieldsetStyle}>
          <legend style={legendStyle}>Thông tin doanh nghiệp</legend>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input
              label='Tên pháp lý doanh nghiệp'
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              error={fieldErrors.legalName}
              required
            />
            <Input
              label='Mã số thuế'
              value={taxCode}
              onChange={(e) => setTaxCode(e.target.value)}
              error={fieldErrors.taxCode}
              required
            />
          </div>
        </fieldset>

        <fieldset style={fieldsetStyle}>
          <legend style={legendStyle}>Người đại diện</legend>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input
              label='Họ tên người đại diện'
              value={representative}
              onChange={(e) => setRepresentative(e.target.value)}
              error={fieldErrors.representative}
              required
            />
          </div>
        </fieldset>

        <fieldset style={fieldsetStyle}>
          <legend style={legendStyle}>Danh sách chi nhánh</legend>
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
                      Chi nhánh {index + 1}
                    </strong>
                    {branches.length > 1 && (
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        onClick={() => removeBranch(index)}
                        aria-label={`Xóa chi nhánh ${index + 1}`}
                      >
                        Xóa
                      </Button>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <Input
                      label='Tên chi nhánh'
                      value={branch.name}
                      onChange={(e) => updateBranch(index, { name: e.target.value })}
                      error={be.name}
                      required
                    />
                    <Input
                      label='Địa chỉ'
                      value={branch.address}
                      onChange={(e) => updateBranch(index, { address: e.target.value })}
                      error={be.address}
                      required
                    />
                    <Input
                      label='Khu vực'
                      value={branch.region}
                      onChange={(e) => updateBranch(index, { region: e.target.value })}
                      error={be.region}
                      required
                    />
                  </div>
                </div>
              )
            })}
            <div>
              <Button type='button' variant='secondary' size='sm' onClick={addBranch}>
                + Thêm chi nhánh
              </Button>
            </div>
          </div>
        </fieldset>

        <Button type='submit' isLoading={isSubmitting} fullWidth>
          Gửi hồ sơ đăng ký
        </Button>
      </form>

      <p style={{ marginTop: 24, fontSize: 14, color: colors.slate }}>
        Đã có tài khoản?{' '}
        <Link to='/login' style={linkStyle}>
          Đăng nhập
        </Link>
      </p>
      <p style={{ marginTop: 4, fontSize: 14, color: colors.slate }}>
        Bạn muốn mua voucher?{' '}
        <Link to='/register/customer' style={linkStyle}>
          Đăng ký khách hàng
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
