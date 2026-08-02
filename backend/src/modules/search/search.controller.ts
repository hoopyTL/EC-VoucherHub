import { Request, Response } from 'express'
import { asyncHandler } from '../../middleware/async-handler'
import { successResponse } from '../../utils/response'
import * as searchService from './search.service'
import { searchVoucherQuerySchema } from '@voucher/shared'

/**
 * GET /api/search/vouchers
 * Tìm kiếm, lọc và phân trang voucher
 */
export const searchVouchers = asyncHandler(async (req: Request, res: Response) => {
  // Validate query parameters bằng Zod Schema đã định nghĩa
  const query = searchVoucherQuerySchema.parse(req.query)
  
  const result = await searchService.searchVouchers(query)
  successResponse(res, result)
})

/**
 * GET /api/search/vouchers/:id
 * Lấy chi tiết voucher đang bán
 */
export const getVoucherDetail = asyncHandler(async (req: Request, res: Response) => {
  const result = await searchService.getVoucherDetail(req.params.id as string)
  successResponse(res, result)
})
