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
import { VoucherStatus } from '@ui-contracts'
import { listBranches, listPartnerVouchers } from '../../services/partner'
import type { Branch, PartnerVoucher } from '../../types/partner'
import { Badge, variantForStatus, LoadingSpinner } from '../../components/ui'
import { formatCurrency, formatStatus, parsePrice } from '../../utils/format'
import { colors, fonts, radius, shadows } from '../../theme/tokens'

/** Overview figures derived from the partner's branches + vouchers. */
export interface PartnerDashboardStats {
  totalBranches: number
  activeBranches: number
  totalVouchers: number
  /** Vouchers currently live (APPROVED). */
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
    if (voucher.status === VoucherStatus.APPROVED) approvedVouchers += 1
  }

  return {
    totalBranches: branches.length,
    activeBranches: branches.length,
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
  VoucherStatus.PENDING_APPROVAL,
  VoucherStatus.APPROVED,
  VoucherStatus.PAUSED,
  VoucherStatus.REJECTED,
  VoucherStatus.CANCELLED
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
    <section style={{ maxWidth: 900, margin: '0 auto' }}>
      <h1 style={titleStyle}>Tổng quan đối tác</h1>
      <p style={subtitleStyle}>Tổng hợp tình trạng chi nhánh và voucher của doanh nghiệp.</p>

      {isLoading && (
        <div style={{ padding: 32 }}>
          <LoadingSpinner label='Đang tải tổng quan' />
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
          value={`${stats.activeBranches} / ${stats.totalBranches}`}
          footer={<Link to='/partner/branches'>Quản lý chi nhánh →</Link>}
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
    </>
  )
}

/** A single summary metric card. */
function StatCard({ label, value, footer }: { label: string; value: string; footer?: ReactNode }) {
  return (
    <div style={statCardStyle}>
      <span style={statLabelStyle}>{label}</span>
      <span style={statValueStyle}>{value}</span>
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
  padding: 16,
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
  fontSize: 24,
  fontWeight: 700,
  color: colors.ink
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
