import { useEffect, useRef, useState } from 'react'
// Exported for tests: allow stubbing scheduled polls without mocking global timers
export function scheduleTimeout(fn: () => void, ms: number) {
  return window.setTimeout(fn, ms)
}
// Small injectable clock seam for tests; production still uses window.setTimeout.
export const paymentResultClock = { scheduleTimeout }
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { VNPayMessageMap } from '../../constants/vnpay'
import { LoadingSpinner } from '../../components/ui'
import { getOrder, formatMoney } from '../../services/orders'

/** Restore the UUID/order id encoded in OnePay's merchant transaction ref. */
function restoreOrderIdFromOnePayTxnRef(txnRef: string): string {
  const rawOrderId = txnRef.split('_')[0] ?? ''
  const compact = rawOrderId.replace(/[^a-zA-Z0-9]/g, '')
  if (compact.length === 32) {
    return `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`
  }
  return rawOrderId
}

/**
 * Trang nhận kết quả chuyển hướng về từ VNPay (Return URL).
 * Chịu trách nhiệm đồng bộ trạng thái thanh toán và điều hướng người dùng.
 */
export function PaymentResultPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [state, setState] = useState<'processing' | 'success' | 'failed' | 'pending'>('processing')
  const [orderData, setOrderData] = useState<any | null>(null)
  const [stripeOrderId, setStripeOrderId] = useState<string | null>(null)
  const attemptsRef = useRef(0)
  const stoppedRef = useRef(false)
  const timerRef = useRef<number | null>(null)
  const POLL_INTERVAL = process.env.NODE_ENV === 'test' ? 10 : 1000
  const ATTEMPTS_LIMIT = process.env.NODE_ENV === 'test' ? 3 : 10
  // Ngăn chặn strict-mode của React 18 gọi useEffect 2 lần liên tiếp
  const hasProcessed = useRef(false)

  useEffect(() => {
    if (hasProcessed.current) return
    hasProcessed.current = true

    const handleVNPayReturn = async () => {
      const paypalOrderId = searchParams.get('token')
      const paypalLocalOrderId = searchParams.get('order_id')
      const paypalSuccess = searchParams.get('paypal_success')

      if (paypalLocalOrderId && paypalSuccess !== null) {
        if (paypalSuccess === 'true' && paypalOrderId) {
          try {
            const { capturePayPalPayment } = await import('../../services/orders')
            await capturePayPalPayment(paypalLocalOrderId, paypalOrderId)
          } catch (error) {
            console.error('Không thể xác nhận giao dịch PayPal:', error)
            alert('Không thể xác nhận giao dịch PayPal. Vui lòng kiểm tra lại đơn hàng.')
          }
        } else {
          alert('Bạn đã hủy hoặc chưa hoàn tất thanh toán PayPal.')
        }
        navigate(`/orders/${paypalLocalOrderId}`, { replace: true })
        return
      }

      // STRIPE RETURN FLOW
      const stripeOrderId = searchParams.get('order_id')
      const stripeSuccess = searchParams.get('stripe_success')
      searchParams.get('session_id')

      if (stripeOrderId) {
        // If stripe_success not provided or false, render failed page (no auto-redirect)
        if (!stripeSuccess || stripeSuccess !== 'true') {
          setState('failed')
          return
        }
        // Set up polling state and start polling
        setStripeOrderId(stripeOrderId)
        attemptsRef.current = 0
        stoppedRef.current = false
        setState('processing')

        const poll = async () => {
          try {
            const order = await getOrder(stripeOrderId)
            setOrderData(order)
            if (order.status === 'PAID') {
              setState('success')
              return
            }
            if (order.status === 'PENDING_PAYMENT') {
              attemptsRef.current += 1
              if (attemptsRef.current >= ATTEMPTS_LIMIT) {
                setState('pending')
                return
              }
              if (!stoppedRef.current) {
                timerRef.current = paymentResultClock.scheduleTimeout(poll, POLL_INTERVAL)
              }
              return
            }
            setState('failed')
          } catch (err) {
            console.error('Error fetching order status', err)
            setState('failed')
          }
        }

        poll()

        return () => {
          stoppedRef.current = true
          if (timerRef.current) window.clearTimeout(timerRef.current)
        }
      }

      const onepayResponseCode = searchParams.get('vpc_TxnResponseCode')
      const onepayMerchTxnRef = searchParams.get('vpc_MerchTxnRef')

      if (onepayResponseCode !== null && onepayMerchTxnRef) {
        // Preserve the raw query string and call backend verification endpoint
        try {
          const { api } = await import('../../services/api')
          await api.get(`/orders/onepay-ipn${window.location.search}`)
          // The IPN endpoint returns OnePay's acknowledgement string, not an
          // order payload. Recover the exact id from the signed merchant ref.
          const resolvedOrderId = restoreOrderIdFromOnePayTxnRef(onepayMerchTxnRef)

          if (onepayResponseCode === '0') {
            // Successful OnePay response code: do NOT navigate away immediately.
            // Start the same polling flow as Stripe using the resolved orderId.
            if (resolvedOrderId) {
              setStripeOrderId(resolvedOrderId)
              attemptsRef.current = 0
              stoppedRef.current = false
              setState('processing')

              const pollOnepay = async () => {
                try {
                  const order = await getOrder(resolvedOrderId)
                  setOrderData(order)
                  if (order.status === 'PAID') {
                    setState('success')
                    return
                  }
                  if (order.status === 'PENDING_PAYMENT') {
                    attemptsRef.current += 1
                    if (attemptsRef.current >= ATTEMPTS_LIMIT) {
                      setState('pending')
                      return
                    }
                    if (!stoppedRef.current) {
                      timerRef.current = paymentResultClock.scheduleTimeout(pollOnepay, POLL_INTERVAL)
                    }
                    return
                  }
                  setState('failed')
                } catch (err) {
                  console.error('Error fetching order status for OnePay', err)
                  setState('failed')
                }
              }

              pollOnepay()
              return
            }

            // If backend didn't resolve an orderId, show pending to let backend sync finish
            setState('pending')
            return
          }

          // Non-successful OnePay response
          setState('failed')
        } catch (error) {
          console.error('Không thể đồng bộ OnePay IPN:', error)
          setState('failed')
        }

        return
      }

      // ----------------------------------------------------------------------
      // BƯỚC 1: ĐỒNG BỘ IPN CỤC BỘ (Fallback cho Localhost)
      // Do VNPay ngoài Internet không thể chọc API vào localhost, Frontend sẽ
      // chộp lấy URL raw và chuyển tiếp xuống Backend để Cập nhật Database.
      // Lưu ý: Tuyệt đối dùng window.location.search (chuỗi gốc) để bảo toàn chữ ký.
      // ----------------------------------------------------------------------
      try {
        await fetch('/api/orders/vnpay-ipn' + window.location.search)
      } catch (error) {
        console.error('Không thể đồng bộ IPN xuống Backend:', error)
      }

      // ----------------------------------------------------------------------
      // BƯỚC 2: BÓC TÁCH DỮ LIỆU
      // ----------------------------------------------------------------------
      const responseCode = searchParams.get('vnp_ResponseCode')
      const rawTxnRef = searchParams.get('vnp_TxnRef')

      // Lọc bỏ timestamp `_1739xxx` để lấy lại ID đơn hàng thật gốc (mẹo chống trùng lặp)
      const orderId = rawTxnRef ? rawTxnRef.split('_')[0] : null

      // ----------------------------------------------------------------------
      // BƯỚC 3: ĐIỀU HƯỚNG MÀN HÌNH (Giao diện)
      // ----------------------------------------------------------------------
      if (!orderId) {
        return navigate('/orders', { replace: true })
      }

      const isSuccess = responseCode === '00'

      if (isSuccess) {
        // Hoàn tất mỹ mãn -> Nhảy lọt vào chi tiết đơn hàng (có mã Voucher)
        navigate(`/orders/${orderId}`, { replace: true })
      } else {
        // Giao dịch thất bại (Hết tiền, Hủy, Sai OTP...) -> Báo lỗi & Quay về
        const errorCode = responseCode || 'DEFAULT'
        const errorMessage = VNPayMessageMap[errorCode] || VNPayMessageMap['DEFAULT'].replace('{code}', errorCode)

        alert(errorMessage)
        navigate(`/orders/${orderId}`, { replace: true })
      }
    }

    handleVNPayReturn()
  }, [searchParams, navigate])

  const retryCheck = () => {
    if (!stripeOrderId) return
    // reset attempts and restart polling
    attemptsRef.current = 0
    stoppedRef.current = false
    setState('processing')
    // trigger poll by calling getOrder once; polling loop will continue
    getOrder(stripeOrderId)
      .then((order) => {
        setOrderData(order)
        if (order.status === 'PAID') setState('success')
        else if (order.status === 'PENDING_PAYMENT') setState('pending')
        else setState('failed')
      })
      .catch(() => setState('failed'))
  }

  if (state === 'processing') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <LoadingSpinner label='Đang xác nhận kết quả thanh toán...' />
      </div>
    )
  }

  if (state === 'success') {
    return (
      <div style={{ maxWidth: 720, margin: '2rem auto', padding: '1.5rem' }}>
        <h1>Thanh toán thành công</h1>
        <p>Thanh toán của bạn đã được xác nhận.</p>
        <p>
          <strong>Đơn hàng:</strong> {orderData?.id}
        </p>
        {orderData?.totalAmount ? (
          <p>
            <strong>Tổng:</strong> {formatMoney(orderData.totalAmount)}
          </p>
        ) : null}
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <Link to={`/orders/${orderData?.id}`} className='btn btn-primary'>
            Xem chi tiết đơn hàng
          </Link>
          <Link to='/my-vouchers' className='btn'>
            Voucher của tôi
          </Link>
        </div>
      </div>
    )
  }

  if (state === 'failed') {
    return (
      <div style={{ maxWidth: 720, margin: '2rem auto', padding: '1.5rem' }}>
        <h1>Thanh toán chưa hoàn tất</h1>
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
    )
  }

  // pending
  return (
    <div style={{ maxWidth: 720, margin: '2rem auto', padding: '1.5rem' }}>
      <h1>Thanh toán đang được xác nhận</h1>
      <p>Thanh toán của bạn đang được nhà cung cấp thanh toán xác nhận. Việc xác nhận có thể mất vài giây.</p>
      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <button className='btn' onClick={retryCheck}>
          Kiểm tra lại
        </button>
        <button
          className='btn btn-primary'
          onClick={() => navigate(orderData?.id ? `/orders/${orderData.id}` : '/orders')}
        >
          Xem đơn hàng
        </button>
      </div>
    </div>
  )
}

export default PaymentResultPage
