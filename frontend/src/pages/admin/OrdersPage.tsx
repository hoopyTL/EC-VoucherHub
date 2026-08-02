import { Badge, Button, Input, variantForStatus } from '../../components/ui'
import { colors, fonts, radius, shadows } from '../../theme/tokens'
import { formatCurrency, formatDate, formatStatus } from '../../utils/format'

const ORDERS = [
  {
    id: 'VH-2026-0184',
    customer: 'Nguyễn Minh Anh',
    total: 1368000,
    status: 'PAID',
    createdAt: '2026-08-02T08:00:00.000Z'
  },
  {
    id: 'VH-2026-0183',
    customer: 'Trần Gia Hân',
    total: 620000,
    status: 'PENDING_PAYMENT',
    createdAt: '2026-08-01T09:30:00.000Z'
  },
  {
    id: 'VH-2026-0182',
    customer: 'Lê Hoàng Nam',
    total: 1990000,
    status: 'CANCELLED',
    createdAt: '2026-07-31T14:15:00.000Z'
  }
] as const

export function OrdersPage() {
  return (
    <section style={{ maxWidth: 1040, margin: '0 auto' }}>
      <p style={eyebrowStyle}>● Vận hành</p>
      <h1 style={titleStyle}>Quản lý đơn hàng</h1>
      <p style={subtitleStyle}>Tra cứu trạng thái thanh toán, hủy và hoàn tiền đơn hàng.</p>
      <div style={toolbarStyle}>
        <Input label='Tìm đơn hàng' placeholder='Mã đơn hoặc tên khách hàng' containerStyle={{ flex: 1 }} />
        <Button>Tìm kiếm</Button>
      </div>
      <div style={tableCardStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Mã đơn</th>
              <th style={thStyle}>Khách hàng</th>
              <th style={thStyle}>Ngày tạo</th>
              <th style={thStyle}>Tổng tiền</th>
              <th style={thStyle}>Trạng thái</th>
              <th style={thStyle}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {ORDERS.map((order) => (
              <tr key={order.id}>
                <td style={tdStyle}>
                  <strong>{order.id}</strong>
                </td>
                <td style={tdStyle}>{order.customer}</td>
                <td style={tdStyle}>{formatDate(order.createdAt)}</td>
                <td style={tdStyle}>{formatCurrency(order.total)}</td>
                <td style={tdStyle}>
                  <Badge variant={variantForStatus(order.status)}>{formatStatus(order.status)}</Badge>
                </td>
                <td style={tdStyle}>
                  <Button size='sm' variant='secondary'>
                    Xem chi tiết
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
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
const subtitleStyle = { color: colors.slate, marginBottom: 24 }
const toolbarStyle = { display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 20 }
const tableCardStyle = {
  overflowX: 'auto' as const,
  padding: 12,
  borderRadius: radius.xl,
  border: `1px solid ${colors.hairline}`,
  background: colors.surface,
  boxShadow: shadows.card
}
const thStyle = {
  padding: '14px 12px',
  textAlign: 'left' as const,
  color: colors.slate,
  borderBottom: `1px solid ${colors.hairline}`,
  fontSize: 12,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em'
}
const tdStyle = { padding: '16px 12px', borderBottom: `1px solid ${colors.hairline}`, whiteSpace: 'nowrap' as const }

export default OrdersPage
