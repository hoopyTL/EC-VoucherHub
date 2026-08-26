import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckoutProgress } from '../../components/customer/CheckoutProgress'
import { LoadingSpinner } from '../../components/ui'
import { api } from '../../services/api'
import { getOrder, type OrderResponse } from '../../services/orders'

// Exported solely as a small testability seam around window.setTimeout.
export function scheduleTimeout(fn: () => void, ms: number) {
  return window.setTimeout(fn, ms)
}
export const paymentResultClock = { scheduleTimeout }

function restoreOrderIdFromOnePayTxnRef(txnRef: string): string {
  const rawOrderId = txnRef.split('_')[0] ?? ''
  const compact = rawOrderId.replace(/[^a-zA-Z0-9]/g, '')
  return compact.length === 32
    ? `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`
    : rawOrderId
}

/** Secure gateway callback endpoint. It never marks an order paid on the client. */
export function PaymentResultPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [state, setState] = useState<'processing' | 'failed'>('processing')
  const [orderData, setOrderData] = useState<OrderResponse | null>(null)
  const stoppedRef = useRef(false)
  const timerRef = useRef<number | null>(null)
  const hasProcessed = useRef(false)
  const pollInterval = process.env.NODE_ENV === 'test' ? 10 : 1000
  const attemptsLimit = process.env.NODE_ENV === 'test' ? 3 : 10

  useEffect(() => {
    if (hasProcessed.current) return
    hasProcessed.current = true

    const confirmPaidOrder = async (orderId: string) => {
      for (let attempt = 0; attempt < attemptsLimit && !stoppedRef.current; attempt += 1) {
        try {
          const order = await getOrder(orderId)
          setOrderData(order)
          if (order.status === 'PAID') {
            navigate(`/orders/${orderId}`, { replace: true })
            return
          }
          if (order.status !== 'PENDING_PAYMENT') {
            setState('failed')
            return
          }
        } catch {
          setState('failed')
          return
        }

        if (attempt < attemptsLimit - 1 && !stoppedRef.current) {
          await new Promise<void>((resolve) => {
            timerRef.current = paymentResultClock.scheduleTimeout(resolve, pollInterval)
          })
        }
      }
      // A successful provider return still needs a confirmed backend order.
      setState('failed')
    }

    const handleCallback = async () => {
      const paypalOrderId = searchParams.get('token')
      const paypalLocalOrderId = searchParams.get('order_id')
      const paypalSuccess = searchParams.get('paypal_success')
      if (paypalLocalOrderId && paypalSuccess !== null) {
        if (paypalSuccess === 'true' && paypalOrderId) {
          try {
            const { capturePayPalPayment } = await import('../../services/orders')
            await capturePayPalPayment(paypalLocalOrderId, paypalOrderId)
          } catch {
            setState('failed')
            return
          }
        } else {
          setState('failed')
          return
        }
        await confirmPaidOrder(paypalLocalOrderId)
        return
      }

      const stripeOrderId = searchParams.get('order_id')
      const stripeSuccess = searchParams.get('stripe_success')
      const stripeSessionId = searchParams.get('session_id')
      if (stripeOrderId && stripeSuccess !== null) {
        // Both return values are required, but query parameters never decide PAID.
        if (stripeSuccess !== 'true' || !stripeSessionId) {
          setState('failed')
          return
        }
        await confirmPaidOrder(stripeOrderId)
        return
      }

      const onepayResponseCode = searchParams.get('vpc_TxnResponseCode')
      const onepayMerchTxnRef = searchParams.get('vpc_MerchTxnRef')
      if (onepayResponseCode !== null && onepayMerchTxnRef) {
        try {
          await api.get(`/orders/onepay-ipn${window.location.search}`)
          if (onepayResponseCode !== '0') {
            setState('failed')
            return
          }
          await confirmPaidOrder(restoreOrderIdFromOnePayTxnRef(onepayMerchTxnRef))
        } catch {
          setState('failed')
        }
        return
      }

      const responseCode = searchParams.get('vnp_ResponseCode')
      const transactionStatus = searchParams.get('vnp_TransactionStatus')
      const rawTxnRef = searchParams.get('vnp_TxnRef')
      const orderId = rawTxnRef?.split('_')[0]
      if (!orderId) {
        setState('failed')
        return
      }
      if (responseCode !== '00' || transactionStatus !== '00') {
        setState('failed')
        return
      }

      try {
        // Uses the configured backend API base, never the Vercel/frontend host.
        const { data } = await api.get<{ RspCode?: string }>(`/orders/vnpay-ipn${window.location.search}`)
        if (data?.RspCode !== '00') {
          setState('failed')
          return
        }
        await confirmPaidOrder(orderId)
      } catch {
        setState('failed')
      }
    }

    void handleCallback()
    return () => {
      stoppedRef.current = true
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [navigate, searchParams, attemptsLimit, pollInterval])

  if (state === 'processing')
    return (
      <div style={shellStyle}>
        <CheckoutProgress current='checkout' />
        <div style={cardStyle}>
          <LoadingSpinner label='Thanh toán đang được xác nhận' />
          <p style={textStyle}>
            Đang xác minh giao dịch với cổng thanh toán. Bạn không cần thực hiện thêm thao tác nào.
          </p>
        </div>
      </div>
    )

  return (
    <div style={shellStyle}>
      <CheckoutProgress current='checkout' />
      <div style={cardStyle}>
        <h1>Thanh toán chưa hoàn tất</h1>
        <p style={textStyle}>Giao dịch chưa được xác nhận. Bạn có thể quay lại đơn hàng để thử lại.</p>
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button className='btn' onClick={() => navigate(orderData?.id ? `/orders/${orderData.id}` : '/orders')}>
            Quay lại đơn hàng
          </button>
          <button
            className='btn btn-primary'
            onClick={() => navigate(orderData?.id ? `/orders/${orderData.id}` : '/orders')}
          >
            Thanh toán lại
          </button>
        </div>
      </div>
    </div>
  )
}

const shellStyle = { maxWidth: 980, margin: '2rem auto', padding: '0 24px' }
const cardStyle = {
  padding: '32px',
  border: '1px solid var(--border, #e5dfd1)',
  borderRadius: '20px',
  background: 'var(--surface, #fff)'
}
const textStyle = { color: 'var(--text-muted, #6b7280)', lineHeight: 1.6 }

export default PaymentResultPage
