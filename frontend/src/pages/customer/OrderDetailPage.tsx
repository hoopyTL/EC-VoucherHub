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
import { Badge, variantForStatus, LoadingSpinner, Button, ConfirmDialog } from '../../components/ui'
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
  const [paymentError, setPaymentError] = useState('')
  const [startingGateway, setStartingGateway] = useState<'vnpay' | 'stripe' | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [actionMessage, setActionMessage] = useState<{type:'success'|'error';text:string}|null>(null)

  function paymentErrorMessage(error: any): string {
    return (
      error?.response?.data?.error?.message ||
      error?.response?.data?.error ||
      error?.message ||
      'Không thể khởi tạo cổng thanh toán. Vui lòng thử lại.'
    )
  }

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
      setCancelOpen(false)
      setActionMessage({type:'success',text:'Đã hủy đơn hàng và hoàn voucher về kho.'})
    },
    onError: (err: any) => {
      setCancelOpen(false)
      setActionMessage({type:'error',text:err?.response?.data?.message || err?.message || 'Không thể hủy đơn hàng.'})
    }
  })

  const isPaid = order?.status === 'PAID'
  const codesQuery = useQuery({
    queryKey: ['my-codes', id],
    queryFn: async () => {
      const { data } = await api.get<any>('/my-codes')
      const payload = (data as any).data || data
      const codes = payload.items || payload || []
      return codes.filter((code: { orderId?: string; order?: { id?: string } }) => (code.orderId || code.order?.id) === id)
    },
    enabled: isPaid && !(order?.codes?.length || order?.voucherCodes?.length)
  })
  const orderCodes = order?.codes || order?.voucherCodes || codesQuery.data || []

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
        <Link to='/cart?tab=orders' style={linkStyle}>
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
          <Link to='/cart?tab=orders' style={linkStyle}>
            ← Quay lại đơn hàng
          </Link>
        </p>
      </section>
    )
  }

  return (
    <section style={wrapperStyle}>
      {actionMessage && <div role={actionMessage.type==='error'?'alert':'status'} style={{...alertStyle,background:actionMessage.type==='success'?'#dcfce7':undefined,color:actionMessage.type==='success'?'#166534':undefined,marginBottom:16}}>{actionMessage.text}</div>}
      <p style={{ marginTop: 0, marginBottom: 8 }}>
        <Link to='/cart?tab=orders' style={linkStyle}>
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

      <div style={cardStyle}>
        <h2 style={cardTitleStyle}>Voucher</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr>
              <th style={thStyle}>Voucher</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>SL</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Đơn giá</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {(order.items || order.orderItems || []).map((item) => (
              <tr key={item.id}>
                <td style={tdStyle}>{item.voucherProductName || item.voucher?.title}</td>
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

      {order.status === 'PENDING_PAYMENT' && (
        <div style={cardStyle}>
          <p style={{ margin: 0, color: colors.ink }}>Đơn hàng đang chờ hoàn tất thanh toán.</p>
          {paymentError && (
            <div role='alert' style={{ ...alertStyle, marginTop: 16 }}>
              <strong>Chưa thể mở cổng thanh toán.</strong>
              <div style={{ marginTop: 4 }}>{paymentError}</div>
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 16 }}>
            <Button
              variant='primary'
              style={{ backgroundColor: '#005baa' }}
              disabled={startingGateway !== null}
              isLoading={startingGateway === 'vnpay'}
              onClick={async () => {
                setPaymentError('')
                setStartingGateway('vnpay')
                try {
                  const { getVNPayUrl } = await import('../../services/orders')
                  const url = await getVNPayUrl(order.id)
                  window.location.href = url
                } catch (e) {
                  setPaymentError(paymentErrorMessage(e))
                  setStartingGateway(null)
                }
              }}
            >
              Thanh toán qua VNPay
            </Button>

            <Button
              variant='primary'
              style={{ backgroundColor: '#635BFF' }}
              disabled={startingGateway !== null}
              isLoading={startingGateway === 'stripe'}
              onClick={async () => {
                setPaymentError('')
                setStartingGateway('stripe')
                try {
                  const { getStripeUrl } = await import('../../services/orders')
                  const url = await getStripeUrl(order.id)
                  window.location.href = url
                } catch (e) {
                  setPaymentError(paymentErrorMessage(e))
                  setStartingGateway(null)
                }
              }}
            >
              Thanh toán qua thẻ quốc tế (Stripe)
            </Button>

            <Button
              variant='danger'
              disabled={cancelMutation.isPending}
              isLoading={cancelMutation.isPending}
              onClick={() => setCancelOpen(true)}
            >
              Hủy đơn
            </Button>
          </div>
        </div>
      )}
      <ConfirmDialog open={cancelOpen} title='Xác nhận hủy đơn' message='Voucher trong đơn sẽ được hoàn lại kho. Bạn có chắc muốn hủy đơn hàng này?' cancelLabel='Tiếp tục thanh toán' confirmLabel='Hủy đơn' danger busy={cancelMutation.isPending} onCancel={()=>setCancelOpen(false)} onConfirm={()=>cancelMutation.mutate()} />

      {isPaid && (
        <div style={cardStyle}>
          <h2 style={cardTitleStyle}>Mã voucher</h2>
          {orderCodes.length === 0 ? (
            <p style={lineStyle}>Đơn hàng chưa có mã voucher.</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {orderCodes.map((code: { code: string; status: string }) => (
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
