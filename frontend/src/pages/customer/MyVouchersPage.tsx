import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useMemo, useState, type CSSProperties } from 'react'
import { api } from '../../services/api'
import type { MyVoucher } from '../../types/customer'
import { Badge, Button, ContentSkeleton, Modal } from '../../components/ui'
import { QRCodeDisplay } from '../../components/common/QRCodeDisplay'
import { VoucherImage } from '../../components/voucher/VoucherImage'
import { formatDate, formatDateTime } from '../../utils/format'
import { colors, fonts, radius, shadows } from '../../theme/tokens'

type VoucherTab = 'unused' | 'used' | 'expired'

async function fetchMyVouchers(): Promise<MyVoucher[]> {
  const { data } = await api.get<{ data?: MyVoucher[] } | MyVoucher[]>('/my-vouchers')
  return (data as { data?: MyVoucher[] }).data ?? (data as MyVoucher[])
}

function groupFor(code: MyVoucher): VoucherTab {
  if (code.status === 'UNUSED' && code.remainingUses > 0) return 'unused'
  if (code.status === 'USED' || code.remainingUses === 0) return 'used'
  return 'expired'
}

function statusPresentation(code: MyVoucher) {
  if (groupFor(code) === 'unused') return { label: 'Chưa sử dụng', variant: 'warning' as const }
  if (groupFor(code) === 'used') return { label: 'Đã sử dụng', variant: 'success' as const }
  if (code.status === 'LOCKED') return { label: 'Đã khóa', variant: 'danger' as const }
  if (code.status === 'CANCELLED') return { label: 'Đã hủy', variant: 'danger' as const }
  return { label: 'Hết hạn', variant: 'danger' as const }
}

export function MyVouchersPage() {
  const [activeTab, setActiveTab] = useState<VoucherTab>('unused')
  const [selectedCode, setSelectedCode] = useState<MyVoucher | null>(null)
  const {
    data: vouchers = [],
    isLoading,
    isError
  } = useQuery({
    queryKey: ['my-vouchers'],
    queryFn: fetchMyVouchers
  })

  const grouped = useMemo(
    () => ({
      unused: vouchers.filter((code) => groupFor(code) === 'unused'),
      used: vouchers.filter((code) => groupFor(code) === 'used'),
      expired: vouchers.filter((code) => groupFor(code) === 'expired')
    }),
    [vouchers]
  )
  const visibleVouchers = grouped[activeTab]

  const tabs: Array<{ key: VoucherTab; label: string }> = [
    { key: 'unused', label: 'Chưa sử dụng' },
    { key: 'used', label: 'Đã sử dụng' },
    { key: 'expired', label: 'Hết hạn' }
  ]

  return (
    <section style={pageStyle}>
      <h1 style={headingStyle}>Voucher của tôi</h1>
      <p style={introStyle}>Mỗi thẻ bên dưới là một mã voucher riêng biệt của bạn.</p>

      <div role='tablist' aria-label='Lọc voucher theo trạng thái' style={tabListStyle}>
        {tabs.map((tab) => {
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type='button'
              role='tab'
              aria-selected={active}
              onClick={() => setActiveTab(tab.key)}
              style={tabStyle(active)}
            >
              {tab.label} <span style={countStyle(active)}>{grouped[tab.key].length}</span>
            </button>
          )
        })}
      </div>

      {isLoading && <ContentSkeleton rows={4} label='Đang tải voucher của bạn' />}

      {isError && (
        <div role='alert' style={alertStyle}>
          Không thể tải voucher của bạn. Vui lòng thử lại sau.
        </div>
      )}

      {!isLoading && !isError && visibleVouchers.length === 0 && (
        <div style={emptyStyle}>
          <p style={{ margin: 0 }}>Bạn chưa có voucher nào trong nhóm này.</p>
          {activeTab === 'unused' && (
            <Link to='/search' style={linkStyle}>
              Khám phá voucher →
            </Link>
          )}
        </div>
      )}

      {!isLoading && !isError && visibleVouchers.length > 0 && (
        <div className='my-voucher-grid' style={gridStyle}>
          {visibleVouchers.map((code) => {
            const status = statusPresentation(code)
            const usable = groupFor(code) === 'unused'
            return (
              <article key={code.id} className={`my-voucher-card my-voucher-card--${groupFor(code)}`} style={cardStyle}>
                <div style={imageWrapStyle}>
                  <VoucherImage
                    src={code.voucher.imageUrl}
                    alt={code.voucher.name}
                    fallback={code.voucher.name.slice(0, 2).toLocaleUpperCase('vi')}
                    style={{
                      ...(code.voucher.imageUrl ? imageStyle : imageFallbackStyle),
                      filter: usable ? 'none' : 'grayscale(.7)',
                      opacity: usable ? 1 : 0.68
                    }}
                  />
                  {!usable && (
                    <span style={statusOverlayStyle(groupFor(code))}>
                      {groupFor(code) === 'used' ? 'ĐÃ DÙNG' : 'HẾT HẠN'}
                    </span>
                  )}
                </div>

                <div style={contentStyle}>
                  <div style={titleRowStyle}>
                    <div style={{ minWidth: 0 }}>
                      <h2 style={cardTitleStyle}>{code.voucher.name}</h2>
                      <p style={partnerStyle}>{code.voucher.partnerName}</p>
                    </div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>

                  <p style={codeStyle}>Mã: {code.code}</p>
                  <div style={metaStyle}>
                    <span>
                      Còn {code.remainingUses}/{code.totalUses} lượt
                    </span>
                    <span>Hết hạn: {formatDate(code.expiresAt)}</span>
                    {code.lastUsedAt && <span>Dùng gần nhất: {formatDateTime(code.lastUsedAt)}</span>}
                    {code.lastUsedBranch && <span>Chi nhánh: {code.lastUsedBranch.name}</span>}
                  </div>

                  <div style={actionsStyle}>
                    <Button size='sm' disabled={!usable} onClick={() => setSelectedCode(code)}>
                      {usable ? 'Hiển thị QR' : status.label}
                    </Button>
                    <Link to={`/orders/${code.order.id}`} style={linkStyle}>
                      Xem đơn hàng
                    </Link>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <Modal
        isOpen={Boolean(selectedCode)}
        onClose={() => setSelectedCode(null)}
        title={selectedCode?.voucher.name ?? 'Mã voucher'}
        size='sm'
      >
        {selectedCode && (
          <div style={qrContentStyle}>
            <div style={qrHeaderStyle}>
              <span style={qrBrandStyle}>VH</span>
              <span>
                <strong>VoucherHub Pass</strong>
                <small style={{ display: 'block', color: colors.slate }}>Quét để xác nhận sử dụng</small>
              </span>
            </div>
            <QRCodeDisplay value={selectedCode.code} size={280} style={{ maxWidth: '100%', height: 'auto' }} />
            <strong style={qrCodeStyle}>{selectedCode.code}</strong>
            <Badge variant='warning'>Sẵn sàng sử dụng</Badge>
            <span style={{ color: colors.slate }}>
              Còn {selectedCode.remainingUses}/{selectedCode.totalUses} lượt · Hết hạn{' '}
              {formatDate(selectedCode.expiresAt)}
            </span>
            <small style={qrHintStyle}>
              Không chia sẻ ảnh mã này. Hãy đưa trực tiếp cho nhân viên tại điểm sử dụng voucher.
            </small>
          </div>
        )}
      </Modal>
    </section>
  )
}

const pageStyle: CSSProperties = { maxWidth: 1180, margin: '0 auto' }
const headingStyle: CSSProperties = {
  margin: 0,
  fontFamily: fonts.display,
  fontSize: 48,
  fontWeight: 800,
  letterSpacing: '-0.03em',
  color: colors.ink
}
const introStyle: CSSProperties = { margin: '8px 0 24px', color: colors.slate }
const tabListStyle: CSSProperties = {
  display: 'flex',
  width: 'fit-content',
  maxWidth: '100%',
  gap: 4,
  marginBottom: 28,
  padding: 5,
  overflowX: 'auto',
  border: `1px solid ${colors.hairline}`,
  borderRadius: radius.full,
  background: colors.surface
}
function tabStyle(active: boolean): CSSProperties {
  return {
    minHeight: 42,
    padding: '8px 16px',
    border: 0,
    borderRadius: radius.full,
    background: active ? colors.accentSurface : 'transparent',
    color: active ? colors.accentHover : colors.slate,
    fontFamily: fonts.display,
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  }
}
function countStyle(active: boolean): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 22,
    height: 22,
    marginLeft: 5,
    padding: '0 6px',
    borderRadius: radius.full,
    background: active ? colors.surface : colors.surfaceMuted
  }
}
const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 18
}
const cardStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(105px, 30%) minmax(0, 1fr)',
  minHeight: 230,
  overflow: 'hidden',
  background: colors.surface,
  border: `1px solid ${colors.hairline}`,
  borderRadius: radius.xl,
  boxShadow: shadows.card
}
const imageWrapStyle: CSSProperties = { position: 'relative', minHeight: 180, background: colors.surfaceMuted }
const imageStyle: CSSProperties = { width: '100%', height: '100%', objectFit: 'cover', display: 'block' }
const imageFallbackStyle: CSSProperties = {
  display: 'flex',
  width: '100%',
  height: '100%',
  alignItems: 'center',
  justifyContent: 'center',
  color: colors.accentHover,
  fontFamily: fonts.display,
  fontSize: 32,
  fontWeight: 800
}
const contentStyle: CSSProperties = { display: 'flex', minWidth: 0, flexDirection: 'column', gap: 10, padding: 18 }
const titleRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 10
}
const cardTitleStyle: CSSProperties = {
  margin: 0,
  color: colors.ink,
  fontFamily: fonts.display,
  fontSize: 18,
  lineHeight: 1.35
}
const partnerStyle: CSSProperties = { margin: '3px 0 0', color: colors.slate, fontSize: 13 }
const codeStyle: CSSProperties = {
  margin: 0,
  color: colors.ink,
  fontFamily: fonts.mono,
  fontWeight: 600,
  overflowWrap: 'anywhere'
}
const metaStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 3, color: colors.slate, fontSize: 13 }
const actionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 12,
  marginTop: 'auto'
}
const linkStyle: CSSProperties = { color: colors.ink, fontWeight: 600 }
const alertStyle: CSSProperties = {
  padding: 16,
  borderRadius: radius.md,
  background: colors.dangerSurface,
  color: colors.onDangerSurface
}
const emptyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  padding: 40,
  background: colors.surface,
  border: `1px solid ${colors.hairline}`,
  borderRadius: radius.xl,
  boxShadow: shadows.card,
  color: colors.slate
}
const qrContentStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 12,
  textAlign: 'center'
}
const qrCodeStyle: CSSProperties = {
  color: colors.ink,
  fontFamily: fonts.mono,
  letterSpacing: '0.08em',
  overflowWrap: 'anywhere'
}
const qrHeaderStyle: CSSProperties = {
  display: 'flex',
  width: '100%',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  paddingBottom: 12,
  borderBottom: `1px solid ${colors.hairline}`,
  textAlign: 'left'
}
const qrBrandStyle: CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  width: 42,
  height: 42,
  borderRadius: radius.md,
  background: colors.ink,
  color: colors.onInk,
  fontFamily: fonts.display,
  fontWeight: 900
}
const qrHintStyle: CSSProperties = {
  display: 'block',
  padding: '10px 14px',
  borderRadius: radius.md,
  background: colors.accentSurface,
  color: colors.accentHover,
  lineHeight: 1.5
}

function statusOverlayStyle(group: VoucherTab): CSSProperties {
  return {
    position: 'absolute',
    top: 14,
    left: -30,
    width: 130,
    padding: '6px 0',
    transform: 'rotate(-38deg)',
    textAlign: 'center',
    color: '#fff',
    background: group === 'used' ? 'rgba(23, 91, 66, .92)' : 'rgba(154, 35, 35, .92)',
    fontFamily: fonts.display,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '.08em'
  }
}

export default MyVouchersPage
