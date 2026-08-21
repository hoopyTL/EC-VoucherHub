import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { VNPayMessageMap } from '../../constants/vnpay'
import { ConfirmDialog, LoadingSpinner, useToast } from '../../components/ui'

/**
 * Trang nhận kết quả chuyển hướng về từ VNPay (Return URL).
 * Chịu trách nhiệm đồng bộ trạng thái thanh toán và điều hướng người dùng.
 */
export function PaymentResultPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  // Ngăn chặn strict-mode của React 18 gọi useEffect 2 lần liên tiếp
  const hasProcessed = useRef(false)
  const [cancelledOrderId, setCancelledOrderId] = useState<string | null>(null)
  const [reopening, setReopening] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (hasProcessed.current) return
    hasProcessed.current = true

    const handleVNPayReturn = async () => {
      const responseCode = searchParams.get('vnp_ResponseCode')
      const rawTxnRef = searchParams.get('vnp_TxnRef')
      const stripeSuccess = searchParams.get('stripe_success')
      const stripeOrderId = searchParams.get('order_id')
      const vnpOrderId = rawTxnRef ? rawTxnRef.split('_')[0] : null

      // VNPay code 24 means the customer pressed Cancel at the gateway. Keep
      // the order pending unless they explicitly confirm leaving payment.
      if (responseCode === '24' && vnpOrderId) {
        setCancelledOrderId(vnpOrderId)
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
      let orderId = null
      let isSuccess = false

      if (stripeOrderId) {
        // Luồng của Stripe
        orderId = stripeOrderId
        isSuccess = stripeSuccess === 'true'

        if (isSuccess) {
          navigate(`/orders/${orderId}`, { replace: true })
        } else {
          toast.error('Giao dịch Stripe đã bị hủy hoặc chưa hoàn tất.')
          navigate(`/orders/${orderId}`, { replace: true })
        }
      } else {
        // Luồng của VNPay
        // Lọc bỏ timestamp `_1739xxx` để lấy lại ID đơn hàng thật gốc (mẹo chống trùng lặp)
        orderId = vnpOrderId
        if (!orderId) {
          return navigate('/cart?tab=orders', { replace: true })
        }

        isSuccess = responseCode === '00'

        if (isSuccess) {
          // Hoàn tất mỹ mãn -> Nhảy lọt vào chi tiết đơn hàng (có mã Voucher)
          navigate(`/orders/${orderId}`, { replace: true })
        } else {
          // Giao dịch thất bại (Hết tiền, Hủy, Sai OTP...) -> Báo lỗi & Quay về
          const errorCode = responseCode || 'DEFAULT'
          const errorMessage = VNPayMessageMap[errorCode] || VNPayMessageMap['DEFAULT'].replace('{code}', errorCode)

          toast.error(errorMessage)
          navigate(`/orders/${orderId}`, { replace: true })
        }
      }
    }

    handleVNPayReturn()
  }, [searchParams, navigate, toast])

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <LoadingSpinner label='Đang đồng bộ kết quả thanh toán từ Ngân hàng...' />
      <ConfirmDialog
        open={Boolean(cancelledOrderId)} title='Bạn muốn dừng thanh toán?'
        message='Đơn hàng vẫn được giữ ở trạng thái chờ thanh toán để bạn có thể tiếp tục sau.'
        cancelLabel='Tiếp tục VNPay' confirmLabel='Về đơn hàng' busy={reopening}
        onConfirm={() => { if (cancelledOrderId) navigate(`/orders/${cancelledOrderId}`, { replace: true }) }}
        onCancel={async () => {
          if (!cancelledOrderId) return
          setReopening(true)
          try {
            const { getVNPayUrl } = await import('../../services/orders')
            window.location.href = await getVNPayUrl(cancelledOrderId)
          } catch {
            navigate(`/orders/${cancelledOrderId}`, { replace: true })
          }
        }}
      />
    </div>
  )
}

export default PaymentResultPage
