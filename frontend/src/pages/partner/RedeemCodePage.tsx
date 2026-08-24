/**
 * RedeemCodePage — partner-side voucher code redemption (task 13.3).
 *
 * The partner supplies a voucher code (prefilled from the verify page via the
 * `?code=` query param, or typed directly), picks the branch where the voucher
 * is being used, and confirms. The page calls `POST /partner/redeem-code`,
 * which atomically marks a valid, active code as USED and records the branch
 * (Req 19.1). A code may only be redeemed once — a second attempt on a USED
 * code is rejected (Req 19.2) — and the redemption branch must belong to the
 * partner (Req 19.3).
 *
 * Branch options come from `GET /partner/branches` (active branches only).
 * Errors — wrong partner (unauthorized), used / expired / cancelled codes, or a
 * branch not owned by the partner — arrive in the structured
 * `{ error: { message } }` envelope and are surfaced inline via `role="alert"`
 * regions, since the app shell mounts no global toast provider.
 *
 * _Requirements: 18.3, 18.4, 18.5, 18.6, 19.1, 19.2, 19.3_
 */
import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import type { VoucherCodeStatus } from '@ui-contracts'
import { api } from '../../services/api'
import { QrCameraScanner } from '../../components/common/QrCameraScanner'
import { Badge, Button, Input, LoadingSpinner, variantForStatus } from '../../components/ui'
import { formatDateTime, formatStatus } from '../../utils/format'
import { colors, fonts, radius, shadows } from '../../theme/tokens'

/** A partner branch as returned by `GET /partner/branches`. */
export interface PartnerBranch {
  id: string
  name: string
  address: string
  region: string
  contact: string
  isActive?: boolean
}

/** Successful redemption payload (`POST /partner/redeem-code`). */
export interface RedemptionResult {
  id: string
  code: string
  status: VoucherCodeStatus
  /** ISO date string. */
  redeemedAt: string
  redemptionBranchId: string
  remainingUses: number
}

interface ValidationResult {
  code: string
  status: VoucherCodeStatus
  valid: boolean
  reason: string | null
  remainingUses: number
  expiresAt: string
  voucher: { id: string; name: string; isMultiUse: boolean }
}

/** Structured error body returned by the backend error handler. */
interface ApiErrorBody {
  error?: { code?: string; message?: string }
}

interface ApiEnvelope<T> {
  success: true
  data: T
}

async function fetchBranches(): Promise<PartnerBranch[]> {
  const { data } = await api.get<ApiEnvelope<PartnerBranch[]> | PartnerBranch[]>('/voucher-code-branches')
  return 'data' in data ? data.data : data
}

async function redeemCode(code: string, branchId: string): Promise<RedemptionResult> {
  const { data } = await api.post<ApiEnvelope<RedemptionResult> | RedemptionResult>(
    `/voucher-codes/${encodeURIComponent(code)}/redemption`,
    { branchId: Number(branchId) }
  )
  return 'data' in data ? data.data : data
}

async function validateCode(code: string): Promise<ValidationResult> {
  const { data } = await api.get<ApiEnvelope<ValidationResult>>(`/voucher-codes/${encodeURIComponent(code)}`)
  return data.data
}

/**
 * Derive a user-facing message from a failed redemption. The backend's
 * unauthorized / used / expired / cancelled / branch-not-owned messages are
 * safe to display directly; network/unknown errors fall back to a generic
 * message.
 */
export function resolveRedeemError(err: unknown): string {
  const response = (err as { response?: { data?: ApiErrorBody } })?.response
  const message = response?.data?.error?.message
  if (message) return message
  if (!response) {
    return 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối và thử lại.'
  }
  return 'Không thể xác nhận mã này. Vui lòng thử lại.'
}

export function RedeemCodePage() {
  const [searchParams] = useSearchParams()
  const prefilledCode = searchParams.get('code') ?? ''

  const [code, setCode] = useState(prefilledCode)
  const [branchId, setBranchId] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)

  // Keep the field in sync if the partner arrives from the verify page with a
  // different `?code=` than what is currently entered.
  useEffect(() => {
    if (prefilledCode) setCode(prefilledCode)
  }, [prefilledCode])

  const {
    data: branches,
    isLoading: branchesLoading,
    isError: branchesError,
    refetch: refetchBranches
  } = useQuery({
    queryKey: ['partner-branches'],
    queryFn: fetchBranches
  })

  // Older database rows do not carry an `isActive` column; they are active by
  // default. Only an explicit false value hides a branch.
  const activeBranches = useMemo(() => (branches ?? []).filter((branch) => branch.isActive !== false), [branches])

  const mutation = useMutation({
    mutationFn: ({ code: c, branchId: b }: { code: string; branchId: string }) => redeemCode(c, b)
  })
  const validation = useMutation({ mutationFn: validateCode })

  const trimmed = code.trim()
  const canValidate = Boolean(trimmed) && !validation.isPending && !mutation.isPending
  const canSubmit = Boolean(validation.data?.valid) && Boolean(branchId) && !mutation.isPending

  const changeCode = (value: string) => {
    setCode(value)
    validation.reset()
    mutation.reset()
  }

  const scanQr = () => {
    setScannerOpen(true)
  }

  const handleScannedCode = (scannedCode: string) => {
    const normalizedCode = scannedCode.trim()
    if (!normalizedCode) return

    changeCode(normalizedCode)
    setScannerOpen(false)
    validation.mutate(normalizedCode)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return
    mutation.mutate({ code: trimmed, branchId })
  }

  const result = mutation.data
  const errorMessage = mutation.isError ? resolveRedeemError(mutation.error) : null
  const redeemedBranch = result
    ? activeBranches.find((b) => String(b.id) === String(result.redemptionBranchId))
    : undefined

  return (
    <section style={{ maxWidth: 620, margin: '0 auto' }}>
      <h1 style={titleStyle}>Xác nhận sử dụng voucher</h1>
      <p style={subtitleStyle}>
        Chọn chi nhánh và nhập mã để xác nhận khách đã sử dụng voucher. Mỗi mã chỉ được sử dụng một lần.
      </p>

      <form onSubmit={submit} style={formStyle} noValidate>
        <Input
          label='Mã voucher'
          placeholder='Ví dụ: SPA-AAAA-1111'
          value={code}
          onChange={(e) => changeCode(e.target.value)}
          autoComplete='off'
          disabled={Boolean(result)}
          data-testid='redeem-code-input'
        />

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button
            type='button'
            onClick={() => validation.mutate(trimmed)}
            isLoading={validation.isPending}
            disabled={!canValidate}
            data-testid='validate-code-btn'
          >
            Kiểm tra mã
          </Button>
          <Button type='button' variant='secondary' onClick={scanQr} data-testid='scan-qr-btn'>
            Quét QR bằng camera
          </Button>
        </div>

        {validation.data && (
          <div data-testid='code-status' role='status' style={validation.data.valid ? successStyle : alertStyle}>
            <strong>{validation.data.voucher.name}</strong>
            <div>{validation.data.valid ? 'Mã hợp lệ' : validation.data.reason}</div>
            <div>
              Còn {validation.data.remainingUses} lượt · Hạn {formatDateTime(validation.data.expiresAt)}
            </div>
          </div>
        )}
        {validation.isError && (
          <div role='alert' style={alertStyle} data-testid='validate-error'>
            {resolveRedeemError(validation.error)}
          </div>
        )}

        <div>
          <label htmlFor='redeem-branch' style={labelStyle}>
            Chi nhánh sử dụng
          </label>
          {branchesLoading ? (
            <LoadingSpinner label='Đang tải chi nhánh' />
          ) : branchesError ? (
            <div role='alert' style={alertStyle}>
              Không thể tải danh sách chi nhánh.{' '}
              <button type='button' onClick={() => refetchBranches()} style={linkButtonStyle}>
                Thử lại
              </button>
            </div>
          ) : activeBranches.length === 0 ? (
            <p style={{ color: colors.slate, margin: 0 }}>
              Chưa có chi nhánh đang hoạt động. Hãy thêm chi nhánh trước khi xác nhận mã.
            </p>
          ) : (
            <select
              id='redeem-branch'
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              disabled={Boolean(result)}
              style={selectStyle}
              data-testid='branch-select'
            >
              <option value=''>Chọn chi nhánh…</option>
              {activeBranches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name} — {branch.region}
                </option>
              ))}
            </select>
          )}
        </div>

        {!result && (
          <Button type='submit' isLoading={mutation.isPending} disabled={!canSubmit} data-testid='confirm-redeem-btn'>
            Xác nhận sử dụng
          </Button>
        )}
      </form>

      {errorMessage && (
        <div role='alert' style={alertStyle} data-testid='redeem-error'>
          {errorMessage}
        </div>
      )}

      {result && (
        <div style={successStyle} data-testid='redeem-success'>
          <div style={successHeaderStyle}>
            <CheckCircle2 size={28} aria-hidden='true' />
            <span style={{ fontWeight: 600, color: colors.onSuccessSurface }}>Đã xác nhận sử dụng mã</span>
            <Badge variant={variantForStatus(result.status)}>{formatStatus(result.status)}</Badge>
          </div>
          <dl style={detailGridStyle}>
            <dt style={dtStyle}>Mã</dt>
            <dd style={{ ...ddStyle, fontFamily: 'monospace' }}>{result.code}</dd>
            <dt style={dtStyle}>Chi nhánh</dt>
            <dd style={ddStyle}>{redeemedBranch?.name ?? result.redemptionBranchId}</dd>
            <dt style={dtStyle}>Thời gian sử dụng</dt>
            <dd style={ddStyle}>{formatDateTime(result.redeemedAt)}</dd>
            <dt style={dtStyle}>Lượt còn lại</dt>
            <dd style={ddStyle}>{result.remainingUses}</dd>
          </dl>
        </div>
      )}

      <QrCameraScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onResult={handleScannedCode} />
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                     */
/* -------------------------------------------------------------------------- */

const formStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  marginTop: 16
}

const titleStyle: CSSProperties = {
  marginTop: 0,
  fontFamily: fonts.display,
  fontSize: 'clamp(32px, 5vw, 40px)',
  fontWeight: 800,
  letterSpacing: '-0.03em',
  color: colors.ink
}

const subtitleStyle: CSSProperties = {
  color: colors.slate,
  marginTop: 0
}

const labelStyle: CSSProperties = {
  display: 'block',
  marginBottom: 4,
  fontSize: 13,
  fontWeight: 500,
  color: colors.slate
}

const selectStyle: CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: 14,
  fontFamily: fonts.body,
  color: colors.ink,
  background: colors.surface,
  border: `1px solid ${colors.hairlineStrong}`,
  borderRadius: radius.md,
  boxSizing: 'border-box'
}

const alertStyle: CSSProperties = {
  marginTop: 16,
  padding: '10px 12px',
  borderRadius: radius.md,
  background: colors.dangerSurface,
  border: `1px solid ${colors.dangerSurface}`,
  color: colors.onDangerSurface,
  fontSize: 14
}

const linkButtonStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  color: colors.ink,
  textDecoration: 'underline',
  cursor: 'pointer',
  fontSize: 'inherit',
  fontFamily: 'inherit'
}

const successStyle: CSSProperties = {
  marginTop: 20,
  padding: 20,
  borderRadius: radius.xl,
  border: `1px solid ${colors.hairline}`,
  background: colors.successSurface,
  boxShadow: shadows.card
}

const successHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12
}

const detailGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'max-content 1fr',
  gap: '6px 16px',
  margin: '16px 0 0'
}

const dtStyle: CSSProperties = { color: colors.slate, fontSize: 13 }
const ddStyle: CSSProperties = { margin: 0, color: colors.ink, fontSize: 14 }

export default RedeemCodePage
