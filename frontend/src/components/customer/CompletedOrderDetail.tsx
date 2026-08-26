import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useState, type CSSProperties } from 'react'
import { CheckCircle2, Clock3, QrCode, ReceiptText, WalletCards } from 'lucide-react'
import { Badge, Button, LoadingSpinner, Modal, variantForStatus } from '../ui'
import { QRCodeDisplay } from '../common/QRCodeDisplay'
import { CheckoutProgress } from './CheckoutProgress'
import { getOrderPayments, type OrderResponse, type PaymentTransactionResponse } from '../../services/orders'
import type { Order } from '../../types/customer'
import { formatCurrency, formatDateTime, formatStatus } from '../../utils/format'
import { colors, fonts, radius, shadows } from '../../theme/tokens'

type VoucherCode = NonNullable<OrderResponse['codes']>[number]

interface CompletedOrderDetailProps {
  order: OrderResponse | Order
  /** Callback pages do not need a duplicate back link; the full detail page does. */
  showBackLink?: boolean
}

/**
 * Canonical paid-order presentation shared by the order page and gateway return
 * page. A gateway return becomes a completed order only after its backend order
 * is PAID; this component deliberately has no gateway/query-string logic.
 */
export function CompletedOrderDetail({ order, showBackLink = true }: CompletedOrderDetailProps) {
  const items = order.items || ('orderItems' in order ? order.orderItems || [] : [])
  const [selectedQrCode, setSelectedQrCode] = useState<VoucherCode | null>(null)
  const {
    data: payments = [],
    isLoading: isLoadingPayments,
    isError: isPaymentsError,
    refetch: refetchPayments
  } = useQuery({
    queryKey: ['order-payments', order.id],
    queryFn: () => getOrderPayments(order.id),
    retry: 1
  })

  return (
    <section className='order-detail-page' style={wrapperStyle} data-testid='completed-order-detail'>
      {showBackLink && (
        <p style={{ marginTop: 0, marginBottom: 18 }}>
          <Link to='/orders' className='order-detail-back' style={linkStyle}>
            ← Quay lại đơn hàng
          </Link>
        </p>
      )}

      <div data-testid='checkout-step-complete'>
        <CheckoutProgress current='complete' />
      </div>

      <div className='order-detail-hero' style={headerStyle}>
        <div>
          <span className='order-detail-eyebrow'>Chi tiết giao dịch</span>
          <h1 style={headingStyle}>Đơn #{order.id.slice(0, 8)}</h1>
          <p style={createdAtStyle}>Đặt lúc {formatDateTime(order.createdAt)}</p>
        </div>
        <Badge variant={variantForStatus('PAID')}>Đã thanh toán</Badge>
      </div>

      {(order.giftRecipient?.name || order.giftRecipient?.email || order.giftRecipient?.phone) && (
        <div style={cardStyle}>
          <h2 style={cardTitleStyle}>Người nhận quà</h2>
          {order.giftRecipient?.name && <p style={lineStyle}>Tên: {order.giftRecipient.name}</p>}
          {order.giftRecipient?.email && <p style={lineStyle}>Email: {order.giftRecipient.email}</p>}
          {order.giftRecipient?.phone && <p style={lineStyle}>Điện thoại: {order.giftRecipient.phone}</p>}
        </div>
      )}

      <div className='order-detail-card' style={cardStyle}>
        <div className='order-card-heading'>
          <span className='order-card-icon'>
            <ReceiptText size={20} aria-hidden='true' />
          </span>
          <div>
            <h2 style={cardTitleStyle}>Voucher trong đơn</h2>
            <p>Thông tin voucher đã được xác nhận thanh toán.</p>
          </div>
        </div>
        <div className='order-detail-table-wrap'>
          <table className='order-summary-table' style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Voucher</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>SL</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Đơn giá</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span>{item.voucherProductName}</span>
                      <Link
                        to={`/vouchers/${item.voucherProductId}#reviews`}
                        style={reviewLinkStyle}
                        data-testid={`review-link-${item.id}`}
                      >
                        ★ Đánh giá
                      </Link>
                    </div>
                  </td>
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
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>{formatCurrency(order.totalAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <PaymentHistory
        payments={payments}
        isLoading={isLoadingPayments}
        isError={isPaymentsError}
        onRetry={() => void refetchPayments()}
      />

      <div style={cardStyle}>
        <h2 style={cardTitleStyle}>Mã voucher</h2>
        {!order.codes?.length ? (
          <p style={lineStyle}>Đơn hàng chưa có mã voucher.</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {order.codes.map((code) => (
              <li key={code.code} style={codeRowStyle}>
                <div style={codeIdentityStyle}>
                  <strong style={codeTextStyle}>{code.code}</strong>
                  <Badge variant={variantForStatus(code.status)}>{formatStatus(code.status)}</Badge>
                </div>
                {code.status === 'UNUSED' && (
                  <Button
                    type='button'
                    variant='secondary'
                    size='sm'
                    leftIcon={<QrCode size={16} aria-hidden='true' />}
                    onClick={() => setSelectedQrCode(code)}
                    aria-label={`Hiển thị QR cho mã ${code.code}`}
                  >
                    Hiển thị QR
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        isOpen={Boolean(selectedQrCode)}
        onClose={() => setSelectedQrCode(null)}
        title='QR voucher của bạn'
        size='sm'
        footer={
          <Button type='button' variant='secondary' onClick={() => setSelectedQrCode(null)}>
            Đóng
          </Button>
        }
      >
        {selectedQrCode && (
          <div style={qrModalContentStyle}>
            <QRCodeDisplay value={selectedQrCode.code} size={280} />
            <strong style={qrCodeTextStyle}>{selectedQrCode.code}</strong>
            <Badge variant={variantForStatus(selectedQrCode.status)}>{formatStatus(selectedQrCode.status)}</Badge>
            <p style={qrHelpStyle}>Đưa mã QR này cho nhân viên đối tác để kiểm tra và xác nhận sử dụng.</p>
            <p style={qrExpiryStyle}>Hạn sử dụng: {formatDateTime(selectedQrCode.expiresAt)}</p>
          </div>
        )}
      </Modal>
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
          <h2 style={cardTitleStyle}>Thông tin thanh toán</h2>
          <p>Phương thức và số tiền của giao dịch đã hoàn tất.</p>
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
            <strong>Chưa có thanh toán thành công</strong>
            <span>Thông tin sẽ xuất hiện sau khi đơn hàng được thanh toán.</span>
          </div>
        </div>
      ) : (
        <ol className='payment-timeline'>
          {payments.map((payment) => (
            <li key={payment.id} className={`payment-timeline-item payment-${payment.status.toLowerCase()}`}>
              <span className='payment-timeline-marker'>
                <CheckCircle2 size={18} aria-hidden='true' />
              </span>
              <div className='payment-timeline-content'>
                <div className='payment-timeline-main'>
                  <div>
                    <strong>{gatewayLabel(payment.gateway)}</strong>
                    <span>{formatDateTime(payment.refundedAt || payment.paidAt || payment.createdAt)}</span>
                  </div>
                  <div className='payment-timeline-amount'>
                    <strong>{formatCurrency(payment.amount)}</strong>
                    <span className='payment-status-label'>Đã thanh toán</span>
                  </div>
                </div>
                {payment.gatewayTransId && (
                  <div className='payment-timeline-meta'>
                    <span>Mã đối soát: {payment.gatewayTransId}</span>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function gatewayLabel(gateway: string): string {
  return (
    (
      {
        VNPAY: 'VNPay',
        ONEPAY: 'OnePay (Napas ATM)',
        STRIPE: 'Thẻ quốc tế · Stripe',
        PAYPAL: 'PayPal',
        ZALOPAY: 'Ví ZaloPay',
        SIMULATE: 'Thanh toán mô phỏng'
      } as Record<string, string>
    )[gateway.toUpperCase()] || gateway
  )
}

const wrapperStyle: CSSProperties = { maxWidth: 980, margin: '0 auto' }
const linkStyle: CSSProperties = { color: colors.ink, fontWeight: 600 }
const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 16,
  marginBottom: 16
}
const headingStyle: CSSProperties = {
  margin: 0,
  fontFamily: fonts.display,
  letterSpacing: '-0.02em',
  color: colors.ink
}
const createdAtStyle: CSSProperties = { margin: '4px 0 0', color: colors.slate, fontSize: 13 }
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
const tableStyle: CSSProperties = { width: '100%', minWidth: 560, borderCollapse: 'collapse', fontSize: 14 }
const thStyle: CSSProperties = {
  textAlign: 'left',
  padding: '8px',
  borderBottom: `1px solid ${colors.hairline}`,
  fontSize: 13,
  color: colors.slate,
  fontWeight: 600
}
const tdStyle: CSSProperties = { padding: '8px', borderBottom: `1px solid ${colors.hairline}`, color: colors.ink }
const reviewLinkStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--accent, #4338ca)',
  background: '#e0e7ff',
  padding: '2px 8px',
  borderRadius: 4,
  textDecoration: 'none'
}
const codeRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  flexWrap: 'wrap',
  padding: '12px 0',
  borderBottom: `1px solid ${colors.hairline}`
}
const codeIdentityStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }
const codeTextStyle: CSSProperties = { fontFamily: 'monospace', color: colors.ink, fontSize: 16 }
const qrModalContentStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 12,
  textAlign: 'center'
}
const qrCodeTextStyle: CSSProperties = {
  fontFamily: 'monospace',
  fontSize: 18,
  letterSpacing: '0.08em',
  color: colors.ink
}
const qrHelpStyle: CSSProperties = { margin: '4px 0 0', color: colors.slate, lineHeight: 1.6 }
const qrExpiryStyle: CSSProperties = { margin: 0, color: colors.slate, fontSize: 13 }
