import { useQuery } from '@tanstack/react-query'
import { BarList } from '../../components/admin/MiniCharts'
import { Badge, LoadingSpinner, variantForStatus } from '../../components/ui'
import { api } from '../../services/api'
import { colors, fonts, radius, shadows } from '../../theme/tokens'
import { formatCurrency, formatStatus } from '../../utils/format'

export interface PartnerReport {
  summary: { revenue: number; issuedCount: number; soldCount: number; usedCount: number; usageRate: number }
  vouchers: Array<{
    id: string
    name: string
    status: string
    revenue: number
    issuedCount: number
    soldCount: number
    usedCount: number
    usageRate: number
  }>
}

export async function getPartnerReport(): Promise<PartnerReport> {
  const { data } = await api.get<{ success: true; data: PartnerReport }>('/partner/reports')
  return data.data
}

const percent = (ratio: number) => `${Math.round(ratio * 100)}%`

export function PartnerReportsPage() {
  const report = useQuery({ queryKey: ['partner', 'reports'], queryFn: getPartnerReport, staleTime: 60_000 })
  if (report.isLoading) return <LoadingSpinner label='Đang tải báo cáo đối tác' />
  if (report.isError)
    return (
      <div role='alert' style={alertStyle}>
        Không thể tải báo cáo.{' '}
        <button type='button' onClick={() => report.refetch()} style={retryStyle}>
          Thử lại
        </button>
      </div>
    )
  const data = report.data!
  return (
    <section style={{ maxWidth: 1080, margin: '0 auto' }}>
      <p style={eyebrowStyle}>● Báo cáo</p>
      <h1 style={titleStyle}>Hiệu quả kinh doanh</h1>
      <p style={subtitleStyle}>Số liệu thật từ những voucher thuộc tài khoản đối tác của bạn.</p>
      <div style={metricsStyle}>
        <Metric label='Doanh thu' value={formatCurrency(data.summary.revenue)} />
        <Metric label='Mã đã phát hành' value={String(data.summary.issuedCount)} />
        <Metric label='Voucher đã bán' value={String(data.summary.soldCount)} />
        <Metric label='Tỷ lệ sử dụng' value={percent(data.summary.usageRate)} />
      </div>
      {data.vouchers.length === 0 ? (
        <div style={emptyStyle}>Chưa có voucher để lập báo cáo.</div>
      ) : (
        <>
          <article style={{ ...cardStyle, marginTop: 18 }}>
            <h2 style={cardTitleStyle}>Doanh thu theo voucher</h2>
            <BarList
              data={data.vouchers.map((v) => ({
                label: v.name,
                value: v.revenue,
                caption: `${v.soldCount} lượt bán · ${percent(v.usageRate)} đã sử dụng`
              }))}
              formatValue={formatCurrency}
            />
          </article>
          <div style={{ overflowX: 'auto', marginTop: 18 }}>
            <table style={tableStyle} data-testid='partner-report-table'>
              <thead>
                <tr>
                  {['Voucher', 'Trạng thái', 'Doanh thu', 'Phát hành', 'Đã bán', 'Đã dùng', 'Tỷ lệ dùng'].map((h) => (
                    <th key={h} style={thStyle}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.vouchers.map((v) => (
                  <tr key={v.id} data-testid={`report-voucher-${v.id}`}>
                    <td style={tdStyle}>
                      <strong>{v.name}</strong>
                    </td>
                    <td style={tdStyle}>
                      <Badge variant={variantForStatus(v.status)}>{formatStatus(v.status)}</Badge>
                    </td>
                    <td style={tdStyle}>{formatCurrency(v.revenue)}</td>
                    <td style={tdStyle}>{v.issuedCount}</td>
                    <td style={tdStyle}>{v.soldCount}</td>
                    <td style={tdStyle}>{v.usedCount}</td>
                    <td style={tdStyle}>{percent(v.usageRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article style={cardStyle}>
      <span style={{ color: colors.slate, fontSize: 13 }}>{label}</span>
      <strong style={{ fontFamily: fonts.display, fontSize: 30 }}>{value}</strong>
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
const metricsStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }
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
const emptyStyle = { ...cardStyle, marginTop: 18, color: colors.slate }
const alertStyle = {
  padding: 16,
  borderRadius: radius.md,
  background: colors.dangerSurface,
  color: colors.onDangerSurface
}
const retryStyle = {
  border: 0,
  background: 'transparent',
  textDecoration: 'underline',
  cursor: 'pointer',
  fontWeight: 700
}
const tableStyle = { width: '100%', borderCollapse: 'collapse' as const, background: colors.surface }
const thStyle = {
  padding: 12,
  textAlign: 'left' as const,
  color: colors.slate,
  borderBottom: `1px solid ${colors.hairline}`
}
const tdStyle = { padding: 12, borderBottom: `1px solid ${colors.hairline}` }

export default PartnerReportsPage
