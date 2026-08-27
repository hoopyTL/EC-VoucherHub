/**
 * PartnerApprovalsPage — admin review of pending partner registrations
 * (PAGE-21; FR-ADM-02).
 *
 * Lists every Partner awaiting approval (GET /admin/partners/pending) in an
 * editorial monochrome card with a table of business details — legal name,
 * tax code, representative, and branches. Each row offers:
 *   - "View" → a detail modal with the full registration record (Req 6.1).
 *   - "Approve" → PATCH /admin/partners/:id/approval (Req 6.2).
 *   - "Reject" → a reason modal whose required textarea is sent to
 *     PATCH /admin/partners/:id/approval (Req 6.3).
 *
 * Data is fetched with TanStack Query; approve/reject run as mutations that
 * invalidate the list on success so an actioned partner drops off. Feedback is
 * surfaced through the global toast provider via {@link useToast}.
 *
 * Note: the backend `PartnerApprovalView` does not include branches, so the
 * detail view presents the registration fields the service actually returns.
 *
 * _Requirements: 6.1, 6.2, 6.3 (FR-ADM-02)_
 */
import { useState, type CSSProperties, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { approvePartner, getAdminApiError, listPendingPartners, rejectPartner } from '../../services/admin'
import type { PartnerApprovalView } from '../../types/admin'
import { Badge, Button, ContentSkeleton, Modal, Pagination, useToast, variantForStatus } from '../../components/ui'
import { DataTable } from '../../components/admin/DataTable'
import { formatDateTime, formatStatus } from '../../utils/format'
import { colors, fonts, radius, shadows } from '../../theme/tokens'
import { PartnerManagementSection } from './PartnerManagementSection'

/** Page size for the pending-partners listing. */
const PAGE_LIMIT = 20

/** Base query key for the pending-partners list. */
const PENDING_PARTNERS_QUERY_KEY = 'admin-pending-partners'

export function PartnerApprovalsPage() {
  const queryClient = useQueryClient()
  const toast = useToast()

  const [page, setPage] = useState(1)
  // Partner whose detail modal is open (null when closed).
  const [detail, setDetail] = useState<PartnerApprovalView | null>(null)
  // Partner pending a rejection (null when the reason modal is closed).
  const [rejecting, setRejecting] = useState<PartnerApprovalView | null>(null)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [PENDING_PARTNERS_QUERY_KEY, { page }],
    queryFn: () => listPendingPartners({ page, limit: PAGE_LIMIT })
  })

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: [PENDING_PARTNERS_QUERY_KEY] }),
      queryClient.invalidateQueries({ queryKey: ['admin-partners'] })
    ])
  }

  const approveMutation = useMutation({
    mutationFn: (partner: PartnerApprovalView) => approvePartner(partner.id),
    onSuccess: async (_result, partner) => {
      await invalidate()
      setDetail(null)
      toast.success(`Đã duyệt ${partner.legalName}.`)
    },
    onError: (err) => {
      toast.error(getAdminApiError(err, 'Không thể duyệt đối tác. Vui lòng thử lại.'))
    }
  })

  const rejectMutation = useMutation({
    mutationFn: (vars: { partner: PartnerApprovalView; reason: string }) => rejectPartner(vars.partner.id, vars.reason),
    onSuccess: async (_result, vars) => {
      await invalidate()
      closeReject()
      setDetail(null)
      toast.success(`Đã từ chối ${vars.partner.legalName}.`)
    },
    onError: (err) => {
      setReasonError(getAdminApiError(err, 'Không thể từ chối đối tác. Vui lòng thử lại.'))
    }
  })

  const partners = data?.partners ?? []
  const total = data?.pagination.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT))

  function openReject(partner: PartnerApprovalView) {
    setDetail(null)
    setReason('')
    setReasonError(null)
    setRejecting(partner)
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
      setReasonError('A rejection reason is required.')
      return
    }
    if (rejecting) {
      rejectMutation.mutate({ partner: rejecting, reason: trimmed })
    }
  }

  return (
    <section className='admin-page admin-partner-approvals-page' style={pageStyle}>
      <header
        style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}
      >
        <div>
          <p style={eyebrowStyle}>● PHÊ DUYỆT</p>
          <h1 style={titleStyle}>Duyệt đối tác</h1>
          <p style={subtitleStyle}>
            Xem xét hồ sơ doanh nghiệp và duyệt hoặc từ chối đối tác đăng ký bán hàng trên nền tảng.
          </p>
        </div>
        <Button
          onClick={() =>
            document.getElementById('all-partners-heading')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        >
          + Thêm đối tác
        </Button>
      </header>

      {isLoading && (
        <div style={{ padding: 48 }}>
          <ContentSkeleton rows={5} label='Đang tải đối tác chờ duyệt' />
        </div>
      )}

      {!isLoading && isError && (
        <div role='alert' style={alertStyle}>
          Không thể tải danh sách đối tác chờ duyệt.{' '}
          <button type='button' style={linkButtonStyle} onClick={() => refetch()}>
            Thử lại
          </button>
        </div>
      )}

      {!isLoading && !isError && data && partners.length === 0 && (
        <div style={emptyStyle}>
          <p style={{ margin: 0 }}>Không có đối tác đang chờ duyệt</p>
        </div>
      )}

      {!isLoading && !isError && data && partners.length > 0 && (
        <>
          <div style={cardStyle}>
            <div style={tableWrapperStyle}>
              <DataTable style={tableStyle} accessibleLabel='Danh sách đối tác chờ duyệt'>
                <thead>
                  <tr>
                    <th style={thStyle}>Doanh nghiệp</th>
                    <th style={thStyle}>Mã số thuế</th>
                    <th style={thStyle}>Người đại diện</th>
                    <th style={thStyle}>Trạng thái</th>
                    <th style={thActionStyle}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {partners.map((partner) => (
                    <tr key={partner.id} data-testid={`partner-${partner.id}`}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600, color: colors.ink }}>{partner.legalName}</div>
                        <div style={metaStyle}>{partner.owner.email ?? partner.owner.phone ?? 'Chưa có liên hệ'}</div>
                      </td>
                      <td style={tdStyle}>{partner.taxCode}</td>
                      <td style={tdStyle}>
                        <div>{partner.representative}</div>
                        <div style={metaStyle}>{partner.branches.length} chi nhánh</div>
                      </td>
                      <td style={tdStyle}>
                        <Badge variant={variantForStatus(partner.approvalStatus)}>
                          {formatStatus(partner.approvalStatus)}
                        </Badge>
                      </td>
                      <td style={tdActionStyle}>
                        <div style={actionRowStyle}>
                          <Button
                            size='sm'
                            variant='secondary'
                            onClick={() => setDetail(partner)}
                            aria-label={`Xem ${partner.legalName}`}
                          >
                            Xem
                          </Button>
                          <Button
                            size='sm'
                            variant='primary'
                            isLoading={approveMutation.isPending && approveMutation.variables?.id === partner.id}
                            onClick={() => approveMutation.mutate(partner)}
                            aria-label={`Duyệt ${partner.legalName}`}
                          >
                            Duyệt
                          </Button>
                          <Button
                            size='sm'
                            variant='danger'
                            onClick={() => openReject(partner)}
                            aria-label={`Từ chối ${partner.legalName}`}
                          >
                            Từ chối
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </div>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </>
      )}

      <PartnerManagementSection />

      {/* Partner detail modal */}
      <Modal
        isOpen={detail !== null}
        onClose={() => setDetail(null)}
        title={detail?.legalName}
        size='md'
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
          <dl style={detailListStyle}>
            <DetailRow label='Tên pháp lý doanh nghiệp' value={detail.legalName} />
            <DetailRow label='Mã số thuế' value={detail.taxCode} />
            <DetailRow label='Email' value={detail.owner.email ?? '—'} />
            <DetailRow label='Số điện thoại' value={detail.owner.phone ?? '—'} />
            <DetailRow label='Người đại diện' value={detail.representative} />
            <DetailRow label='Chi nhánh' value={detail.branches.map((branch) => branch.name).join(', ')} />
            <DetailRow label='Ngày gửi duyệt' value={formatDateTime(detail.createdAt) || '—'} />
          </dl>
        )}
      </Modal>

      {/* Reject reason modal */}
      <Modal
        isOpen={rejecting !== null}
        onClose={closeReject}
        title='Từ chối đối tác'
        size='sm'
        footer={
          <>
            <Button variant='secondary' onClick={closeReject}>
              Hủy
            </Button>
            <Button variant='danger' type='submit' form='reject-partner-form' isLoading={rejectMutation.isPending}>
              Từ chối đối tác
            </Button>
          </>
        }
      >
        <form id='reject-partner-form' onSubmit={handleRejectSubmit}>
          {rejecting && (
            <p style={{ margin: '0 0 12px', color: colors.slate }}>
              Provide a reason for rejecting <strong style={{ color: colors.ink }}>{rejecting.legalName}</strong>. This
              is stored with this application for audit and follow-up.
            </p>
          )}
          <label htmlFor='partner-reject-reason' style={labelStyle}>
            Lý do từ chối
            <span aria-hidden='true' style={{ color: colors.danger, marginLeft: 2 }}>
              *
            </span>
          </label>
          <textarea
            id='partner-reject-reason'
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
              if (reasonError) setReasonError(null)
            }}
            rows={4}
            placeholder='Nhập lý do từ chối hồ sơ đối tác…'
            aria-invalid={reasonError ? true : undefined}
            aria-describedby={reasonError ? 'partner-reject-error' : undefined}
            style={{
              ...textareaStyle,
              borderColor: reasonError ? colors.danger : colors.hairline
            }}
          />
          {reasonError && (
            <p id='partner-reject-error' role='alert' style={fieldErrorStyle}>
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

const metaStyle: CSSProperties = {
  marginTop: 2,
  fontSize: 13,
  color: colors.slateMuted
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

const detailListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  margin: 0
}

const detailRowStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2
}

const detailTermStyle: CSSProperties = {
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

export default PartnerApprovalsPage
