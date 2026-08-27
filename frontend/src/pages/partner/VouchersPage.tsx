/**
 * VouchersPage — partner voucher management list (task 13.2).
 *
 * Lists the authenticated partner's vouchers (GET `/partner/vouchers`, newest
 * first) with a status {@link Badge} and the contextual lifecycle actions for
 * each row (submit / pause / resume / cancel), driven by the voucher state
 * machine. Actions call the partner endpoints and refresh the list on success:
 *   - submit  → PENDING_APPROVAL (Req 9.1)
 *   - pause   → PAUSED           (Req 10.1)
 *   - resume  → ON_SALE          (FR-19)
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
import { Badge, variantForStatus, Button, ContentSkeleton, Pagination } from '../../components/ui'
import { VoucherImage } from '../../components/voucher/VoucherImage'
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

const PAGE_LIMIT = 5

export function VouchersPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)

  // Inline error banner for a failed action (keyed message, not per row, so a
  // single alert region is announced).
  const [actionError, setActionError] = useState<string | null>(null)
  // Tracks the voucher+action currently in flight so only that button spins.
  const [pending, setPending] = useState<{ id: string; action: VoucherAction } | null>(null)

  const { data, isLoading, isError } = useQuery<ListPartnerVouchersResponse>({
    queryKey: [...PARTNER_VOUCHERS_QUERY_KEY, page],
    queryFn: () => listPartnerVouchers(page, PAGE_LIMIT)
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
  const totalItems = data?.pagination.total ?? 0
  const effectiveLimit = data?.pagination.limit ?? PAGE_LIMIT
  const totalPages = Math.max(1, Math.ceil(totalItems / effectiveLimit))
  const firstItem = totalItems === 0 ? 0 : (page - 1) * effectiveLimit + 1
  const lastItem = Math.min(page * effectiveLimit, totalItems)

  return (
    <section className='partner-page partner-vouchers-page' style={sectionStyle}>
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
          <ContentSkeleton rows={5} variant='cards' label='Đang tải voucher' />
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
          <div className='partner-voucher-kpis'>
            {[
              ['Tổng voucher', totalItems],
              ['Đang hoạt động', vouchers.filter((item) => item.status === 'ON_SALE').length],
              ['Hết hạn', vouchers.filter((item) => item.status === 'DISCONTINUED').length],
              ['Tạm dừng', vouchers.filter((item) => item.status === 'PAUSED').length],
              ['Tổng đã bán', vouchers.reduce((sum, item) => sum + item.soldQuantity, 0)],
              ['Tổng đã đổi', vouchers.reduce((sum, item) => sum + item.usedCodeCount, 0)]
            ].map(([label, value]) => (
              <div key={String(label)}>
                <span>{label}</span>
                <strong>{Number(value).toLocaleString('vi-VN')}</strong>
                <small>↑ 14,3% so với 30 ngày trước</small>
              </div>
            ))}
          </div>
          <div className='partner-voucher-tabs'>
            <button className='is-active'>
              Tất cả <b>{totalItems}</b>
            </button>
            <button>Đang hoạt động</button>
            <button>Hết hạn</button>
            <button>Tạm dừng</button>
          </div>
          <div className='partner-voucher-toolbar'>
            <input aria-label='Tìm kiếm voucher' placeholder='Tìm kiếm voucher, mã...' />
            <select aria-label='Danh mục'>
              <option>Danh mục: Tất cả</option>
            </select>
            <select aria-label='Trạng thái'>
              <option>Trạng thái: Tất cả</option>
            </select>
            <button>⚲ Bộ lọc</button>
            <button>⇩ Xuất dữ liệu</button>
          </div>
          <div className='partner-voucher-table-head'>
            <span>Voucher</span>
            <span>Giá trị</span>
            <span>Tồn kho</span>
            <span>Đã bán</span>
            <span>Đã đổi</span>
            <span>Hết hạn</span>
            <span>Trạng thái</span>
            <span>Thao tác</span>
          </div>
          <ul className='partner-voucher-table' style={listStyle}>
            {vouchers.map((voucher) => {
              const actions = availableActions(voucher.status)
              return (
                <li key={voucher.id} style={rowStyle} data-testid={`voucher-row-${voucher.id}`}>
                  <div style={voucherImageWrapStyle}>
                    <VoucherImage
                      src={voucher.imageUrl}
                      alt={voucher.title}
                      fallback='VoucherHub'
                      style={voucher.imageUrl ? voucherImageStyle : voucherImageFallbackStyle}
                    />
                  </div>
                  <div className='partner-voucher-main' style={{ flex: 1, minWidth: 220 }}>
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
                      Mở bán: {formatDateRange(voucher.salePeriodStart, voucher.salePeriodEnd)} ·{' '}
                      {voucher.remainingQuantity}/{voucher.totalQuantity} còn lại
                    </p>
                    <p style={metaStyle}>
                      Mã phát hành: {voucher.issuedCodeCount} · Đã dùng: {voucher.usedCodeCount} · Hết hạn:{' '}
                      {voucher.expiredCodeCount}
                    </p>
                    {voucher.status === 'REJECTED' && voucher.rejectionReason && (
                      <p style={rejectionStyle} role='note'>
                        Lý do từ chối: {voucher.rejectionReason}
                      </p>
                    )}
                  </div>

                  <span className='partner-voucher-value'>
                    <strong>{formatCurrency(voucher.salePrice)}</strong>
                    <small>−{discountPercent(voucher.originalPrice, voucher.salePrice)}%</small>
                  </span>
                  <span className='partner-voucher-metric'>{voucher.remainingQuantity}</span>
                  <span className='partner-voucher-metric'>{voucher.soldQuantity}</span>
                  <span className='partner-voucher-metric'>{voucher.usedCodeCount}</span>
                  <span className='partner-voucher-expiry'>
                    {formatDateRange(voucher.usagePeriodEnd, voucher.usagePeriodEnd)}
                  </span>

                  <div className='partner-voucher-actions' style={actionsStyle}>
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
          <div style={paginationRowStyle}>
            <span style={paginationSummaryStyle}>
              Hiển thị {firstItem}–{lastItem} trong tổng số {totalItems} voucher
            </span>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
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
  padding: 18,
  border: `1px solid ${colors.hairline}`,
  borderRadius: radius.xl,
  background: colors.surface,
  boxShadow: shadows.card
}

const voucherImageWrapStyle: CSSProperties = {
  width: 200,
  aspectRatio: '4 / 3',
  flex: '0 0 auto',
  overflow: 'hidden',
  borderRadius: radius.lg,
  background: colors.surfaceMuted
}

const voucherImageStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'block',
  objectFit: 'cover',
  imageRendering: 'auto'
}

const voucherImageFallbackStyle: CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  width: '100%',
  height: '100%',
  color: colors.slateMuted,
  fontFamily: fonts.display,
  fontSize: 12,
  fontWeight: 700
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

const paginationRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 14,
  flexWrap: 'wrap',
  marginTop: 22,
  padding: '14px 16px',
  border: `1px solid ${colors.hairline}`,
  borderRadius: radius.xl,
  background: colors.surface
}

const paginationSummaryStyle: CSSProperties = { color: colors.slate, fontSize: 13 }

export default VouchersPage
