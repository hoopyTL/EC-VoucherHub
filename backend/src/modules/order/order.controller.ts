import { Request, Response } from 'express'
import { asyncHandler } from '../../middleware/async-handler'
import { successResponse, createdResponse } from '../../utils/response'
import * as orderService from './order.service'

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
import { createVNPayUrl, verifyVNPayReturn } from '../../utils/vnpay'

export const createVNPayPayment = asyncHandler(async (req: Request, res: Response) => {
  const orderId = req.params.id;
  const order = await orderService.getOrderDetail(req.user!.sub, orderId);
  const amount = typeof order.totalAmount === 'number' ? order.totalAmount : Number(order.totalAmount);
  const ipAddr = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const url = createVNPayUrl(String(ipAddr), orderId, amount, 'Thanh toan don hang ' + orderId);
  successResponse(res, { url });
});

import prisma from '../../configs/prisma'

export const vnpayReturn = asyncHandler(async (req: Request, res: Response) => {
  const vnp_Params = req.query;
  const isValid = verifyVNPayReturn(vnp_Params);
  const orderId = vnp_Params['vnp_TxnRef'] as string;
  const responseCode = vnp_Params['vnp_ResponseCode'] as string;

  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (order && order.status === 'PENDING_PAYMENT') {
      if (isValid && responseCode === '00') {
        await orderService.processPayment(order.customerId, orderId, { outcome: 'SUCCESS' });
      } else {
        await orderService.processPayment(order.customerId, orderId, { outcome: 'FAILURE' });
      }
    }
  } catch (err) {
    console.error('Lỗi khi xử lý callback VNPay:', err);
  }

  // Redirect thẳng khách về trang chi tiết đơn hàng
  res.redirect(`http://localhost:5173/orders/${orderId}`);
});
