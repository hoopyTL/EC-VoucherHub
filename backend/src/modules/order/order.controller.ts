import { Request, Response } from 'express'
import { asyncHandler } from '../../middleware/async-handler'
import { successResponse, createdResponse } from '../../utils/response'
import * as orderService from './order.service'

/**
 * POST /api/orders — Tạo đơn từ giỏ hàng
 */
export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.createOrder(req.user!.id, req.body)
  createdResponse(res, order)
})

/**
 * GET /api/orders — Lịch sử đơn của khách
 */
export const getMyOrders = asyncHandler(async (req: Request, res: Response) => {
  const cursor = req.query.cursor as string | undefined
  const limit = req.query.limit ? Number(req.query.limit) : undefined
  const result = await orderService.getMyOrders(req.user!.id, cursor, limit)
  successResponse(res, result)
})

/**
 * GET /api/orders/:id — Chi tiết đơn hàng
 */
export const getOrderDetail = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.getOrderDetail(req.user!.id, req.params.id as string)
  successResponse(res, order)
})
