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
  const order = await orderService.getOrderDetail(req.user!.sub, req.params.id as string)
  successResponse(res, order)
})

/**
 * POST /api/orders/:id/payment — Thanh toán mô phỏng cho đơn hàng
 */
export const processPayment = asyncHandler(async (req: Request, res: Response) => {
  const result = await orderService.processPayment(req.user!.sub, req.params.id as string, req.body)
  successResponse(res, result)
})

export const createStripePayment = asyncHandler(async (req: Request, res: Response) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY ?? ''
  if (!/^(sk|rk)_test_/.test(stripeKey)) {
    throw ApiError.badRequest('Stripe chưa được cấu hình bằng khóa sandbox hợp lệ.')
  }
  const result = await orderService.createStripeCheckoutSession(req.user!.sub, String(req.params.id))
  successResponse(res, result)
})
import { createVNPayUrl, verifyVNPayReturn } from '../../utils/vnpay'

/**
 * GET /api/orders/:id/vnpay — Khởi tạo URL Thanh toán VNPay
 */
export const createVNPayPayment = asyncHandler(async (req: Request, res: Response) => {
  const orderId = req.params.id as string
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
 * GET /api/orders/vnpay-ipn — Điểm nhận Webhook (IPN) từ VNPay gửi về
 * Chú ý: Route này mở Public, không cần Bearer token.
 */
export const vnpayIpn = asyncHandler(async (req: Request, res: Response) => {
  const vnp_Params = req.query
  const isValid = verifyVNPayReturn(vnp_Params as Record<string, unknown>)

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
      return res.status(200).json({ RspCode: '01', Message: 'Order not found' })
    }

    // 3. Kiểm tra tiến độ ghi nhận (Chỉ xử lý đơn chưa được thanh toán)
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      return res.status(200).json({ RspCode: '02', Message: 'Order already confirmed' })
    }

    // 4. Quyết định cập nhật dựa trên mã VNPay trả về (00 là Thành công tuyệt đối)
    if (responseCode === '00') {
      await orderService.processPayment(order.customerId, orderId, { outcome: 'SUCCESS' })
    } else {
      await orderService.processPayment(order.customerId, orderId, { outcome: 'FAILURE' })
    }

    // 5. Trả mã chuẩn '00' để báo cho Server VNPay biết là Webhook đã xử lý xong
    return res.status(200).json({ RspCode: '00', Message: 'Confirm Success' })
  } catch (err) {
    console.error('[VNPay IPN] LỖI HỆ THỐNG TRONG QUÁ TRÌNH CẬP NHẬT ĐƠN:', err)
    return res.status(200).json({ RspCode: '99', Message: 'Unknown error' })
  }
})

/**
 * POST /api/orders/:id/cancel — Người dùng chủ động hủy đơn chưa thanh toán
 */
export const cancelOrder = asyncHandler(async (req: Request, res: Response) => {
  const result = await orderService.cancelOrder(req.user!.sub, req.params.id as string)
  successResponse(res, result)
})

export const stripeWebhookHandler = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature']
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET ?? ''
  if (typeof signature !== 'string' || !endpointSecret) {
    return res.status(400).json({ received: false })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, endpointSecret)
  } catch {
    return res.status(400).json({ received: false })
  }

  if (event.type === 'checkout.session.completed') {
    const orderId = event.data.object.metadata?.orderId
    if (orderId) {
      const order = await prisma.order.findUnique({ where: { id: orderId } })
      if (order?.status === OrderStatus.PENDING_PAYMENT) {
        await orderService.processPayment(order.customerId, orderId, { outcome: 'SUCCESS' })
      }
    }
  }

  return res.status(200).json({ received: true })
})
