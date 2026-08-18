import { useState, type CSSProperties, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { VoucherDto } from '@voucher/shared'

import { Badge, Button, LoadingSpinner, Modal, useToast, variantForStatus } from '../../components/ui'
import { changeAdminVoucherStatus, getAdminApiError, listAdminVouchers, rejectVoucher } from '../../services/admin'
import { colors, fonts, radius, shadows } from '../../theme/tokens'
import { formatCurrency, formatDateRange, formatStatus } from '../../utils/format'

const ALL_VOUCHERS_KEY = ['admin-vouchers-all'] as const
type StatusAction = 'publish' | 'suspend' | 'resume' | 'discontinue'

const ACTIONS: Partial<Record<VoucherDto['status'], Array<{ action: StatusAction; label: string }>>> = {
  APPROVED: [{ action: 'publish', label: 'Công bố' }],
  ON_SALE: [
    { action: 'suspend', label: 'Tạm ngưng' },
    { action: 'discontinue', label: 'Ngừng bán' }
  ],
  PAUSED: [
    { action: 'resume', label: 'Mở bán lại' },
    { action: 'discontinue', label: 'Ngừng bán' }
  ]
}

export function VoucherManagementSection() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [confirming, setConfirming] = useState<{ voucher: VoucherDto; action: StatusAction } | null>(null)
  const [revoking, setRevoking] = useState<VoucherDto | null>(null)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string | null>(null)
  const query = useQuery({ queryKey: ALL_VOUCHERS_KEY, queryFn: () => listAdminVouchers({ page: 1, limit: 100 }) })
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ALL_VOUCHERS_KEY }),
      queryClient.invalidateQueries({ queryKey: ['admin-pending-vouchers'] })
    ])
  }

  const statusMutation = useMutation({
    mutationFn: ({ voucher, action }: { voucher: VoucherDto; action: StatusAction }) =>
      changeAdminVoucherStatus(voucher.id, action),
    onSuccess: async (voucher) => {
      await refresh()
      setConfirming(null)
      toast.success(`Đã cập nhật trạng thái “${voucher.name}”.`)
    },
    onError: (error) => toast.error(getAdminApiError(error, 'Không thể cập nhật trạng thái voucher.'))
  })

  const revokeMutation = useMutation({
    mutationFn: ({ voucher, reason }: { voucher: VoucherDto; reason: string }) => rejectVoucher(voucher.id, reason),
    onSuccess: async () => {
      await refresh()
      setRevoking(null)
      setReason('')
      toast.success('Đã thu hồi phê duyệt voucher.')
    },
    onError: (error) => setReasonError(getAdminApiError(error, 'Không thể thu hồi phê duyệt voucher.'))
  })

  function requestAction(voucher: VoucherDto, action: StatusAction) {
    if (action === 'discontinue') setConfirming({ voucher, action })
    else statusMutation.mutate({ voucher, action })
  }

  function submitRevoke(event: FormEvent) {
    event.preventDefault()
    const trimmed = reason.trim()
    if (!trimmed) {
      setReasonError('Lý do thu hồi là bắt buộc.')
      return
    }
    if (revoking) revokeMutation.mutate({ voucher: revoking, reason: trimmed })
  }

  const vouchers = query.data?.vouchers.filter((voucher) => voucher.status !== 'PENDING_REVIEW') ?? []

  return (
    <section aria-labelledby='voucher-management-title' style={sectionStyle}>
      <div>
        <h2 id='voucher-management-title' style={headingStyle}>
          Quản lý vòng đời voucher
        </h2>
        <p style={descriptionStyle}>
          Công bố voucher đã duyệt, quản lý voucher đang bán và theo dõi voucher đã ngừng bán.
        </p>
      </div>

      {query.isLoading && <LoadingSpinner label='Đang tải danh sách voucher' />}
      {query.isError && (
        <div role='alert' style={alertStyle}>
          Không thể tải danh sách voucher.{' '}
          <button type='button' style={retryStyle} onClick={() => query.refetch()}>
            Thử lại
          </button>
        </div>
      )}
      {!query.isLoading && !query.isError && vouchers.length === 0 && (
        <div style={emptyStyle}>Chưa có voucher để quản lý.</div>
      )}

      <div style={listStyle}>
        {vouchers.map((voucher) => {
          const actions = ACTIONS[voucher.status] ?? []
          return (
            <article key={voucher.id} style={cardStyle}>
              <div style={imageWrapStyle}>
                {voucher.imageUrl ? (
                  <img src={voucher.imageUrl} alt='' style={imageStyle} />
                ) : (
                  <span style={imageFallbackStyle}>VoucherHub</span>
                )}
              </div>
              <div style={contentStyle}>
                <div style={topRowStyle}>
                  <div>
                    <p style={partnerStyle}>{voucher.partner.legalName}</p>
                    <h3 style={titleStyle}>{voucher.name}</h3>
                  </div>
                  <Badge variant={variantForStatus(voucher.status)}>{formatStatus(voucher.status)}</Badge>
                </div>
                <p style={descriptionTextStyle}>{voucher.description}</p>
                <div style={statsStyle}>
                  <span>
                    Giá bán <strong>{formatCurrency(voucher.salePrice)}</strong>
                  </span>
                  <span>
                    Đã bán{' '}
                    <strong>
                      {voucher.soldQuantity}/{voucher.totalQuantity}
                    </strong>
                  </span>
                  <span>
                    Mã đã dùng <strong>{voucher.usedCodeCount}</strong>
                  </span>
                  <span>
                    Thời gian bán <strong>{formatDateRange(voucher.saleStart, voucher.saleEnd)}</strong>
                  </span>
                </div>
                {voucher.rejectReason && <p style={reasonStyle}>Lý do từ chối: {voucher.rejectReason}</p>}
                <div style={actionsStyle}>
                  {voucher.status === 'APPROVED' && (
                    <Button
                      size='sm'
                      variant='danger'
                      onClick={() => {
                        setRevoking(voucher)
                        setReason('')
                        setReasonError(null)
                      }}
                    >
                      Thu hồi duyệt
                    </Button>
                  )}
                  {actions.map(({ action, label }) => (
                    <Button
                      key={action}
                      size='sm'
                      variant={action === 'discontinue' ? 'danger' : 'secondary'}
                      isLoading={
                        statusMutation.isPending &&
                        statusMutation.variables?.voucher.id === voucher.id &&
                        statusMutation.variables.action === action
                      }
                      disabled={statusMutation.isPending}
                      onClick={() => requestAction(voucher, action)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <Modal
        isOpen={confirming !== null}
        onClose={() => setConfirming(null)}
        title='Xác nhận ngừng bán'
        size='sm'
        footer={
          <>
            <Button variant='secondary' onClick={() => setConfirming(null)}>
              Hủy
            </Button>
            <Button
              variant='danger'
              isLoading={statusMutation.isPending}
              onClick={() => confirming && statusMutation.mutate(confirming)}
            >
              Ngừng bán
            </Button>
          </>
        }
      >
        <p style={{ margin: 0, color: colors.slate }}>
          Voucher “{confirming?.voucher.name}” sẽ chuyển sang trạng thái ngừng bán vĩnh viễn và không thể mở bán lại.
        </p>
      </Modal>

      <Modal
        isOpen={revoking !== null}
        onClose={() => setRevoking(null)}
        title='Thu hồi phê duyệt'
        size='sm'
        footer={
          <>
            <Button variant='secondary' onClick={() => setRevoking(null)}>
              Hủy
            </Button>
            <Button variant='danger' type='submit' form='revoke-voucher-form' isLoading={revokeMutation.isPending}>
              Thu hồi
            </Button>
          </>
        }
      >
        <form id='revoke-voucher-form' onSubmit={submitRevoke}>
          <label htmlFor='revoke-voucher-reason' style={labelStyle}>
            Lý do thu hồi *
          </label>
          <textarea
            id='revoke-voucher-reason'
            rows={4}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value)
              setReasonError(null)
            }}
            style={textareaStyle}
          />
          {reasonError && (
            <p role='alert' style={fieldErrorStyle}>
              {reasonError}
            </p>
          )}
        </form>
      </Modal>
    </section>
  )
}

const sectionStyle: CSSProperties = { display: 'grid', gap: 18, marginTop: 28 }
const headingStyle: CSSProperties = { margin: 0, fontFamily: fonts.display, fontSize: 30, color: colors.ink }
const descriptionStyle: CSSProperties = { margin: '6px 0 0', color: colors.slate }
const listStyle: CSSProperties = { display: 'grid', gap: 16 }
const cardStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(180px, 240px) 1fr',
  overflow: 'hidden',
  background: colors.surface,
  border: `1px solid ${colors.hairline}`,
  borderRadius: radius.xl,
  boxShadow: shadows.card
}
const imageWrapStyle: CSSProperties = { minHeight: 220, background: colors.surfaceMuted, overflow: 'hidden' }
const imageStyle: CSSProperties = { width: '100%', height: '100%', objectFit: 'cover', display: 'block' }
const imageFallbackStyle: CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  height: '100%',
  minHeight: 220,
  color: colors.slateMuted,
  fontFamily: fonts.display,
  fontWeight: 700
}
const contentStyle: CSSProperties = { padding: 24, minWidth: 0 }
const topRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  alignItems: 'flex-start'
}
const partnerStyle: CSSProperties = {
  margin: '0 0 6px',
  color: colors.slate,
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.06em'
}
const titleStyle: CSSProperties = { margin: 0, fontFamily: fonts.display, fontSize: 22, color: colors.ink }
const descriptionTextStyle: CSSProperties = { margin: '12px 0', color: colors.slate, lineHeight: 1.5 }
const statsStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '10px 28px',
  color: colors.ink,
  fontSize: 14
}
const reasonStyle: CSSProperties = {
  padding: 10,
  borderRadius: radius.md,
  background: colors.dangerSurface,
  color: colors.onDangerSurface
}
const actionsStyle: CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18 }
const alertStyle: CSSProperties = {
  padding: 14,
  borderRadius: radius.md,
  background: colors.dangerSurface,
  color: colors.onDangerSurface
}
const emptyStyle: CSSProperties = {
  padding: 32,
  borderRadius: radius.lg,
  background: colors.surface,
  color: colors.slate
}
const retryStyle: CSSProperties = {
  border: 0,
  background: 'transparent',
  color: 'inherit',
  textDecoration: 'underline',
  cursor: 'pointer'
}
const labelStyle: CSSProperties = {
  display: 'block',
  marginBottom: 6,
  fontFamily: fonts.display,
  fontWeight: 600,
  color: colors.slate
}
const textareaStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: 12,
  borderRadius: radius.md,
  border: `1px solid ${colors.hairlineStrong}`,
  font: 'inherit',
  resize: 'vertical'
}
const fieldErrorStyle: CSSProperties = { margin: '6px 0 0', color: colors.danger, fontSize: 13 }
