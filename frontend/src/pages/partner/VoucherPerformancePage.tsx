import { useQuery } from '@tanstack/react-query'
import { LoadingSpinner, Badge, variantForStatus } from '../../components/ui'
import { getPartnerReport } from './PartnerReportsPage'
import { ReportTabs } from './RevenueReportPage'
import { formatCurrency, formatStatus } from '../../utils/format'
import { colors, fonts, radius, shadows } from '../../theme/tokens'

export function VoucherPerformancePage() {
  const report = useQuery({ queryKey: ['partner', 'reports'], queryFn: getPartnerReport })
  if (report.isLoading) return <LoadingSpinner label='Đang tải hiệu quả voucher' />
  if (report.isError) return <div role='alert'>Không thể tải hiệu quả voucher.</div>
  return (
    <section className='partner-page partner-performance-page' style={{ maxWidth: 1180, margin: '0 auto' }}>
      <ReportTabs />
      <header style={{ margin: '28px 0' }}>
        <p style={{ color: colors.accent, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em' }}>
          Danh mục vận hành
        </p>
        <h1 style={{ margin: 0, fontFamily: fonts.display, fontSize: 'clamp(30px, 4vw, 40px)' }}>
          Hiệu quả từng voucher
        </h1>
        <p style={{ color: colors.slate }}>So sánh doanh thu, số mã phát hành, lượt bán và tỷ lệ sử dụng.</p>
      </header>
      <div
        style={{
          overflowX: 'auto',
          borderRadius: radius.xl,
          background: colors.surface,
          border: `1px solid ${colors.hairline}`,
          boxShadow: shadows.card
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Voucher', 'Trạng thái', 'Doanh thu', 'Phát hành', 'Đã bán', 'Đã dùng', 'Tỷ lệ dùng'].map((h) => (
                <th key={h} style={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {report.data!.vouchers.map((v) => (
              <tr key={v.id}>
                <td style={td}>
                  <strong>{v.name}</strong>
                </td>
                <td style={td}>
                  <Badge variant={variantForStatus(v.status)}>{formatStatus(v.status)}</Badge>
                </td>
                <td style={td}>{formatCurrency(v.revenue)}</td>
                <td style={td}>{v.issuedCount}</td>
                <td style={td}>{v.soldCount}</td>
                <td style={td}>{v.usedCount}</td>
                <td style={td}>
                  <div style={{ minWidth: 120 }}>
                    <strong>{Math.round(v.usageRate * 100)}%</strong>
                    <div style={{ height: 7, marginTop: 6, borderRadius: 9, background: colors.surfaceMuted }}>
                      <div
                        style={{
                          width: `${Math.min(100, v.usageRate * 100)}%`,
                          height: '100%',
                          borderRadius: 9,
                          background: colors.accent
                        }}
                      />
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
const th = {
  padding: '15px 18px',
  textAlign: 'left' as const,
  color: colors.slate,
  borderBottom: `1px solid ${colors.hairline}`,
  fontSize: 12,
  textTransform: 'uppercase' as const,
  letterSpacing: '.06em'
}
const td = { padding: '17px 18px', borderBottom: `1px solid ${colors.hairline}` }
