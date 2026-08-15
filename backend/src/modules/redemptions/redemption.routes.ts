import { Router } from 'express'

import { requireRole } from '~/middlewares/require-role'
import { validate } from '~/middlewares/validate'
import {
  redeemVoucherCodeByParamHandler,
  redeemVoucherCodeHandler,
  verifyVoucherCodeByParamHandler,
  verifyVoucherCodeHandler
} from './redemption.controller'
import {
  voucherCodeActionSchema,
  voucherCodeParamSchema,
  voucherCodeRedemptionBodySchema,
  voucherCodeVerificationQuerySchema
} from './redemption.schema'

const router = Router()

// Canonical FR-14/FR-15 routes documented in docs/07-api-design.
router.get(
  '/voucher-codes/:code',
  requireRole('PARTNER'),
  validate({ params: voucherCodeParamSchema, query: voucherCodeVerificationQuerySchema }),
  verifyVoucherCodeByParamHandler
)
router.post(
  '/voucher-codes/:code/redemption',
  requireRole('PARTNER'),
  validate({ params: voucherCodeParamSchema, body: voucherCodeRedemptionBodySchema }),
  redeemVoucherCodeByParamHandler
)

// Backward-compatible routes used by the current partner client.
router.post(
  '/partner/voucher-codes/verify',
  requireRole('PARTNER'),
  validate({ body: voucherCodeActionSchema }),
  verifyVoucherCodeHandler
)
router.post(
  '/partner/voucher-codes/redeem',
  requireRole('PARTNER'),
  validate({ body: voucherCodeActionSchema }),
  redeemVoucherCodeHandler
)

export default router
