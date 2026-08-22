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
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  CreditCard,
  Landmark,
  ReceiptText,
  RefreshCcw,
  ShieldCheck,
  WalletCards,
  XCircle
} from 'lucide-react'
import { api } from '../../services/api'
import type { Order } from '../../types/customer'
import { Badge, variantForStatus, LoadingSpinner, Button, ConfirmDialog, useToast } from '../../components/ui'
import { formatCurrency, formatDateTime, formatStatus } from '../../utils/format'
import { colors, fonts, radius, shadows } from '../../theme/tokens'
import { CheckoutProgress } from '../../components/customer/CheckoutProgress'
import { getOrderPayments, type PaymentTransactionResponse } from '../../services/orders'

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
  const {
    data: payments = [],
    isLoading: isLoadingPayments,
    isError: isPaymentsError,
    refetch: refetchPayments
  } = useQuery({
    queryKey: ['order-payments', id],
    queryFn: () => getOrderPayments(id),
    enabled: Boolean(id && order),
    retry: 1
  })
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
      <p style={{ marginTop: 0, marginBottom: 18 }}>
        <Link to='/orders' className='order-detail-back' style={linkStyle}>
          <ArrowLeft size={17} aria-hidden='true' /> Quay lại đơn hàng
        </Link>
      </p>

      <CheckoutProgress current={isPaid ? 'complete' : 'checkout'} />

      <div className='order-detail-hero' style={headerStyle}>
        <div>
          <span className='order-detail-eyebrow'>Chi tiết giao dịch</span>
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
        <div className='order-card-heading'>
          <span className='order-card-icon'>
            <ReceiptText size={20} aria-hidden='true' />
          </span>
          <div>
            <h2 style={cardTitleStyle}>Voucher trong đơn</h2>
            <p>Kiểm tra sản phẩm và số lượng trước khi thanh toán.</p>
          </div>
        </div>
        <div className='order-detail-table-wrap'>
          <table
            className='order-summary-table'
            style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse', fontSize: 14 }}
          >
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
        <div className='order-payment-card' style={cardStyle}>
          <div className='order-payment-heading'>
            <div>
              <span>Thanh toán an toàn</span>
              <h2>Chọn phương thức thanh toán</h2>
            </div>
            <ShieldCheck size={30} aria-hidden='true' />
          </div>
          <p className='order-payment-note'>
            Đơn hàng đang chờ hoàn tất thanh toán và được giữ chỗ. Giao dịch được mã hóa và xử lý qua cổng thanh toán
            bảo mật.
          </p>
          <div className='order-payment-actions' style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 16 }}>
            <Button
              variant='primary'
              leftIcon={<Landmark size={19} aria-hidden='true' />}
              style={{ backgroundColor: colors.accent, borderColor: colors.accent }}
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
              leftIcon={<CreditCard size={19} aria-hidden='true' />}
              style={{ backgroundColor: colors.ink, borderColor: colors.ink }}
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
              variant='secondary'
              leftIcon={<XCircle size={18} aria-hidden='true' />}
              style={{ color: colors.danger, borderColor: colors.danger }}
              disabled={cancelMutation.isPending}
              isLoading={cancelMutation.isPending}
              onClick={() => setShowCancelDialog(true)}
            >
              Hủy đơn
            </Button>
          </div>
        </div>
      )}

      <PaymentHistory
        payments={payments}
        isLoading={isLoadingPayments}
        isError={isPaymentsError}
        onRetry={() => void refetchPayments()}
      />

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

function PaymentHistory({
  payments,
  isLoading,
  isError,
  onRetry
}: {
  payments: PaymentTransactionResponse[]
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}) {
  return (
    <div className='payment-history-card' style={cardStyle}>
      <div className='payment-history-header'>
        <span className='order-card-icon'>
          <WalletCards size={20} aria-hidden='true' />
        </span>
        <div>
          <h2 style={cardTitleStyle}>Lịch sử thanh toán</h2>
          <p>Theo dõi từng lần giao dịch và trạng thái đối soát của đơn hàng.</p>
        </div>
      </div>

      {isLoading ? (
        <div className='payment-history-state'>
          <LoadingSpinner label='Đang tải lịch sử thanh toán' />
        </div>
      ) : isError ? (
        <div className='payment-history-state payment-history-error' role='alert'>
          <span>Chưa thể tải lịch sử giao dịch.</span>
          <button type='button' onClick={onRetry}>
            Thử lại
          </button>
        </div>
      ) : payments.length === 0 ? (
        <div className='payment-history-empty'>
          <Clock3 size={22} aria-hidden='true' />
          <div>
            <strong>Chưa phát sinh giao dịch</strong>
            <span>Lịch sử sẽ xuất hiện sau khi bạn chọn một cổng thanh toán.</span>
          </div>
        </div>
      ) : (
        <ol className='payment-timeline'>
          {payments.map((payment) => {
            const presentation = paymentPresentation(payment.status)
            const StatusIcon = presentation.icon
            const eventTime = payment.refundedAt || payment.paidAt || payment.createdAt
            return (
              <li key={payment.id} className={`payment-timeline-item payment-${payment.status.toLowerCase()}`}>
                <span className='payment-timeline-marker'>
                  <StatusIcon size={18} aria-hidden='true' />
                </span>
                <div className='payment-timeline-content'>
                  <div className='payment-timeline-main'>
                    <div>
                      <strong>{gatewayLabel(payment.gateway)}</strong>
                      <span>{formatDateTime(eventTime)}</span>
                    </div>
                    <div className='payment-timeline-amount'>
                      <strong>{formatCurrency(payment.amount)}</strong>
                      <span className='payment-status-label'>{presentation.label}</span>
                    </div>
                  </div>
                  {(payment.gatewayTransId || payment.failureReason) && (
                    <div className='payment-timeline-meta'>
                      {payment.gatewayTransId && <span>Mã đối soát: {payment.gatewayTransId}</span>}
                      {payment.failureReason && <span className='payment-failure-reason'>{payment.failureReason}</span>}
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

function gatewayLabel(gateway: string): string {
  const labels: Record<string, string> = {
    VNPAY: 'VNPay',
    STRIPE: 'Thẻ quốc tế · Stripe',
    SIMULATE: 'Thanh toán mô phỏng'
  }
  return labels[gateway.toUpperCase()] || gateway
}

function paymentPresentation(status: PaymentTransactionResponse['status']) {
  const values = {
    PENDING: { label: 'Đang xử lý', icon: Clock3 },
    SUCCESS: { label: 'Thành công', icon: CheckCircle2 },
    FAILED: { label: 'Không thành công', icon: XCircle },
    REFUNDED: { label: 'Đã hoàn tiền', icon: RefreshCcw }
  }
  return values[status]
}

const wrapperStyle: CSSProperties = { maxWidth: 980, margin: '0 auto' }

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
