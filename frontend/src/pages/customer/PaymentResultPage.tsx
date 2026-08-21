import { useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { VNPayMessageMap } from '../../constants/vnpay'
import { LoadingSpinner } from '../../components/ui'

/**
 * Trang nhận kết quả chuyển hướng về từ VNPay (Return URL).
 * Chịu trách nhiệm đồng bộ trạng thái thanh toán và điều hướng người dùng.
 */
export function PaymentResultPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  // Ngăn chặn strict-mode của React 18 gọi useEffect 2 lần liên tiếp
  const hasProcessed = useRef(false)

  useEffect(() => {
    if (hasProcessed.current) return
    hasProcessed.current = true

    const handleVNPayReturn = async () => {
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

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <LoadingSpinner label='Đang đồng bộ kết quả thanh toán từ Ngân hàng...' />
    </div>
  )
}

export default PaymentResultPage
