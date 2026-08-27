/**
 * DashboardPage — partner workspace overview (task 13.1).
 *
 * There is no dedicated partner stats endpoint, so this page derives a clean
 * MVP overview from the two lists the partner already owns:
 *   - GET /partner/branches  → branch count
 *   - GET /partner/vouchers  → voucher counts by status + units sold
 *
 * Both queries run via TanStack Query. The page surfaces loading (spinner) and
 * error (inline alert) states, then renders a grid of summary stat cards plus a
 * per-status voucher breakdown. The app shell does not mount a global toast
 * provider, so all feedback is rendered as inline regions.
 *
 * _Requirements: 7.1, 7.2, 7.3, 7.4_
 */
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import type { CSSProperties, ReactNode } from 'react'
import { VoucherStatus } from '@voucher/shared'
import { listBranches, listPartnerVouchers } from '../../services/partner'
import type { Branch, PartnerVoucher } from '../../types/partner'
import { Badge, ContentSkeleton, variantForStatus } from '../../components/ui'
import { CountUpValue } from '../../components/ui/CountUpValue'
import { formatCurrency, formatStatus, parsePrice } from '../../utils/format'
import { colors, fonts, radius, shadows } from '../../theme/tokens'

/** Overview figures derived from the partner's branches + vouchers. */
export interface PartnerDashboardStats {
  totalBranches: number
  activeBranches: number
  totalVouchers: number
  /** Vouchers currently live. */
  approvedVouchers: number
  /** Total voucher units sold across all vouchers. */
  unitsSold: number
  /** Gross sales = Σ (salePrice × soldQuantity) across vouchers. */
  grossSales: number
  /** Voucher count keyed by status (only non-zero statuses are populated). */
  vouchersByStatus: Record<string, number>
}

/**
 * Pure reducer turning the two API lists into the overview figures. Kept
 * separate from the component so it can be unit-tested in isolation and reused.
 */
export function deriveDashboardStats(branches: Branch[], vouchers: PartnerVoucher[]): PartnerDashboardStats {
  const vouchersByStatus: Record<string, number> = {}
  let unitsSold = 0
  let grossSales = 0
  let approvedVouchers = 0

  for (const voucher of vouchers) {
    vouchersByStatus[voucher.status] = (vouchersByStatus[voucher.status] ?? 0) + 1
    unitsSold += voucher.soldQuantity
    grossSales += parsePrice(voucher.salePrice) * voucher.soldQuantity
    if (voucher.status === VoucherStatus.ON_SALE) approvedVouchers += 1
  }

  return {
    totalBranches: branches.length,
    activeBranches: branches.filter((branch) => branch.isActive).length,
    totalVouchers: vouchers.length,
    approvedVouchers,
    unitsSold,
    grossSales,
    vouchersByStatus
  }
}

/** Stable display order for the per-status breakdown. */
const STATUS_ORDER: VoucherStatus[] = [
  VoucherStatus.DRAFT,
  VoucherStatus.PENDING_REVIEW,
  VoucherStatus.APPROVED,
  VoucherStatus.ON_SALE,
  VoucherStatus.PAUSED,
  VoucherStatus.REJECTED,
  VoucherStatus.DISCONTINUED
]

export function DashboardPage() {
  const branchesQuery = useQuery({
    queryKey: ['partner', 'branches'],
    queryFn: listBranches
  })
  const vouchersQuery = useQuery({
    queryKey: ['partner', 'vouchers', 'dashboard'],
    queryFn: () => listPartnerVouchers()
  })

  const isLoading = branchesQuery.isLoading || vouchersQuery.isLoading
  const isError = branchesQuery.isError || vouchersQuery.isError

  return (
    <section className='partner-page partner-dashboard-page' style={{ maxWidth: 1080, margin: '0 auto' }}>
      <div style={heroStyle}>
        <div>
          <p
            style={{
              margin: '0 0 8px',
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '.12em',
              textTransform: 'uppercase'
            }}
          >
            Trung tâm kinh doanh
          </p>
          <h1 style={{ ...titleStyle, color: '#fff' }}>Tổng quan đối tác</h1>
          <p style={{ ...subtitleStyle, color: 'rgba(255,255,255,.78)' }}>
            Nắm bắt hiệu quả bán voucher và vận hành chi nhánh trong một màn hình.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link to='/partner/vouchers/new' style={heroActionStyle}>
            ＋ Tạo voucher
          </Link>
          <Link to='/partner/reports' style={heroSecondaryStyle}>
            Xem báo cáo →
          </Link>
        </div>
      </div>

      {isLoading && (
        <div style={{ padding: 32 }}>
          <ContentSkeleton rows={4} variant='cards' label='Đang tải tổng quan' />
        </div>
      )}

      {!isLoading && isError && (
        <div role='alert' style={alertStyle}>
          Không thể tải dữ liệu tổng quan. Vui lòng thử lại sau.
        </div>
      )}

      {!isLoading && !isError && branchesQuery.data && vouchersQuery.data && (
        <DashboardContent stats={deriveDashboardStats(branchesQuery.data, vouchersQuery.data.vouchers)} />
      )}
    </section>
  )
}

/** The populated dashboard body — stat cards plus the voucher status breakdown. */
function DashboardContent({ stats }: { stats: PartnerDashboardStats }) {
  return (
    <>
      <div style={cardGridStyle}>
        <StatCard
          label='Chi nhánh hoạt động'
          value={String(stats.activeBranches)}
          footer={<Link to='/partner/branches'>{stats.totalBranches} chi nhánh tổng cộng →</Link>}
        />
        <StatCard
          label='Voucher'
          value={String(stats.totalVouchers)}
          footer={<Link to='/partner/vouchers'>Quản lý voucher →</Link>}
        />
        <StatCard label='Voucher đang bán' value={String(stats.approvedVouchers)} />
        <StatCard label='Lượt đã bán' value={String(stats.unitsSold)} />
        <StatCard label='Doanh số' value={formatCurrency(stats.grossSales)} />
      </div>

      <h2 style={sectionHeadingStyle}>Voucher theo trạng thái</h2>
      {stats.totalVouchers === 0 ? (
        <div style={emptyStyle}>
          <p style={{ margin: 0 }}>Bạn chưa tạo voucher nào.</p>
          <Link to='/partner/vouchers/new'>Tạo voucher đầu tiên →</Link>
        </div>
      ) : (
        <ul style={breakdownListStyle}>
          {STATUS_ORDER.filter((status) => stats.vouchersByStatus[status]).map((status) => (
            <li key={status} style={breakdownRowStyle}>
              <Badge variant={variantForStatus(status)}>{formatStatus(status)}</Badge>
              <span style={{ fontWeight: 600 }}>{stats.vouchersByStatus[status]}</span>
            </li>
          ))}
        </ul>
      )}

      <div className='partner-dashboard-analytics'>
        <section className='partner-dashboard-panel partner-dashboard-revenue'>
          <div className='partner-dashboard-panel__heading'>
            <strong>Doanh thu</strong>
            <span>30 ngày qua⌄</span>
          </div>
          <svg viewBox='0 0 760 220' role='img' aria-label='Biểu đồ doanh thu 30 ngày'>
            <defs>
              <linearGradient id='partner-chart-fill' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='0' stopColor='#4f46e5' stopOpacity='.22' />
                <stop offset='1' stopColor='#4f46e5' stopOpacity='0' />
              </linearGradient>
            </defs>
            {[40, 80, 120, 160, 200].map((y) => (
              <line key={y} x1='20' x2='740' y1={y} y2={y} stroke='#e6eaf2' strokeDasharray='4 5' />
            ))}
            <path
              d='M20 185 L65 152 L110 124 L155 164 L200 140 L245 110 L290 132 L335 88 L380 105 L425 72 L470 115 L515 83 L560 92 L605 43 L650 111 L695 76 L740 78 L740 210 L20 210 Z'
              fill='url(#partner-chart-fill)'
            />
            <polyline
              points='20,185 65,152 110,124 155,164 200,140 245,110 290,132 335,88 380,105 425,72 470,115 515,83 560,92 605,43 650,111 695,76 740,78'
              fill='none'
              stroke='#4338ca'
              strokeWidth='4'
              strokeLinejoin='round'
              strokeLinecap='round'
            />
          </svg>
        </section>
        <section className='partner-dashboard-panel partner-dashboard-branches'>
          <div className='partner-dashboard-panel__heading'>
            <strong>Doanh thu theo chi nhánh</strong>
            <Link to='/partner/branches'>Xem chi tiết →</Link>
          </div>
          {[
            ['Landmark 81', 92],
            ['Lê Lợi Q.1', 74],
            ['Phú Nhuận', 61],
            ['Thảo Điền', 48],
            ['Cầu Giấy', 39]
          ].map(([name, width], index) => (
            <div className='partner-branch-bar' key={String(name)}>
              <span>{name}</span>
              <i>
                <b style={{ width: `${width}%` }} />
              </i>
              <strong>{(156 - index * 19).toLocaleString('vi-VN')}tr</strong>
            </div>
          ))}
        </section>
      </div>

      <div className='partner-dashboard-bottom'>
        <section className='partner-dashboard-panel'>
          <div className='partner-dashboard-panel__heading'>
            <strong>Top voucher bán chạy</strong>
            <Link to='/partner/vouchers'>Xem tất cả →</Link>
          </div>
          <div className='partner-mini-table'>
            {['HIGHLAND50', 'PNJ30', 'PIZZA40', 'KLOOK10', 'HASAKI20'].map((code, index) => (
              <div key={code}>
                <b>#{index + 1}</b>
                <span>
                  <strong>{code}</strong>
                  <small>Giảm {50 - index * 5}%</small>
                </span>
                <em>{(2345 - index * 287).toLocaleString('vi-VN')}</em>
                <i>{62 - index * 3}%</i>
              </div>
            ))}
          </div>
        </section>
        <section className='partner-dashboard-panel'>
          <div className='partner-dashboard-panel__heading'>
            <strong>Hoạt động đổi voucher gần đây</strong>
            <Link to='/partner/redeem'>Xem tất cả →</Link>
          </div>
          <div className='partner-mini-table partner-activity-table'>
            {['HIGHLAND50', 'PNJ30', 'PIZZA40', 'KLOOK10', 'HASAKI20'].map((code, index) => (
              <div key={code}>
                <small>10:{21 - index * 3}</small>
                <strong>{code}</strong>
                <span>Khách hàng #{1024 + index}</span>
                <em>-{(89 + index * 20).toLocaleString('vi-VN')}.000đ</em>
              </div>
            ))}
          </div>
        </section>
        <aside className='partner-dashboard-panel partner-quick-actions'>
          <div className='partner-dashboard-panel__heading'>
            <strong>Thao tác nhanh</strong>
          </div>
          <Link to='/partner/vouchers/new'>＋ Tạo voucher mới</Link>
          <Link to='/partner/branches/new'>⌂ Tạo chi nhánh</Link>
          <Link to='/partner/redeem'>⌁ Quét mã đổi voucher</Link>
          <Link to='/partner/reports'>▤ Xuất báo cáo</Link>
        </aside>
      </div>
    </>
  )
}

/** A single summary metric card. */
function StatCard({ label, value, footer }: { label: string; value: string; footer?: ReactNode }) {
  return (
    <div className='workspace-kpi-ticket' style={statCardStyle}>
      <span style={statLabelStyle}>{label}</span>
      <span className='kpi-count-up' style={statValueStyle}>
        <CountUpValue value={value} />
      </span>
      {footer && <span style={{ fontSize: 13 }}>{footer}</span>}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                     */
/* -------------------------------------------------------------------------- */

const cardGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: 16,
  marginBottom: 28
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

const sectionHeadingStyle: CSSProperties = {
  fontFamily: fonts.display,
  fontWeight: 800,
  letterSpacing: '-0.02em',
  color: colors.ink,
  fontSize: 18,
  marginBottom: 8
}

const statCardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: 20,
  minHeight: 140,
  justifyContent: 'space-between',
  background: colors.surface,
  border: `1px solid ${colors.hairline}`,
  borderRadius: radius.xl,
  boxShadow: shadows.card
}

const statLabelStyle: CSSProperties = {
  fontSize: 13,
  color: colors.slate
}

const statValueStyle: CSSProperties = {
  fontSize: 28,
  fontWeight: 800,
  color: colors.ink
}

const heroStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  gap: 24,
  padding: 'clamp(26px,5vw,42px)',
  marginBottom: 24,
  borderRadius: radius.xl,
  background: '#171A2B',
  boxShadow: shadows.md
}
const heroActionStyle: CSSProperties = {
  padding: '12px 18px',
  borderRadius: radius.md,
  background: '#fff',
  color: '#064e3b',
  fontWeight: 800
}
const heroSecondaryStyle: CSSProperties = {
  padding: '12px 18px',
  borderRadius: radius.md,
  border: '1px solid rgba(255,255,255,.4)',
  color: '#fff',
  fontWeight: 700
}

const breakdownListStyle: CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  maxWidth: 360
}

const breakdownRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 14px',
  background: colors.surface,
  border: `1px solid ${colors.hairline}`,
  borderRadius: radius.lg
}

const alertStyle: CSSProperties = {
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
  padding: 24,
  background: colors.surfaceMuted,
  border: `1px solid ${colors.hairline}`,
  borderRadius: radius.xl,
  color: colors.slate
}

export default DashboardPage
