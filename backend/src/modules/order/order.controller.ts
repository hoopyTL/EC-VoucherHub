import { Request, Response } from 'express'
import { asyncHandler } from '../../middleware/async-handler'
import { successResponse, createdResponse } from '../../utils/response'
import { OrderStatus } from '@voucher/shared'
import * as orderService from './order.service'
import prisma from '../../configs/prisma'
import stripe from '../../utils/stripe'
import { AppError as ApiError } from '../../utils/app-error'

/**
 * POST /api/orders — Tạo đơn từ giỏ hàng
 */
export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.createOrder(req.user!.sub, req.body)
  createdResponse(res, order)
})

/**
 * GET /api/orders — Lịch sử đơn của khách
 */
export const getMyOrders = asyncHandler(async (req: Request, res: Response) => {
  const cursor = req.query.cursor as string | undefined
  const limit = req.query.limit ? Number(req.query.limit) : undefined
  const result = await orderService.getMyOrders(req.user!.sub, cursor, limit)
  successResponse(res, result)
})

/**
 * GET /api/orders/:id — Chi tiết đơn hàng
 */
export const getOrderDetail = asyncHandler(async (req: Request, res: Response) => {
  const orderId = String(req.params.id)
  const order = await orderService.getOrderDetail(req.user!.sub, orderId)
  successResponse(res, order)
})

/**
 * POST /api/orders/:id/payment — Thanh toán mô phỏng cho đơn hàng
 */
export const processPayment = asyncHandler(async (req: Request, res: Response) => {
  const result = await orderService.processPayment(req.user!.sub, req.params.id as string, req.body)
  successResponse(res, result)
})
import { createVNPayUrl, verifyVNPayReturn } from '../../utils/vnpay'

/**
 * GET /api/orders/:id/vnpay — Khởi tạo URL Thanh toán VNPay
 */
export const createVNPayPayment = asyncHandler(async (req: Request, res: Response) => {
  if (!process.env.VNP_TMNCODE || !process.env.VNP_HASHSECRET) {
    throw ApiError.badRequest(
      'VNPay chưa được cấu hình. Hãy thêm VNP_TMNCODE và VNP_HASHSECRET sandbox vào backend/.env.'
    )
  }
  const orderId = String(req.params.id)
  const order = await orderService.getOrderDetail(req.user!.sub, orderId)
  const amount = typeof order.totalAmount === 'number' ? order.totalAmount : Number(order.totalAmount)

  // Trích xuất địa chỉ IP của Client để điền vào request VNPay
  const ipAddr = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1'

  // [QUAN TRỌNG] Trộn timestamp vào orderId để mã gửi sang VNPay luôn DUY NHẤT.
  // Nhờ thủ thuật này, nếu khách bấm thanh toán nhiều lần trên cùng 1 đơn,
  // VNPay sẽ không báo lỗi "Giao dịch đang xử lý".
  const uniqueTxnRef = `${orderId}_${Date.now()}`

  // Sinh URL chuyển hướng
  const url = createVNPayUrl(String(ipAddr), uniqueTxnRef, amount, 'Thanh toan don hang ' + orderId)
  successResponse(res, { url })
})

/**
 * GET /api/orders/:id/stripe — Khởi tạo URL Thanh toán Stripe (Quốc tế)
 */
export const createStripePayment = asyncHandler(async (req: Request, res: Response) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY ?? ''
  const isStripeSandboxKey = /^(sk|rk|rkcs)_test_/.test(stripeKey)
  if (!isStripeSandboxKey) {
    throw ApiError.badRequest(
      'Stripe chưa được cấu hình. Hãy thêm STRIPE_SECRET_KEY sandbox vào backend/.env.'
    )
  }
  if (stripeKey.startsWith('rkcs_test_')) {
    throw ApiError.badRequest(
      'Khóa Stripe hiện là claimable sandbox key chưa được kích hoạt. Hãy claim sandbox trên Stripe hoặc dùng STRIPE_SECRET_KEY bắt đầu bằng sk_test_.'
    )
  }
  try {
    const result = await orderService.createStripeCheckoutSession(req.user!.sub, req.params.id as string)
    successResponse(res, result)
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (/connection to stripe|econn|eacces|network/i.test(message)) {
      throw ApiError.badRequest('Không thể kết nối tới Stripe lúc này. Vui lòng kiểm tra Internet hoặc tường lửa rồi thử lại.')
    }
    if (/permission|access|api key|claim/i.test(message)) {
      throw ApiError.badRequest('Stripe từ chối quyền tạo phiên thanh toán. Hãy kiểm tra quyền của khóa sandbox hoặc dùng khóa sk_test_.')
    }
    throw error
  }
})

/**
 * GET /api/orders/vnpay-ipn — Điểm nhận Webhook (IPN) từ VNPay gửi về
 * Chú ý: Route này mở Public, không cần Bearer token.
 */
export const vnpayIpn = asyncHandler(async (req: Request, res: Response) => {
  const vnp_Params = req.query
  const isValid = verifyVNPayReturn(vnp_Params)

  // Lấy TxnRef thật sự (đã loại bỏ phần _timestamp ở đuôi)
  const rawTxnRef = (vnp_Params['vnp_TxnRef'] as string) || ''
  const orderId = rawTxnRef.split('_')[0]
  const responseCode = vnp_Params['vnp_ResponseCode'] as string

  console.log(`[VNPay IPN] Order: ${orderId} | Status: ${responseCode} | SignatureValid: ${isValid}`)

  // 1. Kiểm tra chữ ký bảo mật (Checksum)
  // Nếu sai, dữ liệu URL đã bị giả mạo hoặc encode sai định dạng.
  if (!isValid) {
    console.warn(`[VNPay IPN] CẢNH BÁO: Checksum thất bại! Đơn hàng: ${orderId}.`)
    return res.status(200).json({ RspCode: '97', Message: 'Invalid signature' })
  }

  try {
    // 2. Tìm đơn hàng tương ứng trong cơ sở dữ liệu
    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order) {
      return res.status(200).json({ RspCode: '01', Message: 'Không tìm thấy đơn hàng' })
    }

    // 3. Kiểm tra tiến độ ghi nhận (Chỉ xử lý đơn chưa được thanh toán)
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      return res.status(200).json({ RspCode: '02', Message: 'Đơn hàng đã được xác nhận' })
    }

    // 4. Quyết định cập nhật dựa trên mã VNPay trả về (00 là Thành công tuyệt đối)
    if (responseCode === '00') {
      await orderService.processPayment(order.customerId, orderId, { outcome: 'SUCCESS' })
    } else {
      await orderService.processPayment(order.customerId, orderId, { outcome: 'FAILURE' })
    }

    // 5. Trả mã chuẩn '00' để báo cho Server VNPay biết là Webhook đã xử lý xong
    return res.status(200).json({ RspCode: '00', Message: 'Xác nhận thành công' })
  } catch (err) {
    console.error('[VNPay IPN] LỖI HỆ THỐNG TRONG QUÁ TRÌNH CẬP NHẬT ĐƠN:', err)
    return res.status(200).json({ RspCode: '99', Message: 'Lỗi không xác định' })
  }
})

/**
 * POST /api/orders/:id/cancel — Người dùng chủ động hủy đơn chưa thanh toán
 */
export const cancelOrder = asyncHandler(async (req: Request, res: Response) => {
  const result = await orderService.cancelOrder(req.user!.sub, req.params.id as string)
  successResponse(res, result)
})

/**
 * POST /api/orders/webhook/stripe — Điểm nhận Webhook từ Stripe
 * Cảnh báo: Route này KHÔNG CẦN xác thực người dùng, nhưng BẮT BUỘC phải dùng Raw Body
 * để hàm constructEvent so sánh và chứng minh request này thực sự đến từ máy chủ Stripe.
 */
export const stripeWebhookHandler = asyncHandler(async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret_for_development'

  let event
  try {
    // req.body ở đây là Raw Buffer nhờ cấu hình express.raw() bên app.ts
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret)
  } catch (err: any) {
    console.error(`[Stripe Webhook] CẢNH BÁO: Kẻ gian tấn công gửi giả API hoặc cấu hình sai Secret. Chi tiết: ${err.message}`)
    return res.status(400).send(`Webhook Error: ${err.message}`) // Phải trả 400 để Stripe ngắt kết nối
  }

  // Lắng nghe sự kiện "Thanh toán giao dịch hoàn tất" (Tiền về!)
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any
    const orderId = session.metadata.orderId

    console.log(`[Stripe Webhook] 👍 Thẻ quẹt thành công! Tiến hành phát hành Voucher cho Đơn: ${orderId}`)

    // Sử dụng lại hàm VNPay hồi xưa, lôi Đơn hàng ra cấp phát
    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (order && order.status === OrderStatus.PENDING_PAYMENT) {
      await orderService.processPayment(order.customerId, orderId, { outcome: 'SUCCESS' })
    }
  }

  // Bắt buộc trả về HTTP 200 để báo cho hệ thống Stripe biết là Webhook chạy êm xuôi!
  res.status(200).json({ received: true })
})
