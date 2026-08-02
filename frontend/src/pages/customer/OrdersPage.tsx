/**
 * OrdersPage — customer order history list (task 12.4, Req 17 / PAGE-10).
 *
 * Fetches the authenticated customer's orders (GET /orders, newest first) with
 * TanStack Query and renders each as a clickable row showing the order id,
 * date, item count, total and a status badge. Selecting a row navigates to the
 * order detail page.
 *
 * States handled: loading (spinner), error (inline alert), empty (call to
 * action to browse vouchers), and the populated list.
 *
 * _Requirements: 17.1_
 */
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import type { CSSProperties } from 'react'
import { api } from '../../services/api'
import type { Order } from '../../types/customer'
import { Badge, variantForStatus, LoadingSpinner } from '../../components/ui'
import { formatCurrency, formatDate, formatStatus } from '../../utils/format'
import { colors, fonts, radius, shadows } from '../../theme/tokens'

/** Fetch the customer's orders (newest first per the backend ordering). */
async function fetchOrders(): Promise<Order[]> {
  const { data } = await api.get<Order[]>('/orders')
  return data
}

/** Total number of voucher units in an order (sum of line quantities). */
function itemCount(order: Order): number {
  return order.orderItems.reduce((sum, item) => sum + item.quantity, 0)
}

export function OrdersPage() {
  const navigate = useNavigate()
  const {
    data: orders,
    isLoading,
    isError
  } = useQuery({
    queryKey: ['orders'],
    queryFn: fetchOrders
  })

  return (
    <section style={{ maxWidth: 820, margin: '0 auto' }}>
      <h1 style={pageHeadingStyle}>Đơn hàng của tôi</h1>

      {isLoading && (
        <div style={{ padding: 32 }}>
          <LoadingSpinner label='Đang tải đơn hàng' />
        </div>
      )}

      {isError && (
        <div role='alert' style={alertStyle}>
          Không thể tải đơn hàng. Vui lòng thử lại sau.
        </div>
      )}

      {!isLoading && !isError && orders && orders.length === 0 && (
        <div style={emptyStyle}>
          <p style={{ margin: 0 }}>Bạn chưa có đơn hàng nào.</p>
          <Link to='/search' style={linkStyle}>
            Khám phá voucher →
          </Link>
        </div>
      )}

      {!isLoading && !isError && orders && orders.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {orders.map((order) => (
            <li key={order.id}>
              <button
                type='button'
                onClick={() => navigate(`/orders/${order.id}`)}
                style={rowStyle}
                aria-label={`Xem đơn hàng ${order.id}`}
              >
                <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontWeight: 600, fontFamily: fonts.display }}>Đơn #{order.id.slice(0, 8)}</span>
                  <span style={{ color: colors.slate, fontSize: 13 }}>
                    {formatDate(order.createdAt)} · {itemCount(order)} voucher
                  </span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontWeight: 700 }}>{formatCurrency(order.totalAmount)}</span>
                  <Badge variant={variantForStatus(order.status)}>{formatStatus(order.status)}</Badge>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

const pageHeadingStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 20,
  fontFamily: fonts.display,
  fontSize: 40,
  fontWeight: 800,
  letterSpacing: '-0.03em',
  color: colors.ink
}

const linkStyle: CSSProperties = {
  color: colors.ink,
  fontWeight: 600
}

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  padding: '18px 20px',
  marginBottom: 12,
  background: colors.surface,
  border: `1px solid ${colors.hairline}`,
  borderRadius: radius.xl,
  boxShadow: shadows.card,
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 14,
  color: colors.ink,
  textAlign: 'left'
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
  padding: 40,
  background: colors.surface,
  border: `1px solid ${colors.hairline}`,
  borderRadius: radius.xl,
  boxShadow: shadows.card,
  color: colors.ink
}

export default OrdersPage
