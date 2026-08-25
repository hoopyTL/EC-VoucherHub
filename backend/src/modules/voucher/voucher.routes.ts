import { RoleName } from '@voucher/shared'
import { Router } from 'express'

import { authenticate } from '~/middlewares/authenticate'
import { authorize } from '~/middlewares/authorize'
import { rateLimit } from '~/middlewares/rate-limit'
import { validate } from '~/middlewares/validate'
import { voucherController } from './voucher.controller'
import { voucherImageUpload } from './voucher-upload'
import {
  adminVoucherStatusSchema,
  createVoucherSchema,
  partnerVoucherStatusSchema,
  publicVoucherSearchSchema,
  updateVoucherSchema,
  voucherApprovalSchema,
  voucherIdSchema,
  voucherListSchema
} from './voucher.validation'

export const voucherRoutes = Router()
const partnerOnly = [authenticate, authorize(RoleName.PARTNER)] as const
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 20,
  keyGenerator: (req) => req.user?.sub ?? 'unknown'
})

voucherRoutes.get('/vouchers', validate({ query: publicVoucherSearchSchema }), voucherController.searchPublic)
voucherRoutes.get('/vouchers/filters', voucherController.getPublicFilters)
voucherRoutes.get('/vouchers/external', voucherController.listExternal)
voucherRoutes.get('/vouchers/:id', validate({ params: voucherIdSchema }), voucherController.getPublic)

voucherRoutes.post('/vouchers/images', ...partnerOnly, uploadLimiter, voucherImageUpload, voucherController.uploadImage)
voucherRoutes.post('/vouchers', ...partnerOnly, validate({ body: createVoucherSchema }), voucherController.create)
voucherRoutes.patch(
  '/vouchers/:id',
  ...partnerOnly,
  validate({ params: voucherIdSchema, body: updateVoucherSchema }),
  voucherController.update
)
voucherRoutes.post(
  '/vouchers/:id/submission',
  ...partnerOnly,
  validate({ params: voucherIdSchema }),
  voucherController.submit
)
voucherRoutes.post(
  '/vouchers/:id/draft',
  ...partnerOnly,
  validate({ params: voucherIdSchema }),
  voucherController.returnToDraft
)
voucherRoutes.patch(
  '/vouchers/:id/status',
  ...partnerOnly,
  validate({ params: voucherIdSchema, body: partnerVoucherStatusSchema }),
  voucherController.changeMineStatus
)
voucherRoutes.get(
  '/partner/vouchers',
  ...partnerOnly,
  validate({ query: voucherListSchema }),
  voucherController.listMine
)
voucherRoutes.get(
  '/partner/vouchers/:id',
  ...partnerOnly,
  validate({ params: voucherIdSchema }),
  voucherController.getMine
)

voucherRoutes.use('/admin/vouchers', authenticate, authorize(RoleName.ADMIN))
voucherRoutes.get('/admin/vouchers', validate({ query: voucherListSchema }), voucherController.listAdmin)
voucherRoutes.patch(
  '/admin/vouchers/:id/approval',
  validate({ params: voucherIdSchema, body: voucherApprovalSchema }),
  voucherController.review
)
voucherRoutes.patch(
  '/admin/vouchers/:id/status',
  validate({ params: voucherIdSchema, body: adminVoucherStatusSchema }),
  voucherController.changeAdminStatus
)
