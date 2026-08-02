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
import { useState, type CSSProperties, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreateOrderRequest } from '@ui-contracts'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { colors, fonts, radius, shadows } from '../../theme/tokens'
import {
  createOrder,
  formatMoney,
  getApiErrorMessage,
  getCart,
  type CartResponse,
  type OrderResponse
} from '../../services/orders'

/** Trim a string and return `undefined` when the result is empty. */
function emptyToUndefined(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export function CheckoutPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const cartQuery = useQuery<CartResponse>({
    queryKey: ['cart'],
    queryFn: getCart
  })

  const createOrderMutation = useMutation<OrderResponse, unknown, CreateOrderRequest>({
    mutationFn: createOrder,
    onSuccess: (order) => {
      // The order now owns the reserved inventory and the cart was cleared
      // server-side — drop the cached cart so other views refetch.
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      navigate(`/orders/${order.id}`)
    },
    onError: (err) => {
      setErrorMessage(getApiErrorMessage(err, 'Không thể đặt hàng. Vui lòng thử lại.'))
    }
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)

    const body: CreateOrderRequest = {
      recipientName: emptyToUndefined(recipientName),
      recipientEmail: emptyToUndefined(recipientEmail),
      recipientPhone: emptyToUndefined(recipientPhone)
    }

    createOrderMutation.mutate(body)
  }

  if (cartQuery.isLoading) {
    return (
      <section style={sectionStyle}>
        <LoadingSpinner label='Đang tải giỏ hàng' />
      </section>
    )
  }

  if (cartQuery.isError) {
    return (
      <section style={sectionStyle}>
        <h1 style={pageHeadingStyle}>Thanh toán</h1>
        <div role='alert' style={alertStyle}>
          {getApiErrorMessage(cartQuery.error, 'Không thể tải giỏ hàng. Vui lòng thử lại.')}
        </div>
      </section>
    )
  }

  const cart = cartQuery.data
  const isEmpty = !cart || cart.items.length === 0

  return (
    <section style={sectionStyle}>
      <h1 style={pageHeadingStyle}>Thanh toán</h1>
      <p style={{ marginTop: 0, marginBottom: 24, color: colors.slate, fontSize: 16 }}>
        Kiểm tra đơn hàng và thêm thông tin người nhận quà nếu cần trước khi thanh toán.
      </p>

      {isEmpty ? (
        <div role='status' style={emptyStyle}>
          <p style={{ margin: 0 }}>Giỏ hàng của bạn đang trống.</p>
          <Link to='/search' style={linkStyle}>
            Khám phá voucher
          </Link>
        </div>
      ) : (
        <div style={layoutStyle}>
          {/* Order summary (Req 14.1) */}
          <div aria-label='Tóm tắt đơn hàng' style={panelStyle}>
            <h2 style={panelHeadingStyle}>Tóm tắt đơn hàng</h2>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Voucher</th>
                  <th style={thNumStyle}>Đơn giá</th>
                  <th style={thNumStyle}>SL</th>
                  <th style={thNumStyle}>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {cart.items.map((item) => (
                  <tr key={item.id}>
                    <td style={tdStyle}>{item.title}</td>
                    <td style={tdNumStyle}>{formatMoney(item.unitPrice)}</td>
                    <td style={tdNumStyle}>{item.quantity}</td>
                    <td style={tdNumStyle}>{formatMoney(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td style={{ ...tdStyle, fontWeight: 600 }} colSpan={3}>
                    Tổng cộng
                  </td>
                  <td style={{ ...tdNumStyle, fontWeight: 700 }} data-testid='cart-total'>
                    {formatMoney(cart.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Gift recipient + confirm (Req 14.2) */}
          <form onSubmit={handleSubmit} style={panelStyle} noValidate>
            <h2 style={panelHeadingStyle}>Người nhận quà (không bắt buộc)</h2>
            <p style={{ marginTop: 0, color: colors.slate, fontSize: 13 }}>
              Nếu mua làm quà, hãy nhập thông tin người nhận. Để trống nếu mua cho chính bạn.
            </p>

            {errorMessage && (
              <div role='alert' style={alertStyle}>
                {errorMessage}
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
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
            <div style={{ marginBottom: 14 }}>
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
            <div style={{ marginBottom: 20 }}>
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

            <Button type='submit' fullWidth isLoading={createOrderMutation.isPending}>
              Đặt hàng
            </Button>
            <Link to='/cart' style={{ display: 'inline-block', marginTop: 12, fontSize: 14, ...linkStyle }}>
              Quay lại giỏ hàng
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

const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 14
}

const thStyle: CSSProperties = {
  textAlign: 'left',
  padding: '6px 8px',
  borderBottom: `1px solid ${colors.hairline}`,
  color: colors.slate,
  fontWeight: 600
}

const thNumStyle: CSSProperties = { ...thStyle, textAlign: 'right' }

const tdStyle: CSSProperties = {
  textAlign: 'left',
  padding: '8px',
  borderBottom: `1px solid ${colors.hairline}`,
  color: colors.ink
}

const tdNumStyle: CSSProperties = { ...tdStyle, textAlign: 'right' }

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
