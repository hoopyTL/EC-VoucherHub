import { useQuery } from '@tanstack/react-query'
import { useState, type CSSProperties } from 'react'
import { Badge, Button, ContentSkeleton, Input, variantForStatus } from '../../components/ui'
import { DataTable } from '../../components/admin/DataTable'
import { api } from '../../services/api'
import { colors, fonts, radius, shadows } from '../../theme/tokens'
import { formatCurrency, formatDate, formatStatus } from '../../utils/format'

interface AdminOrder {
  id: string
  totalAmount: number
  status: string
  paymentMethod: string
  createdAt: string
  customer: { fullName: string; email?: string | null }
  items: Array<{ voucherName: string; quantity: number }>
}
async function loadOrders(q: string): Promise<AdminOrder[]> {
  const response = await api.get('/admin/orders', { params: { q: q || undefined, limit: 100 } })
  return response.data.data.items
}

export function OrdersPage() {
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const orders = useQuery({ queryKey: ['admin-orders', query], queryFn: () => loadOrders(query) })
  const paid = orders.data?.filter((item) => item.status === 'PAID') ?? []
  return (
    <section style={{ maxWidth: 1120, margin: '0 auto' }}>
      <p style={eyebrowStyle}>● Vận hành thương mại</p>
      <h1 style={titleStyle}>Quản lý đơn hàng</h1>
      <p style={subtitleStyle}>Theo dõi thanh toán và tra cứu toàn bộ đơn hàng từ dữ liệu thực.</p>
      <div style={summaryStyle}>
        <Summary value={String(orders.data?.length ?? 0)} label='Đơn đang hiển thị' />
        <Summary value={String(paid.length)} label='Đã thanh toán' />
        <Summary
          value={formatCurrency(paid.reduce((sum, item) => sum + item.totalAmount, 0))}
          label='Doanh thu hiển thị'
        />
      </div>
      <form
        style={toolbarStyle}
        onSubmit={(event) => {
          event.preventDefault()
          setQuery(input.trim())
        }}
      >
        <Input
          label='Tìm đơn hàng'
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder='Tên hoặc email khách hàng'
          containerStyle={{ flex: 1 }}
        />
        <Button type='submit'>Tìm kiếm</Button>
      </form>
      {orders.isLoading ? (
        <ContentSkeleton rows={6} label='Đang tải đơn hàng' />
      ) : orders.isError ? (
        <div role='alert' style={{ padding: 18, color: colors.danger }}>
          Không thể tải đơn hàng. Vui lòng thử lại.
        </div>
      ) : (
        <div style={tableCardStyle}>
          <DataTable style={{ width: '100%', borderCollapse: 'collapse' }} accessibleLabel='Danh sách đơn hàng'>
            <thead>
              <tr>
                {['Mã đơn', 'Khách hàng', 'Voucher', 'Ngày tạo', 'Thanh toán', 'Tổng tiền', 'Trạng thái'].map((x) => (
                  <th key={x} style={thStyle}>
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.data?.map((order) => (
                <tr key={order.id}>
                  <td style={tdStyle}>
                    <strong>#{order.id.slice(0, 8).toUpperCase()}</strong>
                  </td>
                  <td style={tdStyle}>
                    {order.customer.fullName}
                    <small style={smallStyle}>{order.customer.email}</small>
                  </td>
                  <td style={tdStyle}>
                    {order.items[0]?.voucherName ?? '—'}
                    <small style={smallStyle}>
                      {order.items.reduce((sum, item) => sum + item.quantity, 0)} voucher
                    </small>
                  </td>
                  <td style={tdStyle}>{formatDate(order.createdAt)}</td>
                  <td style={tdStyle}>{order.paymentMethod}</td>
                  <td style={tdStyle}>
                    <strong>{formatCurrency(order.totalAmount)}</strong>
                  </td>
                  <td style={tdStyle}>
                    <Badge variant={variantForStatus(order.status as never)}>
                      {formatStatus(order.status as never)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </div>
      )}
    </section>
  )
}
function Summary({ value, label }: { value: string; label: string }) {
  return (
    <div style={summaryCardStyle}>
      <strong style={{ fontSize: 26 }}>{value}</strong>
      <span style={{ color: colors.slate, fontSize: 13 }}>{label}</span>
    </div>
  )
}
const eyebrowStyle: CSSProperties = {
  margin: '0 0 10px',
  color: colors.accent,
  fontFamily: fonts.display,
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: '.1em',
  textTransform: 'uppercase'
}
const titleStyle: CSSProperties = {
  margin: 0,
  color: colors.ink,
  fontFamily: fonts.display,
  fontSize: 48,
  fontWeight: 800,
  letterSpacing: '-.04em'
}
const subtitleStyle: CSSProperties = { color: colors.slate, margin: '8px 0 24px' }
const summaryStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))',
  gap: 14,
  marginBottom: 22
}
const summaryCardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  padding: 20,
  background: 'linear-gradient(135deg,#fff,#f6f3ff)',
  border: '1px solid #ded7ff',
  borderRadius: radius.xl,
  boxShadow: shadows.card
}
const toolbarStyle: CSSProperties = { display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 20 }
const tableCardStyle: CSSProperties = {
  overflowX: 'auto',
  padding: 12,
  borderRadius: radius.xl,
  border: `1px solid ${colors.hairline}`,
  background: colors.surface,
  boxShadow: shadows.card
}
const thStyle: CSSProperties = {
  padding: '14px 12px',
  textAlign: 'left',
  color: colors.slate,
  borderBottom: `1px solid ${colors.hairline}`,
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '.05em'
}
const tdStyle: CSSProperties = {
  padding: '15px 12px',
  borderBottom: `1px solid ${colors.hairline}`,
  whiteSpace: 'nowrap'
}
const smallStyle: CSSProperties = { display: 'block', color: colors.slate, marginTop: 2 }
export default OrdersPage
