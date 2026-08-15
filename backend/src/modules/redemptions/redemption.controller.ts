import type { Request, Response } from 'express'

import { ApiResponse } from '~/utils/api-response'
import { asyncHandler } from '~/utils/async-handler'
import { redeemVoucherCode, verifyVoucherCode } from './redemption.service'

export const verifyVoucherCodeHandler = asyncHandler(async (req: Request, res: Response) => {
  ApiResponse.success(res, await verifyVoucherCode(req.user!.id, req.body))
})

export const redeemVoucherCodeHandler = asyncHandler(async (req: Request, res: Response) => {
  ApiResponse.success(res, await redeemVoucherCode(req.user!.id, req.body))
})

export const verifyVoucherCodeByParamHandler = asyncHandler(async (req: Request, res: Response) => {
  ApiResponse.success(
    res,
    await verifyVoucherCode(req.user!.id, {
      code: String(req.params.code),
      branchId: Number(req.query.branchId)
    })
  )
})

export const redeemVoucherCodeByParamHandler = asyncHandler(async (req: Request, res: Response) => {
  ApiResponse.success(
    res,
    await redeemVoucherCode(req.user!.id, {
      code: String(req.params.code),
      branchId: Number(req.body.branchId)
    })
  )
})
