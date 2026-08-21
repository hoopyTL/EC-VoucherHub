/**
 * VoucherApprovalsPage — admin review of pending voucher submissions
 * (PAGE-22; FR-ADM-03).
 *
 * Lists every voucher awaiting approval (GET /admin/vouchers/pending) in an
 * editorial monochrome card with a table summarising title, partner, category,
 * pricing, quantity, and sale/usage periods. Each row offers:
 *   - "View" → a detail modal with the full voucher record, including the
 *     description, terms, and both periods (Req 9.2).
 *   - "Approve" → PATCH /admin/vouchers/:id/approve (Req 9.3).
 *   - "Reject" → a reason modal whose required textarea is sent to
 *     PATCH /admin/vouchers/:id/reject (Req 9.4).
 *
 * Data is fetched with TanStack Query; approve/reject run as mutations that
 * invalidate the list on success so an actioned voucher drops off. Feedback is
 * surfaced through the global toast provider via {@link useToast}.
 *
 * _Requirements: 9.2, 9.3, 9.4 (FR-ADM-03)_
 */
import { useState, type CSSProperties, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { approveVoucher, getAdminApiError, listPendingVouchers, rejectVoucher } from '../../services/admin'
import type { VoucherApprovalView } from '../../types/admin'
import { Badge, Button, LoadingSpinner, Modal, Pagination, useToast, variantForStatus } from '../../components/ui'
import { discountPercent, formatCurrency, formatDateRange, formatDateTime, formatStatus } from '../../utils/format'
import { colors, fonts, radius, shadows } from '../../theme/tokens'
import { VoucherManagementSection } from './VoucherManagementSection'

/** Page size for the pending-vouchers listing. */
const PAGE_LIMIT = 20

/** Base query key for the pending-vouchers list. */
const PENDING_VOUCHERS_QUERY_KEY = 'admin-pending-vouchers'

export function VoucherApprovalsPage() {
  const queryClient = useQueryClient()
  const toast = useToast()

  const [page, setPage] = useState(1)
  // Voucher whose detail modal is open (null when closed).
  const [detail, setDetail] = useState<VoucherApprovalView | null>(null)
  // Voucher pending a rejection (null when the reason modal is closed).
  const [rejecting, setRejecting] = useState<VoucherApprovalView | null>(null)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [PENDING_VOUCHERS_QUERY_KEY, { page }],
    queryFn: () => listPendingVouchers({ page, limit: PAGE_LIMIT })
  })

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: [PENDING_VOUCHERS_QUERY_KEY] }),
      queryClient.invalidateQueries({ queryKey: ['admin-vouchers-all'] })
    ])

  const approveMutation = useMutation({
    mutationFn: (voucher: VoucherApprovalView) => approveVoucher(voucher.id),
    onSuccess: async (_result, voucher) => {
      await invalidate()
      setDetail(null)
      toast.success(`Đã duyệt voucher “${voucher.title}”.`)
    },
    onError: (err) => {
      toast.error(getAdminApiError(err, 'Không thể duyệt voucher. Vui lòng thử lại.'))
    }
  })

  const rejectMutation = useMutation({
    mutationFn: (vars: { voucher: VoucherApprovalView; reason: string }) => rejectVoucher(vars.voucher.id, vars.reason),
    onSuccess: async (_result, vars) => {
      await invalidate()
      closeReject()
      setDetail(null)
      toast.success(`Đã từ chối voucher “${vars.voucher.title}”.`)
    },
    onError: (err) => {
      setReasonError(getAdminApiError(err, 'Không thể từ chối voucher. Vui lòng thử lại.'))
    }
  })

  const vouchers = data?.vouchers ?? []
  const total = data?.pagination.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT))

  function openReject(voucher: VoucherApprovalView) {
    setDetail(null)
    setReason('')
    setReasonError(null)
    setRejecting(voucher)
  }

  function closeReject() {
    setRejecting(null)
    setReason('')
    setReasonError(null)
  }

  function handleRejectSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = reason.trim()
    if (!trimmed) {
      setReasonError('Vui lòng nhập lý do từ chối.')
      return
    }
    if (rejecting) {
      rejectMutation.mutate({ voucher: rejecting, reason: trimmed })
    }
  }

  return (
    <section style={pageStyle}>
      <header>
        <p style={eyebrowStyle}>● Kiểm duyệt sản phẩm</p>
        <h1 style={titleStyle}>Voucher chờ duyệt</h1>
        <p style={subtitleStyle}>
          Kiểm tra nội dung, giá và thời hạn trước khi voucher được mở bán trên sàn.
        </p>
      </header>

      {isLoading && (
        <div style={{ padding: 48 }}>
          <LoadingSpinner label='Đang tải voucher chờ duyệt' />
        </div>
      )}

      {!isLoading && isError && (
        <div role='alert' style={alertStyle}>
          Không thể tải danh sách voucher chờ duyệt.{' '}
          <button type='button' style={linkButtonStyle} onClick={() => refetch()}>
            Thử lại
          </button>
        </div>
      )}

      {!isLoading && !isError && data && vouchers.length === 0 && (
        <div style={emptyStyle}>
          <p style={{ margin: 0 }}>Không có voucher nào đang chờ duyệt.</p>
        </div>
      )}

      {!isLoading && !isError && data && vouchers.length > 0 && (
        <>
          <div style={cardStyle}>
            <div style={tableWrapperStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Voucher</th>
                    <th style={thStyle}>Đối tác</th><th style={thStyle}>Danh mục</th><th style={thNumStyle}>Giá bán</th><th style={thNumStyle}>Số lượng</th><th style={thStyle}>Thời gian bán</th><th style={thActionStyle}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {vouchers.map((voucher) => {
                    const discount = discountPercent(voucher.originalPrice, voucher.salePrice)
                    return (
                      <tr key={voucher.id} data-testid={`voucher-${voucher.id}`}>
                        <td style={tdStyle}>
                          <div style={voucherCellStyle}>
                            <div style={thumbnailWrapStyle}>
                              {voucher.imageUrl ? (
                                <img src={voucher.imageUrl} alt='' style={thumbnailStyle} />
                              ) : (
                                <span style={thumbnailFallbackStyle}>VH</span>
                              )}
                            </div>
                            <div style={{ fontWeight: 600, color: colors.ink }}>{voucher.title}</div>
                          </div>
                        </td>
                        <td style={tdStyle}>{voucher.partner.businessName}</td>
                        <td style={tdStyle}>{formatStatus(voucher.category)}</td>
                        <td style={tdNumStyle}>
                          <div style={{ fontWeight: 600, color: colors.ink }}>{formatCurrency(voucher.salePrice)}</div>
                          <div style={strikeStyle}>
                            {formatCurrency(voucher.originalPrice)}
                            {discount > 0 && ` · -${discount}%`}
                          </div>
                        </td>
                        <td style={tdNumStyle}>{voucher.totalQuantity}</td>
                        <td style={tdStyle}>{formatDateRange(voucher.salePeriodStart, voucher.salePeriodEnd)}</td>
                        <td style={tdActionStyle}>
                          <div style={actionRowStyle}>
                            <Button
                              size='sm'
                              variant='secondary'
                              onClick={() => setDetail(voucher)}
                              aria-label={`Xem ${voucher.title}`}
                            >
                              Chi tiết
                            </Button>
                            <Button
                              size='sm'
                              variant='primary'
                              isLoading={approveMutation.isPending && approveMutation.variables?.id === voucher.id}
                              onClick={() => approveMutation.mutate(voucher)}
                              aria-label={`Duyệt ${voucher.title}`}
                            >
                              Duyệt
                            </Button>
                            <Button
                              size='sm'
                              variant='danger'
                              onClick={() => openReject(voucher)}
                              aria-label={`Từ chối ${voucher.title}`}
                            >
                              Từ chối
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </>
      )}

      <VoucherManagementSection />

      {/* Voucher detail modal */}
      <Modal
        isOpen={detail !== null}
        onClose={() => setDetail(null)}
        title={detail?.title}
        size='lg'
        footer={
          detail && (
            <>
              <Button variant='danger' onClick={() => detail && openReject(detail)}>
                Từ chối
              </Button>
              <Button
                variant='primary'
                isLoading={approveMutation.isPending}
                onClick={() => detail && approveMutation.mutate(detail)}
              >
                Duyệt
              </Button>
            </>
          )
        }
      >
        {detail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {detail.imageUrl && <img src={detail.imageUrl} alt={`Ảnh ${detail.title}`} style={detailImageStyle} />}
            <div style={detailBadgeRowStyle}>
              <Badge variant={variantForStatus(detail.status)}>{formatStatus(detail.status)}</Badge>
              <Badge variant='neutral'>{formatStatus(detail.category)}</Badge>
            </div>

            {detail.description && (
              <p style={{ margin: 0, color: colors.slate, lineHeight: 1.6 }}>{detail.description}</p>
            )}

            <dl style={detailGridStyle}>
              <DetailRow label='Đối tác' value={detail.partner.businessName} />
              <DetailRow label='Giá bán' value={formatCurrency(detail.salePrice)} />
              <DetailRow label='Giá gốc' value={formatCurrency(detail.originalPrice)} />
              <DetailRow label='Số lượng' value={`Đã bán ${detail.soldQuantity} / ${detail.totalQuantity}`} />
              <DetailRow
                label='Thời gian mở bán'
                value={formatDateRange(detail.salePeriodStart, detail.salePeriodEnd) || '—'}
              />
              <DetailRow
                label='Thời hạn sử dụng'
                value={formatDateRange(detail.usagePeriodStart, detail.usagePeriodEnd) || '—'}
              />
              <DetailRow label='Ngày gửi duyệt' value={formatDateTime(detail.createdAt) || '—'} />
            </dl>

            {detail.terms && (
              <div>
                <p style={detailTermStyle}>Điều khoản và điều kiện</p>
                <p style={{ margin: '4px 0 0', color: colors.slate, lineHeight: 1.6 }}>{detail.terms}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Reject reason modal */}
      <Modal
        isOpen={rejecting !== null}
        onClose={closeReject}
        title='Từ chối voucher'
        size='sm'
        footer={
          <>
            <Button variant='secondary' onClick={closeReject}>
              Quay lại
            </Button>
            <Button variant='danger' type='submit' form='reject-voucher-form' isLoading={rejectMutation.isPending}>
              Xác nhận từ chối
            </Button>
          </>
        }
      >
        <form id='reject-voucher-form' onSubmit={handleRejectSubmit}>
          {rejecting && (
            <p style={{ margin: '0 0 12px', color: colors.slate }}>
              Nhập lý do từ chối <strong style={{ color: colors.ink }}>“{rejecting.title}”</strong>. Nội dung này sẽ được gửi cho đối tác.
            </p>
          )}
          <label htmlFor='voucher-reject-reason' style={labelStyle}>
            Lý do từ chối
            <span aria-hidden='true' style={{ color: colors.danger, marginLeft: 2 }}>
              *
            </span>
          </label>
          <textarea
            id='voucher-reject-reason'
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
              if (reasonError) setReasonError(null)
            }}
            rows={4}
            placeholder='Nhập lý do từ chối voucher…'
            aria-invalid={reasonError ? true : undefined}
            aria-describedby={reasonError ? 'voucher-reject-error' : undefined}
            style={{
              ...textareaStyle,
              borderColor: reasonError ? colors.danger : colors.hairline
            }}
          />
          {reasonError && (
            <p id='voucher-reject-error' role='alert' style={fieldErrorStyle}>
              {reasonError}
            </p>
          )}
        </form>
      </Modal>
    </section>
  )
}

/** A label/value pair in the detail modal definition list. */
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={detailRowStyle}>
      <dt style={detailTermStyle}>{label}</dt>
      <dd style={detailValueStyle}>{value}</dd>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                     */
/* -------------------------------------------------------------------------- */

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 24,
  maxWidth: 1100,
  margin: '0 auto'
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
  margin: 0,
  fontFamily: fonts.display,
  fontSize: 'clamp(32px, 5vw, 48px)',
  fontWeight: 800,
  letterSpacing: '-0.03em',
  lineHeight: 1.05,
  color: colors.ink
}

const subtitleStyle: CSSProperties = {
  margin: '14px 0 0',
  maxWidth: 560,
  fontFamily: fonts.body,
  color: colors.slate,
  fontSize: 16,
  lineHeight: 1.6
}

const cardStyle: CSSProperties = {
  background: colors.surface,
  borderRadius: radius.xl,
  boxShadow: shadows.card,
  border: `1px solid ${colors.hairline}`,
  overflow: 'hidden'
}

const tableWrapperStyle: CSSProperties = {
  overflowX: 'auto'
}

const voucherCellStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  minWidth: 220
}

const thumbnailWrapStyle: CSSProperties = {
  width: 72,
  aspectRatio: '16 / 10',
  flex: '0 0 auto',
  overflow: 'hidden',
  borderRadius: radius.md,
  background: colors.surfaceMuted
}

const thumbnailStyle: CSSProperties = { width: '100%', height: '100%', display: 'block', objectFit: 'cover' }
const thumbnailFallbackStyle: CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  width: '100%',
  height: '100%',
  color: colors.slateMuted,
  fontFamily: fonts.display,
  fontSize: 11,
  fontWeight: 700
}

const detailImageStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  maxHeight: 360,
  objectFit: 'cover',
  borderRadius: radius.lg,
  background: colors.surfaceMuted
}

const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontFamily: fonts.body,
  fontSize: 14
}

const thStyle: CSSProperties = {
  textAlign: 'left',
  padding: '16px 20px',
  borderBottom: `1px solid ${colors.hairline}`,
  fontFamily: fonts.display,
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: colors.slate,
  whiteSpace: 'nowrap'
}

const thNumStyle: CSSProperties = {
  ...thStyle,
  textAlign: 'right'
}

const thActionStyle: CSSProperties = {
  ...thStyle,
  textAlign: 'right'
}

const tdStyle: CSSProperties = {
  padding: '16px 20px',
  borderBottom: `1px solid ${colors.hairline}`,
  color: colors.inkSoft,
  verticalAlign: 'top'
}

const tdNumStyle: CSSProperties = {
  ...tdStyle,
  textAlign: 'right',
  whiteSpace: 'nowrap'
}

const tdActionStyle: CSSProperties = {
  ...tdStyle,
  textAlign: 'right',
  whiteSpace: 'nowrap'
}

const actionRowStyle: CSSProperties = {
  display: 'inline-flex',
  gap: 8,
  justifyContent: 'flex-end',
  flexWrap: 'wrap'
}

const strikeStyle: CSSProperties = {
  marginTop: 2,
  fontSize: 13,
  color: colors.slateMuted,
  textDecoration: 'line-through'
}

const alertStyle: CSSProperties = {
  padding: '14px 18px',
  borderRadius: radius.lg,
  background: colors.dangerSurface,
  border: `1px solid ${colors.dangerSurface}`,
  color: colors.onDangerSurface,
  fontSize: 14,
  fontFamily: fonts.body
}

const emptyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: 64,
  background: colors.surface,
  borderRadius: radius.xl,
  border: `1px solid ${colors.hairline}`,
  boxShadow: shadows.card,
  color: colors.slate,
  fontFamily: fonts.display,
  fontSize: 16,
  fontWeight: 600
}

const linkButtonStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  color: colors.ink,
  cursor: 'pointer',
  padding: 0,
  font: 'inherit',
  textDecoration: 'underline'
}

const detailBadgeRowStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap'
}

const detailGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: 16,
  margin: 0
}

const detailRowStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2
}

const detailTermStyle: CSSProperties = {
  margin: 0,
  fontFamily: fonts.display,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: colors.slateMuted
}

const detailValueStyle: CSSProperties = {
  margin: 0,
  fontFamily: fonts.body,
  fontSize: 15,
  color: colors.ink
}

const labelStyle: CSSProperties = {
  display: 'block',
  marginBottom: 6,
  fontFamily: fonts.display,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: colors.slate
}

const textareaStyle: CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  fontSize: 15,
  fontFamily: fonts.body,
  color: colors.ink,
  background: colors.surface,
  border: `1px solid ${colors.hairline}`,
  borderRadius: radius.md,
  outline: 'none',
  resize: 'vertical',
  boxSizing: 'border-box'
}

const fieldErrorStyle: CSSProperties = {
  margin: '6px 0 0',
  fontSize: 12,
  color: colors.danger
}

export default VoucherApprovalsPage
