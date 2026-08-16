/**
 * VouchersPage — partner voucher management list (task 13.2).
 *
 * Lists the authenticated partner's vouchers (GET `/partner/vouchers`, newest
 * first) with a status {@link Badge} and the contextual lifecycle actions for
 * each row (submit / pause / resume / cancel), driven by the voucher state
 * machine. Actions call the partner endpoints and refresh the list on success:
 *   - submit  → PENDING_APPROVAL (Req 9.1)
 *   - pause   → PAUSED           (Req 10.1)
 *   - resume  → APPROVED         (Req 10.2)
 *   - cancel  → CANCELLED        (Req 10.3, behind a confirmation modal)
 *
 * The "Create voucher" button links to {@link CreateVoucherPage}. Rejected
 * vouchers surface their rejection reason inline so the partner can correct and
 * re-submit. There is no global ToastProvider mounted, so feedback is rendered
 * as inline `role="alert"` regions.
 *
 * _Requirements: 8.1, 8.5, 9.1, 10.1, 10.2, 10.3_
 */
import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge, variantForStatus, Button, LoadingSpinner, Pagination } from '../../components/ui'
import {
  availableActions,
  getApiErrorMessage,
  listPartnerVouchers,
  pauseVoucher,
  PARTNER_VOUCHERS_QUERY_KEY,
  resumeVoucher,
  returnVoucherToDraft,
  submitVoucher,
  type ListPartnerVouchersResponse,
  type PartnerVoucher,
  type VoucherAction
} from '../../services/partnerVoucher'
import { discountPercent, formatCurrency, formatDateRange, formatStatus } from '../../utils/format'
import { colors, fonts, radius, shadows } from '../../theme/tokens'

/** Human-readable button label for each lifecycle action. */
const ACTION_LABEL: Record<VoucherAction, string> = {
  submit: 'Gửi duyệt',
  revise: 'Đưa về nháp',
  pause: 'Tạm dừng',
  resume: 'Mở bán lại'
}

/** Map an action to the API call that performs it. */
const ACTION_FN: Record<VoucherAction, (id: string) => Promise<PartnerVoucher>> = {
  submit: submitVoucher,
  revise: returnVoucherToDraft,
  pause: pauseVoucher,
  resume: resumeVoucher
}

/** Remaining (unsold) inventory for a voucher. */
function remaining(voucher: PartnerVoucher): number {
  return voucher.totalQuantity - voucher.soldQuantity
}

export function VouchersPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const pageLimit = 20

  // Inline error banner for a failed action (keyed message, not per row, so a
  // single alert region is announced).
  const [actionError, setActionError] = useState<string | null>(null)
  // Tracks the voucher+action currently in flight so only that button spins.
  const [pending, setPending] = useState<{ id: string; action: VoucherAction } | null>(null)

  const { data, isLoading, isError } = useQuery<ListPartnerVouchersResponse>({
    queryKey: [...PARTNER_VOUCHERS_QUERY_KEY, page],
    queryFn: () => listPartnerVouchers(page, pageLimit)
  })

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: VoucherAction }) => ACTION_FN[action](id),
    onMutate: ({ id, action }) => {
      setActionError(null)
      setPending({ id, action })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PARTNER_VOUCHERS_QUERY_KEY })
    },
    onError: (err) => {
      setActionError(getApiErrorMessage(err, 'Không thể cập nhật voucher. Vui lòng thử lại.'))
    },
    onSettled: () => {
      setPending(null)
    }
  })

  function runAction(voucher: PartnerVoucher, action: VoucherAction) {
    actionMutation.mutate({ id: voucher.id, action })
  }

  const vouchers = data?.vouchers ?? []
  const totalPages = Math.max(1, Math.ceil((data?.pagination.total ?? 0) / pageLimit))

  return (
    <section style={sectionStyle}>
      <div style={headerRowStyle}>
        <h1 style={titleStyle}>Quản lý voucher</h1>
        <Link to='/partner/vouchers/new' style={{ textDecoration: 'none' }}>
          <Button>Tạo voucher</Button>
        </Link>
      </div>

      {actionError && (
        <div role='alert' style={alertStyle}>
          {actionError}
        </div>
      )}

      {isLoading && (
        <div style={{ padding: 32 }}>
          <LoadingSpinner label='Đang tải voucher' />
        </div>
      )}

      {isError && (
        <div role='alert' style={alertStyle}>
          Không thể tải danh sách voucher. Vui lòng thử lại sau.
        </div>
      )}

      {!isLoading && !isError && vouchers.length === 0 && (
        <div style={emptyStyle}>
          <p style={{ margin: 0 }}>Bạn chưa tạo voucher nào.</p>
          <Link to='/partner/vouchers/new'>Tạo voucher đầu tiên →</Link>
        </div>
      )}

      {!isLoading && !isError && vouchers.length > 0 && (
        <>
          <ul style={listStyle}>
            {vouchers.map((voucher) => {
              const actions = availableActions(voucher.status)
              return (
                <li key={voucher.id} style={rowStyle} data-testid={`voucher-row-${voucher.id}`}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={titleRowStyle}>
                      <span style={{ fontWeight: 600 }}>{voucher.title}</span>
                      <Badge variant={variantForStatus(voucher.status)}>{formatStatus(voucher.status)}</Badge>
                    </div>
                    <p style={metaStyle}>
                      {voucher.category} · {formatCurrency(voucher.salePrice)}{' '}
                      <span style={{ textDecoration: 'line-through', color: colors.slateMuted }}>
                        {formatCurrency(voucher.originalPrice)}
                      </span>{' '}
                      (−{discountPercent(voucher.originalPrice, voucher.salePrice)}%)
                    </p>
                    <p style={metaStyle}>
                      Mở bán: {formatDateRange(voucher.salePeriodStart, voucher.salePeriodEnd)} · {remaining(voucher)}/
                      {voucher.totalQuantity} còn lại
                    </p>
                    {voucher.status === 'REJECTED' && voucher.rejectionReason && (
                      <p style={rejectionStyle} role='note'>
                        Lý do từ chối: {voucher.rejectionReason}
                      </p>
                    )}
                  </div>

                  <div style={actionsStyle}>
                    {actions.length === 0 ? (
                      <span style={{ color: colors.slateMuted, fontSize: 13 }}>Không có thao tác</span>
                    ) : (
                      actions.map((action) => {
                        const isBusy = pending?.id === voucher.id && pending.action === action
                        return (
                          <Button
                            key={action}
                            size='sm'
                            variant={action === 'pause' ? 'danger' : 'secondary'}
                            isLoading={isBusy}
                            disabled={actionMutation.isPending}
                            onClick={() => runAction(voucher, action)}
                          >
                            {ACTION_LABEL[action]}
                          </Button>
                        )
                      })
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} style={{ marginTop: 20 }} />
        </>
      )}
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                     */
/* -------------------------------------------------------------------------- */

const sectionStyle: CSSProperties = { maxWidth: 900, margin: '0 auto' }

const titleStyle: CSSProperties = {
  margin: 0,
  fontFamily: fonts.display,
  fontSize: 'clamp(32px, 5vw, 40px)',
  fontWeight: 800,
  letterSpacing: '-0.03em',
  color: colors.ink
}

const headerRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  marginBottom: 16,
  flexWrap: 'wrap'
}

const listStyle: CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 10
}

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 16,
  flexWrap: 'wrap',
  padding: '14px 16px',
  border: `1px solid ${colors.hairline}`,
  borderRadius: radius.xl,
  background: colors.surface,
  boxShadow: shadows.card
}

const titleRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  flexWrap: 'wrap'
}

const metaStyle: CSSProperties = {
  margin: '4px 0 0',
  fontSize: 13,
  color: colors.slate
}

const rejectionStyle: CSSProperties = {
  margin: '6px 0 0',
  fontSize: 13,
  color: colors.onDangerSurface
}

const actionsStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  alignItems: 'center'
}

const alertStyle: CSSProperties = {
  marginBottom: 16,
  padding: '10px 12px',
  borderRadius: radius.md,
  background: colors.dangerSurface,
  border: `1px solid ${colors.dangerSurface}`,
  color: colors.onDangerSurface,
  fontSize: 14
}

const emptyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 8,
  padding: 32,
  background: colors.surfaceMuted,
  border: `1px solid ${colors.hairline}`,
  borderRadius: radius.xl,
  color: colors.slate
}

export default VouchersPage
