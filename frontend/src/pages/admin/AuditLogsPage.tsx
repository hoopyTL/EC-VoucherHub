import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ScrollText,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Clock,
  User,
  Shield,
  Layers,
  FileJson,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Unlock,
  Tag
} from 'lucide-react'
import { listAdminAuditLogs, type AdminAuditLogItem, type ListAdminAuditLogsParams } from '../../services/admin'
import { colors, fonts, radius, shadows } from '../../theme/tokens'
import { Badge, Button, Modal, ContentSkeleton } from '../../components/ui'
import { formatDate } from '../../utils/format'

const ACTION_LABELS: Record<
  string,
  { label: string; variant: 'success' | 'danger' | 'warning' | 'info' | 'neutral'; icon?: typeof CheckCircle2 }
> = {
  // Admin actions
  'voucher.approve': { label: 'Duyệt voucher', variant: 'success', icon: CheckCircle2 },
  'voucher.reject': { label: 'Từ chối voucher', variant: 'danger', icon: XCircle },
  'voucher.suspend': { label: 'Tạm dừng voucher', variant: 'warning', icon: AlertTriangle },
  'voucher.resume': { label: 'Mở lại voucher', variant: 'info', icon: CheckCircle2 },
  'voucher.discontinue': { label: 'Hủy voucher', variant: 'neutral', icon: XCircle },
  'partner.approve': { label: 'Duyệt đối tác', variant: 'success', icon: CheckCircle2 },
  'partner.reject': { label: 'Từ chối đối tác', variant: 'danger', icon: XCircle },
  'partner.lock': { label: 'Khóa đối tác', variant: 'danger', icon: Lock },
  'partner.unlock': { label: 'Mở khóa đối tác', variant: 'success', icon: Unlock },
  'user.lock': { label: 'Khóa người dùng', variant: 'danger', icon: Lock },
  'user.unlock': { label: 'Mở khóa người dùng', variant: 'success', icon: Unlock },
  'user.role_change': { label: 'Đổi vai trò', variant: 'info', icon: Shield },
  'order.cancel': { label: 'Hủy & hoàn tiền', variant: 'warning', icon: AlertTriangle },
  'order.demo-ready': { label: 'Đơn hàng thử nghiệm', variant: 'info', icon: CheckCircle2 },
  'content.create': { label: 'Tạo nội dung', variant: 'success', icon: Tag },
  'content.update': { label: 'Sửa nội dung', variant: 'info', icon: Tag },
  'content.publish': { label: 'Xuất bản nội dung', variant: 'success', icon: Tag },
  'content.archive': { label: 'Lưu trữ nội dung', variant: 'neutral', icon: Tag },
  'seed.database': { label: 'Khởi tạo hệ thống', variant: 'neutral', icon: Layers },

  // Partner actions
  'voucher.submit': { label: 'Gửi duyệt voucher', variant: 'info', icon: Tag },
  'voucher.create': { label: 'Tạo bản nháp', variant: 'info', icon: Tag },
  'branch.create': { label: 'Thêm chi nhánh', variant: 'info', icon: Layers },
  'staff.create': { label: 'Thêm nhân viên', variant: 'info', icon: User },

  // Staff actions
  'redemption.verify': { label: 'Kiểm tra mã', variant: 'info', icon: CheckCircle2 },
  'redemption.redeem': { label: 'Xác nhận đổi mã', variant: 'success', icon: CheckCircle2 },

  // Customer actions
  'order.create': { label: 'Đặt mua voucher', variant: 'info', icon: Tag },
  'payment.success': { label: 'Thanh toán thành công', variant: 'success', icon: CheckCircle2 },
  'review.create': { label: 'Đánh giá voucher', variant: 'success', icon: CheckCircle2 }
}

const ENTITY_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  voucher_product: { label: 'Voucher', bg: '#fef3c7', color: '#b45309' },
  partner: { label: 'Đối tác', bg: '#e0e7ff', color: '#4338ca' },
  user: { label: 'Người dùng', bg: '#e0f2fe', color: '#0369a1' },
  order: { label: 'Đơn hàng', bg: '#fce7f3', color: '#be185d' },
  content_item: { label: 'Nội dung', bg: '#d1fae5', color: '#047857' },
  branch: { label: 'Chi nhánh', bg: '#fef9c3', color: '#854d0e' },
  staff: { label: 'Nhân viên', bg: '#f3e8ff', color: '#7e22ce' },
  voucher_code: { label: 'Mã voucher', bg: '#ecfdf5', color: '#065f46' },
  review: { label: 'Đánh giá', bg: '#fff7ed', color: '#c2410c' },
  database: { label: 'Hệ thống', bg: '#f1f5f9', color: '#475569' }
}

export function AuditLogsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEntityType, setSelectedEntityType] = useState<string>('ALL')
  const [selectedAction, setSelectedAction] = useState<string>('ALL')
  const [inspectingLog, setInspectingLog] = useState<AdminAuditLogItem | null>(null)

  const queryParams: ListAdminAuditLogsParams = {
    entityType: selectedEntityType !== 'ALL' ? selectedEntityType : undefined,
    action: selectedAction !== 'ALL' ? selectedAction : undefined,
    q: searchQuery.trim() || undefined,
    limit: 100
  }

  const {
    data: logs = [],
    isLoading,
    isError,
    refetch,
    isFetching
  } = useQuery({
    queryKey: ['admin-audit-logs', selectedEntityType, selectedAction, searchQuery],
    queryFn: () => listAdminAuditLogs(queryParams)
  })

  // Distinct actors count
  const uniqueActorsCount = new Set(logs.map((l) => l.actor?.email).filter(Boolean)).size

  return (
    <div className='admin-page admin-audit-page' style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 60 }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 28
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: '0.78rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                background: '#f1f5f9',
                color: colors.slate,
                padding: '2px 8px',
                borderRadius: 4
              }}
            >
              <ScrollText size={13} />
              Bảo mật & Kiểm toán
            </span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: colors.ink, margin: 0, fontFamily: fonts.display }}>
            Nhật ký kiểm toán hệ thống
          </h1>
          <p style={{ fontSize: '0.92rem', color: colors.slate, margin: '4px 0 0' }}>
            Theo dõi và đối soát mọi thao tác quản trị, thay đổi trạng thái và phê duyệt trên hệ thống (FR-23 /
            FLOW-012).
          </p>
        </div>

        <Button
          variant='secondary'
          onClick={() => refetch()}
          disabled={isFetching}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
          Làm mới
        </Button>
      </div>

      {/* KPI Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 24
        }}
      >
        <div
          style={{
            background: '#ffffff',
            padding: '18px 20px',
            borderRadius: radius.md,
            border: `1px solid ${colors.hairline}`,
            boxShadow: shadows.sm
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: colors.slate }}>Tổng số bản ghi</span>
            <Layers size={16} color={colors.slateMuted} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: colors.ink, fontFamily: fonts.display }}>
            {logs.length}
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            padding: '18px 20px',
            borderRadius: radius.md,
            border: `1px solid ${colors.hairline}`,
            boxShadow: shadows.sm
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: colors.slate }}>Quản trị viên thao tác</span>
            <User size={16} color='#0369a1' />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0369a1', fontFamily: fonts.display }}>
            {uniqueActorsCount}
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            padding: '18px 20px',
            borderRadius: radius.md,
            border: `1px solid ${colors.hairline}`,
            boxShadow: shadows.sm
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: colors.slate }}>Ghi nhận mới nhất</span>
            <Clock size={16} color='#047857' />
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#047857', fontFamily: fonts.body }}>
            {logs[0] ? formatDate(logs[0].createdAt) : '—'}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          background: '#ffffff',
          padding: '16px 20px',
          borderRadius: radius.md,
          border: `1px solid ${colors.hairline}`,
          boxShadow: shadows.sm,
          marginBottom: 20,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 280 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={16}
              color={colors.slateMuted}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type='text'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Tìm theo email admin, mã thực thể, hành động...'
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: radius.sm,
                border: `1px solid ${colors.hairline}`,
                fontSize: '0.9rem',
                outline: 'none',
                fontFamily: fonts.body
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Entity Type Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Filter size={14} color={colors.slate} />
            <select
              value={selectedEntityType}
              onChange={(e) => setSelectedEntityType(e.target.value)}
              aria-label='Lọc theo loại thực thể'
              style={{
                padding: '8px 12px',
                borderRadius: radius.sm,
                border: `1px solid ${colors.hairline}`,
                fontSize: '0.88rem',
                fontFamily: fonts.body,
                background: '#ffffff',
                color: colors.ink
              }}
            >
              <option value='ALL'>Tất cả thực thể</option>
              <option value='voucher_product'>Voucher</option>
              <option value='partner'>Đối tác</option>
              <option value='user'>Người dùng</option>
              <option value='order'>Đơn hàng</option>
              <option value='content_item'>Nội dung</option>
              <option value='branch'>Chi nhánh</option>
              <option value='staff'>Nhân viên</option>
              <option value='review'>Đánh giá</option>
            </select>
          </div>

          {/* Action Filter */}
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            aria-label='Lọc theo loại hành động'
            style={{
              padding: '8px 12px',
              borderRadius: radius.sm,
              border: `1px solid ${colors.hairline}`,
              fontSize: '0.88rem',
              fontFamily: fonts.body,
              background: '#ffffff',
              color: colors.ink
            }}
          >
            <option value='ALL'>Tất cả hành động</option>
            <option value='voucher.'>Nhóm Voucher (Duyệt, Tạo, Từ chối, Dừng...)</option>
            <option value='partner.'>Nhóm Đối tác (Duyệt, Khóa, Mở khóa...)</option>
            <option value='user.'>Nhóm Người dùng (Khóa, Đổi vai trò...)</option>
            <option value='order.'>Nhóm Đơn hàng (Đặt mua, Hủy, Hoàn tiền...)</option>
            <option value='content.'>Nhóm Nội dung (Tạo, Sửa, Xuất bản, Lưu trữ...)</option>
            <option value='redemption.'>Nhóm Soát vé (Kiểm tra, Đổi mã...)</option>
            <option value='review.'>Nhóm Đánh giá (Tạo nhận xét...)</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: radius.md,
          border: `1px solid ${colors.hairline}`,
          boxShadow: shadows.sm,
          overflow: 'hidden'
        }}
      >
        {isLoading ? (
          <div style={{ padding: 24 }}>
            <ContentSkeleton rows={6} label='Đang tải nhật ký kiểm toán...' />
          </div>
        ) : isError ? (
          <div style={{ padding: 48, textAlign: 'center', color: colors.danger }}>
            Không thể tải dữ liệu nhật ký. Vui lòng thử lại.
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 64, textAlign: 'center' }}>
            <ScrollText size={48} color={colors.slateMuted} style={{ marginBottom: 12 }} />
            <h3 style={{ fontSize: '1.1rem', color: colors.ink, margin: '0 0 6px' }}>Không có bản ghi nhật ký</h3>
            <p style={{ fontSize: '0.9rem', color: colors.slate, margin: 0 }}>
              {searchQuery || selectedEntityType !== 'ALL' || selectedAction !== 'ALL'
                ? 'Không tìm thấy nhật ký phù hợp với bộ lọc hiện tại.'
                : 'Chưa có hoạt động quản trị nào được ghi nhận.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr
                  style={{ background: '#f8fafc', borderBottom: `1px solid ${colors.hairline}`, color: colors.slate }}
                >
                  <th style={{ padding: '14px 18px', fontWeight: 600 }}>Thời gian</th>
                  <th style={{ padding: '14px 18px', fontWeight: 600 }}>Người thực hiện (Actor)</th>
                  <th style={{ padding: '14px 18px', fontWeight: 600 }}>Hành động</th>
                  <th style={{ padding: '14px 18px', fontWeight: 600 }}>Đối tượng</th>
                  <th style={{ padding: '14px 18px', fontWeight: 600 }}>Mã đối tượng (ID)</th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, textAlign: 'right' }}>Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const actionCfg = ACTION_LABELS[log.action] ?? {
                    label: log.action,
                    variant: 'neutral' as const
                  }
                  const entityCfg = ENTITY_LABELS[log.entityType] ?? {
                    label: log.entityType,
                    bg: '#f1f5f9',
                    color: colors.slate
                  }

                  return (
                    <tr
                      key={log.id}
                      style={{
                        borderBottom: `1px solid ${colors.hairline}`,
                        transition: 'background 0.15s ease'
                      }}
                    >
                      {/* Timestamp */}
                      <td style={{ padding: '14px 18px', whiteSpace: 'nowrap', color: colors.ink }}>
                        <div style={{ fontWeight: 600 }}>{formatDate(log.createdAt)}</div>
                      </td>

                      {/* Actor */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 600, color: colors.ink }}>{log.actor?.fullName || 'Hệ thống'}</div>
                        <div style={{ fontSize: '0.78rem', color: colors.slate }}>
                          {log.actor?.email || 'system@voucherhub.internal'}
                        </div>
                      </td>

                      {/* Action */}
                      <td style={{ padding: '14px 18px' }}>
                        <Badge variant={actionCfg.variant}>{actionCfg.label}</Badge>
                      </td>

                      {/* Entity Type */}
                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: 4,
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            background: entityCfg.bg,
                            color: entityCfg.color
                          }}
                        >
                          {entityCfg.label}
                        </span>
                      </td>

                      {/* Entity ID */}
                      <td
                        style={{
                          padding: '14px 18px',
                          fontFamily: 'monospace',
                          fontSize: '0.82rem',
                          color: colors.slate
                        }}
                      >
                        {log.entityId ? (
                          <span title={log.entityId}>
                            {log.entityId.length > 12 ? `${log.entityId.slice(0, 10)}...` : log.entityId}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Action detail button */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <Button
                          variant='secondary'
                          size='sm'
                          onClick={() => setInspectingLog(log)}
                          style={{
                            padding: '4px 10px',
                            fontSize: '0.8rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <Eye size={13} />
                          Xem
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Metadata Detail Modal */}
      <Modal isOpen={Boolean(inspectingLog)} onClose={() => setInspectingLog(null)} title='Chi tiết bản ghi kiểm toán'>
        {inspectingLog && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Header info summary */}
            <div
              style={{
                background: '#f8fafc',
                padding: '14px 16px',
                borderRadius: radius.md,
                border: `1px solid ${colors.hairline}`,
                fontSize: '0.88rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 12
              }}
            >
              <div>
                <span style={{ color: colors.slate, fontSize: '0.78rem', display: 'block' }}>Hành động</span>
                <strong style={{ color: colors.ink }}>{inspectingLog.action}</strong>
              </div>
              <div>
                <span style={{ color: colors.slate, fontSize: '0.78rem', display: 'block' }}>Thời gian</span>
                <strong style={{ color: colors.ink }}>{formatDate(inspectingLog.createdAt)}</strong>
              </div>
              <div>
                <span style={{ color: colors.slate, fontSize: '0.78rem', display: 'block' }}>Đối tượng</span>
                <strong style={{ color: colors.ink }}>
                  {inspectingLog.entityType} ({inspectingLog.entityId || 'N/A'})
                </strong>
              </div>
              <div>
                <span style={{ color: colors.slate, fontSize: '0.78rem', display: 'block' }}>Người thực hiện</span>
                <strong style={{ color: colors.ink }}>
                  {inspectingLog.actor?.fullName || 'Hệ thống'} ({inspectingLog.actor?.email || 'system'})
                </strong>
              </div>
            </div>

            {/* Metadata JSON Inspector */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <FileJson size={15} color={colors.slate} />
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: colors.ink }}>
                  Dữ liệu thay đổi (Metadata):
                </span>
              </div>
              <pre
                style={{
                  background: '#0f172a',
                  color: '#38bdf8',
                  padding: '14px 16px',
                  borderRadius: radius.md,
                  fontSize: '0.82rem',
                  lineHeight: 1.5,
                  fontFamily: 'monospace',
                  overflowX: 'auto',
                  maxHeight: 280,
                  margin: 0
                }}
              >
                {inspectingLog.metadata
                  ? JSON.stringify(inspectingLog.metadata, null, 2)
                  : '// Không có dữ liệu metadata bổ sung'}
              </pre>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <Button variant='secondary' onClick={() => setInspectingLog(null)}>
                Đóng
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
