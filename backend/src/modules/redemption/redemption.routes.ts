import { RoleName } from '@voucher/shared'
import { Router } from 'express'

import { authenticate } from '~/middlewares/authenticate'
import { authorize } from '~/middlewares/authorize'
import { validate } from '~/middlewares/validate'
import { ApiResponse } from '~/utils/api-response'
import { asyncHandler } from '~/utils/async-handler'
import { redeemVoucherCode, validateVoucherCode } from './redemption.service'
import {
  redeemVoucherCodeSchema,
  voucherCodeParamsSchema,
  type RedeemVoucherCodeInput,
  type VoucherCodeParams
} from './redemption.validation'

export const redemptionRoutes = Router()

redemptionRoutes.use('/voucher-codes', authenticate, authorize(RoleName.PARTNER))
redemptionRoutes.get(
  '/voucher-codes/:code',
  validate({ params: voucherCodeParamsSchema }),
  asyncHandler(async (req, res) => {
    const { code } = req.validated?.params as VoucherCodeParams
    ApiResponse.success(res, await validateVoucherCode(req.user!.sub, code))
  })
)
redemptionRoutes.post(
  '/voucher-codes/:code/redemption',
  validate({ params: voucherCodeParamsSchema, body: redeemVoucherCodeSchema }),
  asyncHandler(async (req, res) => {
    const { code } = req.validated?.params as VoucherCodeParams
    const { branchId } = req.validated?.body as RedeemVoucherCodeInput
    ApiResponse.success(res, await redeemVoucherCode(req.user!.sub, code, branchId))
  })
)
