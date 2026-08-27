/**
 * CheckoutPage — order confirmation from the cart (task 12.3).
 *
 * Renders the cart contents as an order summary (each line's title, unit price,
 * quantity, subtotal, plus the cart total — Req 14.1) and an optional
 * gift-recipient form (name / email / phone — Req 14.2). Confirming places the
 * order via `POST /orders`; on success the customer is forwarded to the payment
 * order detail page (`/orders/:id`) to review the result.
 *
 * Data flow:
 *   - The cart is fetched with TanStack Query (key `['cart']`) and drives the
 *     summary. An empty cart blocks checkout with a clear message.
 *   - Order creation is a mutation; server errors (e.g. out-of-stock at
 *     confirmation time — Req 14.4) surface in an inline alert region. There is
 *     no ToastProvider mounted at the app root, so feedback uses inline alerts.
 *
 * _Requirements: 14.1, 14.2, 15.1_
 */
import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, CreditCard, ShieldCheck, Smartphone, WalletCards } from 'lucide-react'
import type { CreateOrderRequest } from '@ui-contracts'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { ContentSkeleton } from '../../components/ui/ContentSkeleton'
import { colors, fonts, radius, shadows } from '../../theme/tokens'
import {
  createOrder,
  formatMoney,
  getApiErrorMessage,
  getCart,
  getOrder,
  getOnePayUrl,
  getPayPalUrl,
  getStripeUrl,
  getVNPayUrl,
  type CartResponse,
  type OrderResponse
} from '../../services/orders'
import { clearCheckoutSelection, readCheckoutSelection } from '../../services/checkout-selection'
import { CheckoutProgress } from '../../components/customer/CheckoutProgress'
import { VoucherImage } from '../../components/voucher/VoucherImage'

/** Trim a string and return `undefined` when the result is empty. */
function emptyToUndefined(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export function CheckoutPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const retryOrderId = searchParams.get('orderId')
  const queryClient = useQueryClient()

  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedIds] = useState(readCheckoutSelection)
  const [paymentMethod, setPaymentMethod] = useState('vnpay')

  const cartQuery = useQuery<CartResponse>({
    queryKey: ['cart'],
    queryFn: getCart,
    enabled: !retryOrderId
  })
  const retryOrderQuery = useQuery<OrderResponse>({
    queryKey: ['order', retryOrderId],
    queryFn: () => getOrder(retryOrderId as string),
    enabled: Boolean(retryOrderId)
  })
  const retryOrder = retryOrderQuery.data
  const retryUnavailable = Boolean(retryOrder && retryOrder.status !== 'PENDING_PAYMENT')

  useEffect(() => {
    if (retryOrder?.status === 'PAID') {
      navigate(`/orders/${retryOrder.id}`, { replace: true })
    }
  }, [navigate, retryOrder])
  const selectionForOrder = selectedIds.length > 0 ? selectedIds : (cartQuery.data?.items.map((item) => item.id) ?? [])

  const createOrderMutation = useMutation<OrderResponse, unknown, CreateOrderRequest>({
    mutationFn: createOrder,
    onSuccess: async (order) => {
      // The order now owns the reserved inventory and the cart was cleared
      // server-side — drop the cached cart so other views refetch.
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      clearCheckoutSelection()
      try {
        const gatewayUrl =
          paymentMethod === 'onepay'
            ? await getOnePayUrl(order.id)
            : paymentMethod === 'paypal'
              ? await getPayPalUrl(order.id)
              : paymentMethod === 'stripe'
                ? await getStripeUrl(order.id)
                : await getVNPayUrl(order.id)
        window.location.assign(gatewayUrl)
      } catch (err) {
        navigate(`/checkout?orderId=${encodeURIComponent(order.id)}`, { replace: true })
        setErrorMessage(getApiErrorMessage(err, 'Không thể mở cổng thanh toán. Vui lòng chọn phương thức và thử lại.'))
      }
    },
    onError: (err) => {
      setErrorMessage(getApiErrorMessage(err, 'Không thể đặt hàng. Vui lòng thử lại.'))
    }
  })

  const retryPaymentMutation = useMutation<string, unknown, string>({
    mutationFn: async (orderId) =>
      paymentMethod === 'onepay'
        ? getOnePayUrl(orderId)
        : paymentMethod === 'paypal'
          ? getPayPalUrl(orderId)
          : paymentMethod === 'stripe'
            ? getStripeUrl(orderId)
            : getVNPayUrl(orderId),
    onSuccess: (url) => window.location.assign(url),
    onError: (err) =>
      setErrorMessage(getApiErrorMessage(err, 'Không thể mở cổng thanh toán đã chọn. Vui lòng thử lại.'))
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)

    if (retryOrderId) {
      if (!retryOrder || retryOrder.status !== 'PENDING_PAYMENT') {
        setErrorMessage('Đơn hàng không còn ở trạng thái chờ thanh toán.')
        return
      }
      retryPaymentMutation.mutate(retryOrderId)
      return
    }

    const name = emptyToUndefined(recipientName)
    const phone = emptyToUndefined(recipientPhone)
    const email = emptyToUndefined(recipientEmail)

    // Match backend CreateOrderDto which expects giftRecipient: { name, phone }
    // If we only have flat fields locally, map them into the nested object
    const giftRecipient = name || email || phone ? { name, email, phone } : undefined

    const body: CreateOrderRequest = {
      giftRecipient,
      selectedCartItemIds: selectionForOrder.map(Number),
      paymentMethod: paymentMethod.toUpperCase()
    }

    createOrderMutation.mutate(body)
  }

  if (cartQuery.isLoading || retryOrderQuery.isLoading) {
    return (
      <section className='customer-checkout-page customer-page-state' style={sectionStyle}>
        <ContentSkeleton rows={3} variant='cards' label='Đang tải giỏ hàng' />
      </section>
    )
  }

  if (cartQuery.isError || retryOrderQuery.isError) {
    return (
      <section className='customer-checkout-page customer-page-state' style={sectionStyle}>
        <h1 style={pageHeadingStyle}>Thanh toán</h1>
        <div role='alert' style={alertStyle}>
          {getApiErrorMessage(
            cartQuery.error ?? retryOrderQuery.error,
            'Không thể tải thông tin thanh toán. Vui lòng thử lại.'
          )}
        </div>
      </section>
    )
  }

  const cart = cartQuery.data
  const selectedCart = retryOrder
    ? {
        items: retryOrder.items.map((item) => ({
          id: String(item.id),
          voucherId: item.voucherProductId,
          title: item.voucherProductName,
          imageUrl: null,
          unitPrice: Number(item.unitPrice),
          quantity: item.quantity,
          subtotal: Number(item.unitPrice) * item.quantity
        })),
        total: Number(retryOrder.totalAmount)
      }
    : cart
      ? {
          items: cart.items.filter((item) => selectionForOrder.includes(item.id)),
          total: cart.items
            .filter((item) => selectionForOrder.includes(item.id))
            .reduce((sum, item) => sum + item.subtotal, 0)
        }
      : undefined
  const isEmpty = !selectedCart || selectedCart.items.length === 0

  return (
    <section className='customer-checkout-page' style={sectionStyle}>
      <CheckoutProgress current='checkout' />

      {isEmpty ? (
        <div role='status' style={emptyStyle}>
          <p style={{ margin: 0 }}>Giỏ hàng của bạn đang trống.</p>
          <Link to='/search' style={linkStyle}>
            Khám phá voucher
          </Link>
        </div>
      ) : (
        <div className='customer-checkout-layout' style={layoutStyle}>
          {/* Order summary (Req 14.1) */}
          <aside className='checkout-summary-column'>
            <div className='customer-checkout-summary' aria-label='Tóm tắt đơn hàng' style={panelStyle}>
              <div className='checkout-summary-title'>
                <h2 style={panelHeadingStyle}>Tóm tắt đơn hàng</h2>
                <span>{selectedCart!.items.length} sản phẩm</span>
              </div>
              <div className='checkout-summary-products'>
                {selectedCart!.items.map((item, index) => (
                  <div className='checkout-summary-item' key={item.id}>
                    <span className='checkout-summary-image'>
                      <VoucherImage
                        src={item.imageUrl ?? `/assets/voucher-catalogue-sprite.png?cell=${index % 10}`}
                        alt={`Ảnh ${item.title}`}
                      />
                    </span>
                    <span className='checkout-summary-item__copy'>
                      <strong>{item.title}</strong>
                      <small>x {item.quantity}</small>
                    </span>
                    <span className='checkout-summary-item__price'>
                      <b>{formatMoney(item.subtotal)}</b>
                      <small>{formatMoney(item.unitPrice)} / voucher</small>
                    </span>
                  </div>
                ))}
              </div>
              <div className='checkout-summary-costs'>
                <p>
                  <span>Tạm tính</span>
                  <b>{formatMoney(selectedCart!.total)}</b>
                </p>
                <p>
                  <span>Giảm giá</span>
                  <b className='is-red'>− 0 ₫</b>
                </p>
                <p>
                  <span>Mã giảm giá</span>
                  <em>Chưa áp dụng</em>
                </p>
                <p>
                  <span>Phí xử lý</span>
                  <b className='is-green'>Miễn phí</b>
                </p>
              </div>
              <div className='checkout-summary-grand-total'>
                <span>
                  Tổng thanh toán<small>Đã bao gồm VAT (nếu có)</small>
                </span>
                <strong data-testid='cart-total'>{formatMoney(selectedCart!.total)}</strong>
              </div>
            </div>
            <div className='checkout-summary-assurance'>
              <h3>
                <ShieldCheck size={18} /> Vì sao chọn VoucherHub?
              </h3>
              <p>✓ Hàng ngàn ưu đãi mới mỗi ngày</p>
              <p>✓ Thanh toán nhanh chóng, an toàn</p>
              <p>✓ Hỗ trợ 24/7 – Sẵn sàng giúp bạn</p>
              <Button
                type='submit'
                form='checkout-order-form'
                aria-label='Thanh toán ngay'
                fullWidth
                disabled={retryUnavailable}
                isLoading={createOrderMutation.isPending || retryPaymentMutation.isPending}
              >
                Thanh toán ngay
              </Button>
              <small>
                Bằng việc nhấn “Thanh toán ngay”, bạn đồng ý với
                <br />
                <Link to='/policy'>Điều khoản sử dụng</Link> hoặc <Link to='/policy'>Chính sách bảo mật</Link>
              </small>
            </div>
          </aside>

          {/* Gift recipient + confirm (Req 14.2) */}
          <form
            id='checkout-order-form'
            className='customer-checkout-recipient'
            onSubmit={handleSubmit}
            style={panelStyle}
            noValidate
          >
            {!retryOrderId && (
              <>
                <h2 style={panelHeadingStyle}>Thông tin người mua</h2>
                <p style={{ marginTop: 0, color: colors.slate, fontSize: 13 }}>
                  Thông tin dùng để nhận đơn hàng và voucher. Có thể nhập người nhận khác nếu mua làm quà.
                </p>

                {errorMessage && (
                  <div role='alert' style={alertStyle}>
                    {errorMessage}
                  </div>
                )}

                <div className='checkout-buyer-grid'>
                  <div>
                    <Input
                      label='Tên người nhận'
                      name='recipientName'
                      type='text'
                      autoComplete='name'
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      disabled={createOrderMutation.isPending}
                    />
                  </div>
                  <div>
                    <Input
                      label='Email người nhận'
                      name='recipientEmail'
                      type='email'
                      autoComplete='email'
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      disabled={createOrderMutation.isPending}
                    />
                  </div>
                  <div>
                    <Input
                      label='Số điện thoại người nhận'
                      name='recipientPhone'
                      type='tel'
                      autoComplete='tel'
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      disabled={createOrderMutation.isPending}
                    />
                  </div>
                </div>
              </>
            )}

            {retryOrderId && (
              <div className='checkout-retry-notice'>
                <h2 style={panelHeadingStyle}>Chọn phương thức thanh toán</h2>
                <p>
                  {retryOrder?.status === 'PENDING_PAYMENT'
                    ? `Đơn #${retryOrderId.slice(0, 8)} đang chờ thanh toán. Chọn một trong bốn phương thức bên dưới để tiếp tục.`
                    : `Đơn #${retryOrderId.slice(0, 8)} không còn ở trạng thái chờ thanh toán.`}
                </p>
                {errorMessage && (
                  <div role='alert' style={alertStyle}>
                    {errorMessage}
                  </div>
                )}
              </div>
            )}

            <section className='checkout-payment-methods' aria-labelledby='checkout-payment-title'>
              <div className='checkout-payment-heading'>
                <CreditCard size={19} aria-hidden='true' />
                <span>
                  <strong id='checkout-payment-title'>Phương thức thanh toán</strong>
                  <small>Chọn phương thức phù hợp với bạn</small>
                </span>
              </div>
              {[
                {
                  id: 'vnpay',
                  label: 'VNPay',
                  copy: 'Thanh toán nhanh qua ngân hàng và ví điện tử',
                  icon: Smartphone,
                  badge: 'Đề xuất'
                },
                { id: 'onepay', label: 'OnePay', copy: 'Thanh toán nội địa an toàn qua cổng OnePay', icon: Building2 },
                { id: 'paypal', label: 'PayPal', copy: 'Thanh toán quốc tế bằng tài khoản PayPal', icon: WalletCards },
                {
                  id: 'stripe',
                  label: 'Thẻ thanh toán quốc tế (Stripe)',
                  copy: 'Visa, Mastercard và các loại thẻ quốc tế',
                  icon: CreditCard
                }
              ].map(({ id, label, copy, icon: Icon, badge }) => (
                <label key={id} className={`checkout-payment-option${paymentMethod === id ? ' is-selected' : ''}`}>
                  <input
                    type='radio'
                    name='paymentMethod'
                    value={id}
                    checked={paymentMethod === id}
                    disabled={retryUnavailable}
                    onChange={() => setPaymentMethod(id)}
                  />
                  <span className='checkout-payment-icon'>
                    <Icon size={21} aria-hidden='true' />
                  </span>
                  <span className='checkout-payment-copy'>
                    <strong>{label}</strong>
                    <small>{copy}</small>
                  </span>
                  {badge && <em>{badge}</em>}
                  <span className='checkout-payment-safe'>✓ An toàn, tiện lợi</span>
                </label>
              ))}
            </section>

            <Link
              to={retryOrderId ? `/orders/${retryOrderId}` : '/cart'}
              style={{ display: 'inline-block', marginTop: 12, fontSize: 14, ...linkStyle }}
            >
              {retryOrderId ? 'Quay lại đơn hàng' : 'Quay lại giỏ hàng'}
            </Link>
          </form>
        </div>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const sectionStyle: CSSProperties = {
  maxWidth: 900,
  margin: '0 auto',
  padding: '8px 4px'
}

const pageHeadingStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 4,
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

const layoutStyle: CSSProperties = {
  display: 'grid',
  gap: 24,
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  alignItems: 'start'
}

const panelStyle: CSSProperties = {
  border: `1px solid ${colors.hairline}`,
  borderRadius: radius.xl,
  padding: 24,
  background: colors.surface,
  boxShadow: shadows.card
}

const panelHeadingStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 12,
  fontFamily: fonts.display,
  fontSize: 20,
  fontWeight: 700,
  letterSpacing: '-0.01em',
  color: colors.ink
}

const alertStyle: CSSProperties = {
  marginBottom: 16,
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
  gap: 8,
  alignItems: 'flex-start',
  padding: 24,
  border: `1px solid ${colors.hairline}`,
  borderRadius: radius.xl,
  background: colors.surface,
  boxShadow: shadows.card,
  color: colors.ink
}

export default CheckoutPage
