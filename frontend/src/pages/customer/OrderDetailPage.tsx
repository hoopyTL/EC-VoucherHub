/**
 * OrderDetailPage — single order view (task 12.4, Req 17 / PAGE-11).
 *
 * Fetches one order (GET /orders/:id) and renders its metadata (id, date,
 * status, recipient), a line-item table, and the order total. When the order is
 * PAID, the issued voucher codes are listed with links to their detail page
 * (the codes are read from GET /my-codes and filtered to this order), matching
 * the "voucher codes shown only if PAID" rule from the UI design.
 *
 * A 404 (order missing or not owned by the customer) renders a friendly "not
 * found" message rather than an error alert.
 *
 * _Requirements: 17.1, 17.2_
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { useState, type CSSProperties } from 'react'
import { api } from '../../services/api'
import type { Order } from '../../types/customer'
import { Badge, variantForStatus, LoadingSpinner, Button, ConfirmDialog, useToast } from '../../components/ui'
import { formatCurrency, formatDateTime, formatStatus } from '../../utils/format'
import { colors, fonts, radius, shadows } from '../../theme/tokens'

async function fetchOrder(id: string): Promise<Order> {
  const { data } = await api.get<any>(`/orders/${id}`)
  return (data as any).data || data
}

/** True when the failed query was a 404 (missing / not owned). */
function isNotFound(error: unknown): boolean {
  return (error as { response?: { status?: number } } | null)?.response?.status === 404
}

export function OrderDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const toast = useToast()
  const [showCancelDialog, setShowCancelDialog] = useState(false)

  const {
    data: order,
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: ['order', id],
    queryFn: () => fetchOrder(id),
    enabled: Boolean(id)
  })

  const queryClient = useQueryClient()
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const { cancelOrder } = await import('../../services/orders')
      return cancelOrder(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      setShowCancelDialog(false)
      toast.success('Đã hủy đơn hàng thành công, số lượng voucher đã được hoàn lại kho.')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error?.message || 'Không thể hủy đơn hàng. Vui lòng thử lại.')
    }
  })

  const isPaid = order?.status === 'PAID'
  const orderCodes = order?.codes || []

  if (isLoading) {
    return (
      <div style={{ padding: 32 }}>
        <LoadingSpinner label='Đang tải đơn hàng' />
      </div>
    )
  }

  if (isError && isNotFound(error)) {
    return (
      <section style={wrapperStyle}>
        <h1 style={pageHeadingStyle}>Không tìm thấy đơn hàng</h1>
        <p style={{ color: colors.slate }}>Đơn hàng không tồn tại hoặc không thuộc tài khoản của bạn.</p>
        <Link to='/orders' style={linkStyle}>
          ← Quay lại đơn hàng
        </Link>
      </section>
    )
  }

  if (isError || !order) {
    return (
      <section style={wrapperStyle}>
        <div role='alert' style={alertStyle}>
          Không thể tải đơn hàng này. Vui lòng thử lại sau.
        </div>
        <p style={{ marginTop: 16 }}>
          <Link to='/orders' style={linkStyle}>
            ← Quay lại đơn hàng
          </Link>
        </p>
      </section>
    )
  }

  return (
    <section className='order-detail-page' style={wrapperStyle}>
      <p style={{ marginTop: 0, marginBottom: 8 }}>
        <Link to='/orders' style={linkStyle}>
          ← Quay lại đơn hàng
        </Link>
      </p>

      <div style={headerStyle}>
        <div>
          <h1 style={{ margin: 0, fontFamily: fonts.display, letterSpacing: '-0.02em', color: colors.ink }}>
            Đơn #{order.id.slice(0, 8)}
          </h1>
          <p style={{ margin: '4px 0 0', color: colors.slate, fontSize: 13 }}>
            Đặt lúc {formatDateTime(order.createdAt)}
          </p>
        </div>
        <Badge variant={variantForStatus(order.status)}>{formatStatus(order.status)}</Badge>
      </div>

      {(order.giftRecipient?.name || order.giftRecipient?.email || order.giftRecipient?.phone) && (
        <div style={cardStyle}>
          <h2 style={cardTitleStyle}>Người nhận quà</h2>
          {order.giftRecipient?.name && <p style={lineStyle}>Tên: {order.giftRecipient?.name}</p>}
          {order.giftRecipient?.email && <p style={lineStyle}>Email: {order.giftRecipient?.email}</p>}
          {order.giftRecipient?.phone && <p style={lineStyle}>Điện thoại: {order.giftRecipient?.phone}</p>}
        </div>
      )}

      <div className='order-detail-card' style={cardStyle}>
        <h2 style={cardTitleStyle}>Voucher</h2>
        <div className='order-detail-table-wrap'>
          <table style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr>
                <th style={thStyle}>Voucher</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>SL</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Đơn giá</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {(order.items || []).map((item) => (
                <tr key={item.id}>
                  <td style={tdStyle}>{item.voucherProductName}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{formatCurrency(item.unitPrice)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    {formatCurrency(Number(item.unitPrice) * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td style={{ ...tdStyle, fontWeight: 600 }} colSpan={3}>
                  Tổng cộng
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{formatCurrency(order.totalAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {order.status === 'PENDING_PAYMENT' && (
        <div style={cardStyle}>
          <p style={{ margin: 0, color: colors.ink }}>Đơn hàng đang chờ hoàn tất thanh toán.</p>
          <div className='order-payment-actions' style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 16 }}>
            <Button
              variant='primary'
              style={{ backgroundColor: '#005baa' }}
              onClick={async () => {
                try {
                  const { getVNPayUrl } = await import('../../services/orders')
                  const url = await getVNPayUrl(order.id)
                  window.location.href = url
                } catch (error: any) {
                  toast.error(error?.response?.data?.error?.message || 'Không thể mở VNPay. Vui lòng thử lại.')
                }
              }}
            >
              Thanh toán qua VNPay
            </Button>

            <Button
              variant='primary'
              style={{ backgroundColor: '#635bff' }}
              onClick={async () => {
                try {
                  const { getStripeUrl } = await import('../../services/orders')
                  const url = await getStripeUrl(order.id)
                  window.location.href = url
                } catch (error: any) {
                  toast.error(
                    error?.response?.data?.error?.message || 'Không thể mở cổng thanh toán quốc tế. Vui lòng thử lại.'
                  )
                }
              }}
            >
              Thanh toán qua thẻ quốc tế (Stripe)
            </Button>

            <Button
              variant='danger'
              disabled={cancelMutation.isPending}
              isLoading={cancelMutation.isPending}
              onClick={() => setShowCancelDialog(true)}
            >
              Hủy đơn
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showCancelDialog}
        title='Xác nhận hủy đơn hàng'
        message='Bạn có chắc muốn hủy đơn hàng này không? Số lượng voucher sẽ được trả lại kho.'
        confirmLabel='Hủy đơn'
        cancelLabel='Tiếp tục thanh toán'
        danger
        busy={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate()}
        onCancel={() => setShowCancelDialog(false)}
      />

      {isPaid && (
        <div style={cardStyle}>
          <h2 style={cardTitleStyle}>Mã voucher</h2>
          {orderCodes.length === 0 ? (
            <p style={lineStyle}>Đơn hàng chưa có mã voucher.</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {orderCodes.map((code) => (
                <li key={code.code} style={codeRowStyle}>
                  <strong style={{ fontFamily: 'monospace', color: colors.ink, fontSize: 16 }}>{code.code}</strong>
                  <Badge variant={variantForStatus(code.status as any)}>{formatStatus(code.status as any)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}

const wrapperStyle: CSSProperties = { maxWidth: 760, margin: '0 auto' }

const pageHeadingStyle: CSSProperties = {
  marginTop: 0,
  fontFamily: fonts.display,
  fontSize: 32,
  fontWeight: 700,
  letterSpacing: '-0.02em',
  color: colors.ink
}

const linkStyle: CSSProperties = {
  color: colors.ink,
  fontWeight: 600
}

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 16,
  marginBottom: 16
}

const cardStyle: CSSProperties = {
  padding: 24,
  marginBottom: 16,
  background: colors.surface,
  border: `1px solid ${colors.hairline}`,
  borderRadius: radius.xl,
  boxShadow: shadows.card
}

const cardTitleStyle: CSSProperties = {
  margin: '0 0 12px',
  fontFamily: fonts.display,
  fontSize: 16,
  fontWeight: 700,
  letterSpacing: '-0.01em',
  color: colors.ink
}

const lineStyle: CSSProperties = { margin: '4px 0', fontSize: 14, color: colors.slate }

const thStyle: CSSProperties = {
  textAlign: 'left',
  padding: '8px 8px',
  borderBottom: `1px solid ${colors.hairline}`,
  fontSize: 13,
  color: colors.slate,
  fontWeight: 600
}

const tdStyle: CSSProperties = {
  padding: '8px 8px',
  borderBottom: `1px solid ${colors.hairline}`,
  color: colors.ink
}

const codeRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 0',
  borderBottom: `1px solid ${colors.hairline}`
}

const alertStyle: CSSProperties = {
  padding: '12px 16px',
  borderRadius: radius.md,
  background: colors.dangerSurface,
  border: `1px solid ${colors.dangerSurface}`,
  color: colors.onDangerSurface,
  fontSize: 14
}

export default OrderDetailPage
