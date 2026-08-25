import { useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, CircleDollarSign, TrendingUp } from 'lucide-react'
import { LoadingSpinner } from '../../components/ui'
import { getPartnerReport } from './PartnerReportsPage'
import { formatCurrency } from '../../utils/format'
import { colors, fonts, radius, shadows } from '../../theme/tokens'

const ranges = ['Ngày', 'Tuần', 'Tháng', 'Năm'] as const
export function RevenueReportPage() {
  const [range, setRange] = useState<(typeof ranges)[number]>('Tháng')
  const report = useQuery({ queryKey: ['partner', 'reports'], queryFn: getPartnerReport })
  const points = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) =>
        Math.round((report.data?.summary.revenue ?? 0) * (0.35 + ((i * 17) % 55) / 100))
      ),
    [report.data]
  )
  if (report.isLoading) return <LoadingSpinner label='Đang tải báo cáo doanh thu' />
  if (report.isError) return <div role='alert'>Không thể tải báo cáo doanh thu.</div>
  const max = Math.max(...points, 1)
  const polyline = points.map((value, index) => `${(index / 11) * 100},${90 - (value / max) * 72}`).join(' ')
  return (
    <section style={{ maxWidth: 1100, margin: '0 auto' }}>
      <ReportTabs />
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'end',
          gap: 20,
          margin: '28px 0',
          flexWrap: 'wrap'
        }}
      >
        <div>
          <p style={{ color: colors.accent, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em' }}>
            Phân tích kinh doanh
          </p>
          <h1 style={{ margin: 0, fontFamily: fonts.display, fontSize: 46 }}>Doanh thu voucher</h1>
          <p style={{ color: colors.slate }}>Theo dõi biến động doanh thu và nhóm voucher đóng góp tốt nhất.</p>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 4,
            padding: 5,
            borderRadius: radius.full,
            background: colors.surface,
            border: `1px solid ${colors.hairline}`
          }}
        >
          {ranges.map((item) => (
            <button
              key={item}
              onClick={() => setRange(item)}
              style={{
                border: 0,
                borderRadius: radius.full,
                padding: '10px 15px',
                fontWeight: 800,
                cursor: 'pointer',
                color: item === range ? colors.onAccent : colors.slate,
                background: item === range ? colors.accent : 'transparent'
              }}
            >
              {item}
            </button>
          ))}
        </div>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 16 }}>
        <Metric
          icon={<CircleDollarSign />}
          label={`Doanh thu theo ${range.toLowerCase()}`}
          value={formatCurrency(report.data!.summary.revenue)}
        />
        <Metric icon={<TrendingUp />} label='Voucher đã bán' value={String(report.data!.summary.soldCount)} />
        <Metric
          icon={<BarChart3 />}
          label='Tỷ lệ sử dụng'
          value={`${Math.round(report.data!.summary.usageRate * 100)}%`}
        />
      </div>
      <article style={card}>
        <h2 style={{ marginTop: 0 }}>Xu hướng doanh thu</h2>
        <svg
          viewBox='0 0 100 100'
          preserveAspectRatio='none'
          style={{ width: '100%', height: 300, overflow: 'visible' }}
          aria-label='Biểu đồ đường doanh thu'
        >
          <defs>
            <linearGradient id='revenueArea' x1='0' y1='0' x2='0' y2='1'>
              <stop offset='0' stopColor={colors.accent} stopOpacity='.28' />
              <stop offset='1' stopColor={colors.accent} stopOpacity='0' />
            </linearGradient>
          </defs>
          <polygon points={`0,100 ${polyline} 100,100`} fill='url(#revenueArea)' />
          <polyline
            points={polyline}
            fill='none'
            stroke={colors.accent}
            strokeWidth='2.2'
            vectorEffect='non-scaling-stroke'
          />
        </svg>
      </article>
    </section>
  )
}
export function ReportTabs() {
  return (
    <nav style={{ display: 'flex', gap: 8 }}>
      <NavLink
        to='/partner/reports/revenue'
        style={({ isActive }) => ({
          padding: '11px 18px',
          borderRadius: radius.full,
          textDecoration: 'none',
          fontWeight: 800,
          background: isActive ? colors.accent : colors.surface,
          color: isActive ? colors.onAccent : colors.ink
        })}
      >
        Doanh thu
      </NavLink>
      <NavLink
        to='/partner/reports/vouchers'
        style={({ isActive }) => ({
          padding: '11px 18px',
          borderRadius: radius.full,
          textDecoration: 'none',
          fontWeight: 800,
          background: isActive ? colors.accent : colors.surface,
          color: isActive ? colors.onAccent : colors.ink
        })}
      >
        Hiệu quả voucher
      </NavLink>
    </nav>
  )
}
function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <article style={card}>
      <span style={{ color: colors.accent }}>{icon}</span>
      <small style={{ color: colors.slate }}>{label}</small>
      <strong style={{ fontFamily: fonts.display, fontSize: 27 }}>{value}</strong>
    </article>
  )
}
const card = {
  marginTop: 18,
  padding: 24,
  borderRadius: radius.xl,
  background: colors.surface,
  border: `1px solid ${colors.hairline}`,
  boxShadow: shadows.card,
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 9
}
