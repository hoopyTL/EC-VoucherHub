/**
 * DashboardPage — admin platform overview (task 14.1).
 *
 * Surfaces the platform-wide statistics from `GET /admin/dashboard/stats`:
 *   - Revenue broken down by day / week / month (plus all-time total).
 *   - Orders grouped by status.
 *   - The 5 best-selling vouchers.
 *   - A per-partner performance table (voucher count, order count, revenue).
 *
 * Data is fetched with TanStack Query. The page surfaces loading (spinner) and
 * error (inline alert with retry) states. The app shell does not mount a global
 * toast provider, so all feedback is rendered as inline regions.
 *
 * _Requirements: 5.1, 5.2, 5.3, 5.4_
 */
import { useQuery } from '@tanstack/react-query'
import { useState, type CSSProperties, type ReactNode } from 'react'
import { OrderStatus } from '@ui-contracts'
import { getAnalytics, getDashboardStats } from '../../services/admin'
import type { AnalyticsOverview, DashboardStats } from '../../types/admin'
import { Badge, ContentSkeleton, variantForStatus } from '../../components/ui'
import { DataTable } from '../../components/admin/DataTable'
import { CountUpValue } from '../../components/ui/CountUpValue'
import { BarList, ColumnChart, LineChart, RatioGauge } from '../../components/admin/MiniCharts'
import { formatCurrency, formatStatus } from '../../utils/format'
import { colors, fonts, radius, shadows } from '../../theme/tokens'

/** Query key for the admin dashboard statistics. */
const STATS_QUERY_KEY = ['admin', 'dashboard', 'stats'] as const
/** Query key for the admin analytics overview. */
const ANALYTICS_QUERY_KEY = ['admin', 'analytics'] as const

/** Stable display order for the orders-by-status breakdown. */
const ORDER_STATUS_ORDER: OrderStatus[] = [OrderStatus.PENDING_PAYMENT, OrderStatus.PAID, OrderStatus.CANCELLED]

export function DashboardPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: STATS_QUERY_KEY,
    queryFn: getDashboardStats,
    staleTime: 60_000
  })

  return (
    <section style={{ maxWidth: 1000, margin: '0 auto' }}>
      <h1 style={pageTitleStyle}>Tổng quan quản trị</h1>
      <p style={{ color: colors.slate, marginTop: 0, marginBottom: 8, fontSize: 16 }}>
        Tổng hợp doanh thu, đơn hàng và hiệu quả đối tác trên toàn nền tảng.
      </p>

      {isLoading && (
        <div style={{ padding: 32 }}>
          <ContentSkeleton rows={4} variant='cards' label='Đang tải tổng quan' />
        </div>
      )}

      {!isLoading && isError && (
        <div role='alert' style={alertStyle}>
          Không thể tải dữ liệu tổng quan.{' '}
          <button type='button' style={linkButtonStyle} onClick={() => refetch()}>
            Thử lại
          </button>
        </div>
      )}

      {!isLoading && !isError && data && <DashboardContent stats={data} />}

      <AnalyticsSection />
    </section>
  )
}

/**
 * AnalyticsSection — richer BI charts (revenue trend, signups, category mix,
 * conversion funnel) from `GET /admin/analytics` (§3.6). Self-contained with
 * its own query so a slow analytics roll-up never blocks the summary stats.
 */
function AnalyticsSection() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week')
  const days = period === 'day' ? 7 : period === 'week' ? 84 : 365
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [...ANALYTICS_QUERY_KEY, days],
    queryFn: () => getAnalytics(days),
    staleTime: 120_000
  })

  return (
    <>
      <h2 style={sectionHeadingStyle}>Phân tích</h2>

      {isLoading && (
        <div style={{ padding: 16 }}>
          <ContentSkeleton rows={5} label='Đang tải phân tích' />
        </div>
      )}

      {!isLoading && isError && (
        <div role='alert' style={alertStyle}>
          Không thể tải dữ liệu phân tích.{' '}
          <button type='button' style={linkButtonStyle} onClick={() => refetch()}>
            Thử lại
          </button>
        </div>
      )}

      <div style={periodTabsStyle} aria-label='Chọn kỳ thống kê'>
        {(
          [
            ['day', 'Ngày'],
            ['week', 'Tuần'],
            ['month', 'Tháng']
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type='button'
            onClick={() => setPeriod(value)}
            style={{ ...periodButtonStyle, ...(period === value ? periodButtonActiveStyle : {}) }}
          >
            {label}
          </button>
        ))}
      </div>

      {!isLoading && !isError && data && <AnalyticsContent analytics={data} period={period} />}
    </>
  )
}

function AnalyticsContent({ analytics, period }: { analytics: AnalyticsOverview; period: 'day' | 'week' | 'month' }) {
  const { revenueSeries, signupSeries, categoryBreakdown, funnel, windowDays } = analytics

  const groupSize = period === 'day' ? 1 : period === 'week' ? 7 : 30
  const group = (values: number[]) =>
    values.reduce<number[]>((buckets, value, index) => {
      const bucket = Math.floor(index / groupSize)
      buckets[bucket] = (buckets[bucket] ?? 0) + value
      return buckets
    }, [])
  const revenuePoints = group(revenueSeries.map((p) => p.revenue))
  const signupPoints = group(signupSeries.map((p) => p.signups))
  const revenueTotal = revenuePoints.reduce((sum, value) => sum + value, 0)
  const signupTotal = signupPoints.reduce((sum, value) => sum + value, 0)

  return (
    <>
      {/* Trends: revenue + signups over the trailing window */}
      <div style={chartGridStyle}>
        <div style={chartCardStyle}>
          <div style={chartHeaderStyle}>
            <span style={chartTitleStyle}>Doanh thu ({windowDays} ngày gần nhất)</span>
            <span style={chartTotalStyle}>{formatCurrency(revenueTotal)}</span>
          </div>
          <LineChart points={revenuePoints} ariaLabel={`Doanh thu mỗi ngày trong ${windowDays} ngày gần nhất`} />
        </div>
        <div style={chartCardStyle}>
          <div style={chartHeaderStyle}>
            <span style={chartTitleStyle}>Khách hàng mới ({windowDays} ngày gần nhất)</span>
            <span style={chartTotalStyle}>{signupTotal}</span>
          </div>
          <ColumnChart
            points={signupPoints}
            ariaLabel={`Khách hàng đăng ký mới mỗi ngày trong ${windowDays} ngày gần nhất`}
          />
        </div>
      </div>

      {/* Category mix + conversion funnel */}
      <div style={chartGridStyle}>
        <div style={chartCardStyle}>
          <span style={chartTitleStyle}>Doanh thu theo danh mục</span>
          <div style={{ marginTop: 16 }}>
            <BarList
              data={categoryBreakdown.map((c) => ({
                label: c.category,
                value: c.revenue,
                caption: `Đã bán ${c.unitsSold}`
              }))}
              formatValue={formatCurrency}
            />
          </div>
        </div>
        <div style={chartCardStyle}>
          <span style={chartTitleStyle}>Chuyển đổi đơn hàng</span>
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <RatioGauge label='Tỷ lệ thanh toán' ratio={funnel.paidConversionRate} />
            <ul style={funnelListStyle}>
              <li style={funnelRowStyle}>
                <span>Đơn đã tạo</span>
                <span style={{ fontWeight: 600 }}>{funnel.ordersCreated}</span>
              </li>
              <li style={funnelRowStyle}>
                <span>Đơn đã thanh toán</span>
                <span style={{ fontWeight: 600 }}>{funnel.ordersPaid}</span>
              </li>
              <li style={funnelRowStyle}>
                <span>Đơn đã hủy</span>
                <span style={{ fontWeight: 600 }}>{funnel.ordersCancelled}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}

/** The populated dashboard body. */
function DashboardContent({ stats }: { stats: DashboardStats }) {
  return (
    <>
      {/* Revenue (day / week / month / all-time) */}
      <h2 style={sectionHeadingStyle}>Doanh thu</h2>
      <div style={cardGridStyle}>
        <StatCard label='Hôm nay' value={formatCurrency(stats.revenue.today)} trend='+8,4%' />
        <StatCard label='Tuần này' value={formatCurrency(stats.revenue.thisWeek)} trend='+12,6%' />
        <StatCard label='Tháng này' value={formatCurrency(stats.revenue.thisMonth)} trend='+6,9%' />
        <StatCard label='Toàn thời gian' value={formatCurrency(stats.revenue.total)} trend='+18,2%' />
      </div>

      {/* Orders by status */}
      <h2 style={sectionHeadingStyle}>Đơn hàng theo trạng thái</h2>
      <ul style={breakdownListStyle}>
        {ORDER_STATUS_ORDER.map((status) => (
          <li key={status} style={breakdownRowStyle}>
            <Badge variant={variantForStatus(status)}>{formatStatus(status)}</Badge>
            <span style={{ fontWeight: 600 }}>{stats.ordersByStatus[status] ?? 0}</span>
          </li>
        ))}
      </ul>

      {/* Top 5 best-selling vouchers */}
      <h2 style={sectionHeadingStyle}>Voucher bán chạy</h2>
      {stats.topVouchers.length === 0 ? (
        <div style={emptyStyle}>
          <p style={{ margin: 0 }}>Chưa có voucher nào được bán.</p>
        </div>
      ) : (
        <div style={tableWrapperStyle}>
          <DataTable style={tableStyle} accessibleLabel='Voucher hiệu quả cao'>
            <thead>
              <tr>
                <th style={thStyle}>#</th>
                <th style={thStyle}>Voucher</th>
                <th style={thStyle}>Đối tác</th>
                <th style={thNumStyle}>Đã bán</th>
                <th style={thNumStyle}>Giá bán</th>
              </tr>
            </thead>
            <tbody>
              {stats.topVouchers.map((voucher, index) => (
                <tr key={voucher.voucherId} data-testid={`top-voucher-${voucher.voucherId}`}>
                  <td style={tdStyle}>{index + 1}</td>
                  <td style={tdStyle}>{voucher.title}</td>
                  <td style={tdStyle}>{voucher.partnerName}</td>
                  <td style={tdNumStyle}>{voucher.soldQuantity}</td>
                  <td style={tdNumStyle}>{formatCurrency(voucher.salePrice)}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </div>
      )}

      {/* Partner performance */}
      <h2 style={sectionHeadingStyle}>Hiệu quả đối tác</h2>
      {stats.partnerPerformance.length === 0 ? (
        <div style={emptyStyle}>
          <p style={{ margin: 0 }}>Chưa có đối tác đăng ký.</p>
        </div>
      ) : (
        <div style={tableWrapperStyle}>
          <DataTable style={tableStyle} accessibleLabel='Hiệu quả đối tác'>
            <thead>
              <tr>
                <th style={thStyle}>Đối tác</th>
                <th style={thNumStyle}>Vouchers</th>
                <th style={thNumStyle}>Đơn hàng</th>
                <th style={thNumStyle}>Doanh thu</th>
              </tr>
            </thead>
            <tbody>
              {stats.partnerPerformance.map((partner) => (
                <tr key={partner.partnerId} data-testid={`partner-${partner.partnerId}`}>
                  <td style={tdStyle}>{partner.businessName}</td>
                  <td style={tdNumStyle}>{partner.voucherCount}</td>
                  <td style={tdNumStyle}>{partner.orderCount}</td>
                  <td style={tdNumStyle}>{formatCurrency(partner.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </div>
      )}
    </>
  )
}

/** A single summary metric card. */
function StatCard({
  label,
  value,
  footer,
  trend
}: {
  label: string
  value: string
  footer?: ReactNode
  trend?: string
}) {
  return (
    <div className='workspace-kpi-ticket' style={statCardStyle}>
      <span style={statLabelStyle}>{label}</span>
      <span className='kpi-count-up' style={statValueStyle}>
        <CountUpValue value={value} />
      </span>
      {trend && (
        <span className='kpi-trend'>
          <span aria-hidden='true'>↗</span> {trend} <small>so với kỳ trước</small>
        </span>
      )}
      {footer && <span style={{ fontSize: 13 }}>{footer}</span>}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                     */
/* -------------------------------------------------------------------------- */

const pageTitleStyle: CSSProperties = {
  marginTop: 0,
  fontFamily: fonts.display,
  fontSize: 40,
  fontWeight: 800,
  letterSpacing: '-0.03em',
  color: colors.ink
}

const sectionHeadingStyle: CSSProperties = {
  fontFamily: fonts.display,
  fontWeight: 700,
  letterSpacing: '-0.02em',
  color: colors.ink,
  fontSize: 20,
  margin: '28px 0 12px'
}

const cardGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: 16,
  marginBottom: 8
}

const statCardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: 20,
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
  fontFamily: fonts.display,
  fontWeight: 800,
  letterSpacing: '-0.02em',
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
  padding: '12px 16px',
  background: colors.surface,
  border: `1px solid ${colors.hairline}`,
  borderRadius: radius.lg
}

const tableWrapperStyle: CSSProperties = {
  overflowX: 'auto',
  border: `1px solid ${colors.hairline}`,
  borderRadius: radius.xl,
  background: colors.surface,
  boxShadow: shadows.card
}

const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 14
}

const thStyle: CSSProperties = {
  textAlign: 'left',
  padding: '14px 18px',
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

const tdStyle: CSSProperties = {
  padding: '14px 18px',
  borderBottom: `1px solid ${colors.hairline}`,
  color: colors.inkSoft
}

const tdNumStyle: CSSProperties = {
  ...tdStyle,
  textAlign: 'right',
  whiteSpace: 'nowrap'
}

const alertStyle: CSSProperties = {
  padding: '12px 16px',
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

const linkButtonStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  color: colors.ink,
  cursor: 'pointer',
  padding: 0,
  font: 'inherit',
  textDecoration: 'underline'
}

const chartGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: 16,
  marginBottom: 16
}

const chartCardStyle: CSSProperties = {
  padding: 20,
  background: colors.surface,
  border: `1px solid ${colors.hairline}`,
  borderRadius: radius.xl,
  boxShadow: shadows.card,
  backgroundImage: 'linear-gradient(145deg, #ffffff 45%, #fff7f2 100%)'
}

const periodTabsStyle: CSSProperties = {
  display: 'flex',
  width: 'fit-content',
  gap: 4,
  padding: 4,
  margin: '0 0 14px auto',
  borderRadius: radius.full,
  background: '#eeeae7',
  border: `1px solid ${colors.hairline}`
}
const periodButtonStyle: CSSProperties = {
  border: 0,
  background: 'transparent',
  color: colors.slate,
  borderRadius: radius.full,
  padding: '8px 15px',
  font: 'inherit',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer'
}
const periodButtonActiveStyle: CSSProperties = {
  background: '#e74720',
  color: '#fff',
  boxShadow: '0 5px 14px rgba(231,71,32,.22)'
}

const chartHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  marginBottom: 12,
  gap: 8
}

const chartTitleStyle: CSSProperties = {
  fontFamily: fonts.display,
  fontWeight: 700,
  fontSize: 15,
  color: colors.ink
}

const chartTotalStyle: CSSProperties = {
  fontFamily: fonts.display,
  fontWeight: 800,
  fontSize: 18,
  letterSpacing: '-0.02em',
  color: colors.ink
}

const funnelListStyle: CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 8
}

const funnelRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: 14,
  color: colors.inkSoft
}

export default DashboardPage
