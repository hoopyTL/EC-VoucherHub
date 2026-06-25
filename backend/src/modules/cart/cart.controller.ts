import { Request, Response } from 'express'
import { asyncHandler } from '../../middleware/async-handler'
import { successResponse, noContentResponse } from '../../utils/response'
import * as cartService from './cart.service'

/**
 * GET /api/cart — Xem giỏ hàng + tạm tính
 */
export const getCart = asyncHandler(async (req: Request, res: Response) => {
  const cart = await cartService.getCart(req.user!.id)
  successResponse(res, cart)
})

/**
 * POST /api/cart/items — Thêm mục vào giỏ
 */
export const addItem = asyncHandler(async (req: Request, res: Response) => {
  const cart = await cartService.addItem(req.user!.id, req.body)
  successResponse(res, cart)
})

/**
 * PATCH /api/cart/items/:itemId — Cập nhật số lượng
 */
export const updateItem = asyncHandler(async (req: Request, res: Response) => {
  const itemId = Number(req.params.itemId)
  const cart = await cartService.updateItem(req.user!.id, itemId, req.body)
  successResponse(res, cart)
})

/**
 * DELETE /api/cart/items/:itemId — Xoá mục khỏi giỏ
 */
export const removeItem = asyncHandler(async (req: Request, res: Response) => {
  const itemId = Number(req.params.itemId)
  await cartService.removeItem(req.user!.id, itemId)
  noContentResponse(res)
})
