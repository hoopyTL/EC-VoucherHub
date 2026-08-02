import { BarList, LineChart } from '../../components/admin/MiniCharts'
import { colors, fonts, radius, shadows } from '../../theme/tokens'
import { formatCurrency } from '../../utils/format'

const REVENUE = [12, 18, 16, 24, 22, 31, 36].map((value) => value * 1000000)
const CATEGORIES = [
  { label: 'Ẩm thực', value: 128000000, caption: '162 lượt bán' },
  { label: 'Du lịch', value: 94000000, caption: '48 lượt bán' },
  { label: 'Làm đẹp', value: 72000000, caption: '116 lượt bán' }
]

export function ReportsPage() {
  return (
    <section style={{ maxWidth: 960, margin: '0 auto' }}>
      <p style={eyebrowStyle}>● Báo cáo</p>
      <h1 style={titleStyle}>Hiệu quả kinh doanh</h1>
      <p style={subtitleStyle}>Theo dõi doanh thu và mức độ quan tâm trong 30 ngày gần nhất.</p>
      <div style={metricsStyle}>
        <Metric label='Doanh thu' value='294 triệu ₫' change='+18,4%' />
        <Metric label='Voucher đã bán' value='326' change='+12,1%' />
        <Metric label='Tỷ lệ sử dụng' value='72,8%' change='+4,6%' />
      </div>
      <div style={chartsStyle}>
        <article style={cardStyle}>
          <h2 style={cardTitleStyle}>Doanh thu 7 ngày</h2>
          <LineChart points={REVENUE} ariaLabel='Doanh thu trong bảy ngày' />
        </article>
        <article style={cardStyle}>
          <h2 style={cardTitleStyle}>Doanh thu theo danh mục</h2>
          <BarList data={CATEGORIES} formatValue={formatCurrency} />
        </article>
      </div>
    </section>
  )
}

function Metric({ label, value, change }: { label: string; value: string; change: string }) {
  return (
    <article style={cardStyle}>
      <span style={{ color: colors.slate, fontSize: 13 }}>{label}</span>
      <strong style={{ fontFamily: fonts.display, fontSize: 30 }}>{value}</strong>
      <span style={{ color: colors.ink, fontSize: 13 }}>{change} so với kỳ trước</span>
    </article>
  )
}

const eyebrowStyle = {
  margin: '0 0 10px',
  color: colors.slate,
  fontFamily: fonts.display,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const
}
const titleStyle = {
  margin: 0,
  color: colors.ink,
  fontFamily: fonts.display,
  fontSize: 48,
  fontWeight: 800,
  letterSpacing: '-0.03em'
}
const subtitleStyle = { color: colors.slate, marginBottom: 28 }
const metricsStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }
const chartsStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: 16,
  marginTop: 16
}
const cardStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 12,
  padding: 24,
  borderRadius: radius.xl,
  border: `1px solid ${colors.hairline}`,
  background: colors.surface,
  boxShadow: shadows.card
}
const cardTitleStyle = { margin: 0, fontFamily: fonts.display, fontSize: 18 }

export default ReportsPage
