import { Request, Response } from 'express'
import { asyncHandler } from '../../middleware/async-handler'
import { successResponse } from '../../utils/response'
import { paymentService } from './payment.service'
import { NotFoundError, ForbiddenError } from '../../middleware/error-handler'
import prisma from '../../configs/prisma'

/**
 * GET /api/orders/:orderId/payments — Lịch sử thanh toán của đơn hàng
 */
export const getPaymentsByOrder = asyncHandler(async (req: Request, res: Response) => {
  const orderId = req.params.orderId as string
  const customerId = req.user!.sub

  // Kiểm tra phạm vi sở hữu: chỉ xem được lịch sử thanh toán của đơn mình
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) throw new NotFoundError('Đơn hàng không tồn tại')
  if (order.customerId !== customerId) throw new ForbiddenError('Đơn hàng không thuộc về bạn')

  const payments = await paymentService.getByOrderId(orderId)
  successResponse(res, payments)
})

/**
 * GET /api/payments/:id — Chi tiết một giao dịch thanh toán
 */
export const getPaymentDetail = asyncHandler(async (req: Request, res: Response) => {
  const paymentId = req.params.id as string

  const payment = await prisma.paymentTransaction.findUnique({
    where: { id: paymentId },
    include: { order: { select: { customerId: true } } }
  })

  if (!payment) throw new NotFoundError('Giao dịch thanh toán không tồn tại')
  if (payment.order.customerId !== req.user!.sub) {
    throw new ForbiddenError('Giao dịch không thuộc về bạn')
  }

  const response = {
    id: payment.id,
    orderId: payment.orderId,
    gateway: payment.gateway,
    gatewayTransId: payment.gatewayTransId,
    amount: payment.amount.toFixed(2),
    currency: payment.currency,
    status: payment.status,
    failureReason: payment.failureReason,
    paidAt: payment.paidAt?.toISOString() ?? null,
    refundedAt: payment.refundedAt?.toISOString() ?? null,
    createdAt: payment.createdAt.toISOString()
  }

  successResponse(res, response)
})
