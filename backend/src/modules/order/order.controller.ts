import { Request, Response } from 'express'
import { asyncHandler } from '../../middlewares/async-handler'
import { successResponse, createdResponse } from '../../utils/response'
import { OrderStatus } from '@voucher/shared'
import * as orderService from './order.service'
import prisma from '../../configs/prisma'
import stripe from '../../utils/stripe'
import { AppError as ApiError } from '../../utils/app-error'
import { capturePayPalOrder, createPayPalOrder } from '../../utils/paypal'
import { createOnePayUrl, verifyOnePayReturn, restoreOrderIdFromTxnRef } from '../../utils/onepay'
import { paymentService } from '../payment/payment.service'

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
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined
  const limit = req.query.limit ? Number(req.query.limit) : undefined
  const statusParam = typeof req.query.status === 'string' ? req.query.status : undefined
  let statuses: string[] | undefined
  if (statusParam) {
    statuses = statusParam
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
    const invalid = statuses.find((s) => !Object.values(OrderStatus).includes(s as OrderStatus))
    if (invalid) throw ApiError.badRequest('Trạng thái đơn không hợp lệ')
  }
  const result = await orderService.getMyOrders(req.user!.sub, cursor, limit, statuses)
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
  if (process.env.NODE_ENV !== 'test' && process.env.ENABLE_SIMULATED_PAYMENTS !== 'true') {
    throw ApiError.notFound('Phương thức thanh toán mô phỏng không khả dụng.')
  }
  const paymentContext = req.body?.gateway ? { gateway: String(req.body.gateway) } : undefined
  const result = await orderService.processPayment(req.user!.sub, req.params.id as string, req.body, paymentContext)
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

/** Confirm a returning Stripe Checkout session for its authenticated order owner. */
export const confirmStripePayment = asyncHandler(async (req: Request, res: Response) => {
  const orderId = String(req.params.id)
  const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId.trim() : ''
  if (!sessionId) throw ApiError.badRequest('Thiếu mã phiên thanh toán Stripe.')

  let session
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId)
  } catch {
    throw ApiError.badRequest('Không tìm thấy phiên thanh toán Stripe hợp lệ.')
  }

  if (session.payment_status !== 'paid' || session.metadata?.orderId !== orderId) {
    throw ApiError.badRequest('Phiên thanh toán Stripe không khớp với đơn hàng.')
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, customerId: true, status: true, totalAmount: true }
  })
  if (!order) throw ApiError.notFound('Đơn hàng không tồn tại.')
  if (order.status === OrderStatus.PAID) return successResponse(res, order)
  if (order.status !== OrderStatus.PENDING_PAYMENT)
    throw ApiError.conflict('Đơn hàng không ở trạng thái chờ thanh toán.')

  const expectedAmount = Math.round(Number(order.totalAmount))
  if (session.currency?.toLowerCase() !== 'vnd' || session.amount_total !== expectedAmount) {
    throw ApiError.badRequest('Số tiền Stripe không khớp với đơn hàng.')
  }

  await orderService.processPayment(
    order.customerId,
    orderId,
    { outcome: 'SUCCESS' },
    {
      gateway: 'STRIPE',
      gatewayTransId: session.id,
      rawResponse: {
        id: session.id,
        paymentStatus: session.payment_status,
        amountTotal: session.amount_total,
        currency: session.currency
      }
    }
  )
  const confirmed = await orderService.getOrderDetail(order.customerId, orderId)
  if (confirmed.status !== OrderStatus.PAID) throw ApiError.conflict('Stripe chưa xác nhận thanh toán hoàn tất.')
  successResponse(res, confirmed)
})

export const createPayPalPayment = asyncHandler(async (req: Request, res: Response) => {
  const orderId = String(req.params.id)
  const order = await orderService.getOrderDetail(req.user!.sub, orderId)
  if (order.status !== OrderStatus.PENDING_PAYMENT) {
    throw ApiError.conflict('Đơn hàng không ở trạng thái chờ thanh toán.')
  }

  try {
    const paypal = await createPayPalOrder({ orderId, amountVnd: Number(order.totalAmount) })
    const transaction = await paymentService.create({
      orderId,
      gateway: 'PAYPAL',
      amount: Number(order.totalAmount),
      currency: 'VND'
    })
    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        gatewayTransId: paypal.paypalOrderId,
        rawResponse: { paypalAmount: paypal.amountUsd, paypalCurrency: 'USD' }
      }
    })
    successResponse(res, { url: paypal.approvalUrl })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không thể kết nối PayPal Sandbox.'
    throw ApiError.badRequest(message)
  }
})

export const capturePayPalPayment = asyncHandler(async (req: Request, res: Response) => {
  const orderId = String(req.params.id)
  const paypalOrderId = typeof req.body?.paypalOrderId === 'string' ? req.body.paypalOrderId.trim() : ''
  if (!paypalOrderId) throw ApiError.badRequest('Thiếu mã PayPal Order.')

  const order = await orderService.getOrderDetail(req.user!.sub, orderId)
  const transaction = await prisma.paymentTransaction.findFirst({
    where: { orderId, gateway: 'PAYPAL', gatewayTransId: paypalOrderId, status: 'PENDING' },
    orderBy: { createdAt: 'desc' }
  })
  if (!transaction) throw ApiError.badRequest('Không tìm thấy giao dịch PayPal đang chờ xử lý.')

  try {
    const capture = await capturePayPalOrder(paypalOrderId)
    if (capture.status !== 'COMPLETED') {
      await paymentService.updateStatus(transaction.id, {
        status: 'FAILED',
        gatewayTransId: capture.captureId ?? paypalOrderId,
        rawResponse: capture.rawResponse as unknown as Record<string, unknown>,
        failureReason: `PayPal status: ${capture.status}`
      })
      throw ApiError.badRequest('Giao dịch PayPal chưa hoàn tất.')
    }

    const result = await orderService.processPayment(
      order.customerId,
      orderId,
      { outcome: 'SUCCESS' },
      {
        paymentId: transaction.id,
        gateway: 'PAYPAL',
        gatewayTransId: capture.captureId ?? paypalOrderId,
        rawResponse: capture.rawResponse as unknown as Record<string, unknown>
      }
    )
    successResponse(res, result)
  } catch (error) {
    if (error instanceof ApiError) throw error
    const message = error instanceof Error ? error.message : 'Không thể xác nhận giao dịch PayPal.'
    throw ApiError.badRequest(message)
  }
})
import { createVNPayUrl, verifyVNPayReturn } from '../../utils/vnpay'

/**
 * GET /api/orders/:id/onepay — Khởi tạo URL Thanh toán OnePay Sandbox (Napas ATM / Domestic)
 */
export const createOnePayPayment = asyncHandler(async (req: Request, res: Response) => {
  const orderId = req.params.id as string
  const order = await orderService.getOrderDetail(req.user!.sub, orderId)

  if (order.status !== OrderStatus.PENDING_PAYMENT) {
    throw ApiError.conflict('Đơn hàng không ở trạng thái chờ thanh toán.')
  }

  const amount = typeof order.totalAmount === 'number' ? order.totalAmount : Number(order.totalAmount)
  const ipAddr = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1'

  const url = createOnePayUrl({
    orderId,
    amount,
    ipAddr: String(ipAddr)
  })

  await paymentService.create({
    orderId,
    gateway: 'ONEPAY',
    amount,
    currency: 'VND'
  })

  successResponse(res, { url })
})

/**
 * GET /api/orders/onepay-ipn — Điểm nhận IPN callback từ OnePay
 */
export const onepayIpn = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as Record<string, string>
  const isValid = verifyOnePayReturn(query)

  console.info('[OnePay IPN] Callback received', { signatureValid: isValid })

  if (!isValid) {
    console.warn('[OnePay IPN] Invalid signature')
    return res.send('responsecode=1&desc=confirm-fail')
  }

  try {
    const rawTxnRef = String(query.vpc_MerchTxnRef || '')
    const orderId = restoreOrderIdFromTxnRef(rawTxnRef)
    const txnResponseCode = String(query.vpc_TxnResponseCode || '')

    const order = await prisma.order.findUnique({ where: { id: orderId } })

    if (!order) {
      return res.send('responsecode=0&desc=confirm-success')
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      return res.send('responsecode=0&desc=confirm-success')
    }

    const callbackAmount = Number(query.vpc_Amount)
    const expectedAmount = Math.round(Number(order.totalAmount) * 100)
    if (!Number.isFinite(callbackAmount) || callbackAmount !== expectedAmount) {
      return res.send('responsecode=1&desc=invalid-amount')
    }

    if (txnResponseCode === '0') {
      await orderService.processPayment(
        order.customerId,
        order.id,
        { outcome: 'SUCCESS' },
        { gateway: 'ONEPAY', gatewayTransId: String(query.vpc_TransactionNo || rawTxnRef), rawResponse: query }
      )
    } else {
      await orderService.processPayment(
        order.customerId,
        order.id,
        { outcome: 'FAILURE' },
        { gateway: 'ONEPAY', gatewayTransId: String(query.vpc_TransactionNo || rawTxnRef), rawResponse: query }
      )
    }

    return res.send('responsecode=0&desc=confirm-success')
  } catch (err) {
    console.error('[OnePay IPN] LỖI HỆ THỐNG:', err)
    return res.send('responsecode=0&desc=confirm-success')
  }
})

/**
 * GET /api/orders/:id/vnpay — Khởi tạo URL Thanh toán VNPay
 */
export const createVNPayPayment = asyncHandler(async (req: Request, res: Response) => {
  const orderId = req.params.id as string
  const order = await orderService.getOrderDetail(req.user!.sub, orderId)
  if (order.status !== OrderStatus.PENDING_PAYMENT) {
    throw ApiError.conflict('Đơn hàng không ở trạng thái chờ thanh toán.')
  }
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
  const transactionStatus = vnp_Params['vnp_TransactionStatus'] as string
  const callbackAmount = Number(vnp_Params['vnp_Amount'])

  // Never write callback parameters to logs: query values are controlled by an external caller.
  console.info('[VNPay IPN] Callback received', { signatureValid: isValid })

  // 1. Kiểm tra chữ ký bảo mật (Checksum)
  // Nếu sai, dữ liệu URL đã bị giả mạo hoặc encode sai định dạng.
  if (!isValid) {
    console.warn('[VNPay IPN] Invalid callback signature')
    return res.status(200).json({ RspCode: '97', Message: 'Invalid signature' })
  }

  try {
    // 2. Tìm đơn hàng tương ứng trong cơ sở dữ liệu
    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order) {
      return res.status(200).json({ RspCode: '01', Message: 'Order not found' })
    }

    // 3. Kiểm tra tiến độ ghi nhận (Chỉ xử lý đơn chưa được thanh toán)
    // VNPay may call the server IPN before the customer's browser returns to
    // the frontend. The frontend then safely replays this verification URL.
    // Treat an already-paid order as an idempotent success instead of turning a
    // successful payment into a false failure on the result page.
    if (order.status === OrderStatus.PAID) {
      return res.status(200).json({ RspCode: '00', Message: 'Confirm Success' })
    }
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      return res.status(200).json({ RspCode: '02', Message: 'Order not pending payment' })
    }

    const expectedAmount = Math.round(Number(order.totalAmount) * 100)
    if (!Number.isFinite(callbackAmount) || callbackAmount !== expectedAmount) {
      return res.status(200).json({ RspCode: '04', Message: 'Invalid amount' })
    }

    // A payment is successful only when both VNPay result fields confirm it.
    if (responseCode === '00' && transactionStatus === '00') {
      await orderService.processPayment(
        order.customerId,
        orderId,
        { outcome: 'SUCCESS' },
        {
          gateway: 'VNPAY',
          gatewayTransId: String(vnp_Params['vnp_TransactionNo'] || rawTxnRef),
          rawResponse: vnp_Params as Record<string, unknown>
        }
      )
    } else {
      await orderService.processPayment(
        order.customerId,
        orderId,
        { outcome: 'FAILURE' },
        {
          gateway: 'VNPAY',
          gatewayTransId: String(vnp_Params['vnp_TransactionNo'] || rawTxnRef),
          rawResponse: vnp_Params as Record<string, unknown>
        }
      )
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
    const checkoutSession = event.data.object
    const orderId = checkoutSession.metadata?.orderId
    if (orderId) {
      const order = await prisma.order.findUnique({ where: { id: orderId } })
      const amountMatches =
        checkoutSession.currency?.toLowerCase() === 'vnd' &&
        checkoutSession.amount_total === Math.round(Number(order?.totalAmount ?? -1))
      if (order?.status === OrderStatus.PENDING_PAYMENT && checkoutSession.payment_status === 'paid' && amountMatches) {
        await orderService.processPayment(order.customerId, orderId, { outcome: 'SUCCESS' })
      }
    }
  }

  return res.status(200).json({ received: true })
})
