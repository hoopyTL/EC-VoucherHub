import { Router } from 'express'

import { validate } from '~/middlewares/validate'
import { requireRole } from '~/middlewares/require-role'

import {
  createVoucherSchema,
  updateVoucherSchema,
  voucherApprovalSchema,
  voucherIdParamSchema,
  voucherStatusSchema
} from './voucher.schema'

import {
  changeVoucherStatusHandler,
  createVoucherHandler,
  getPartnerBranchesHandler,
  getPartnerVoucherHandler,
  getPartnerVouchersHandler,
  getAdminVouchersHandler,
  returnVoucherToDraftHandler,
  reviewVoucherHandler,
  submitVoucherHandler,
  uploadVoucherImageHandler,
  updateVoucherHandler
} from './voucher.controller'
import { voucherImageUpload } from './voucher-upload'

const router = Router()

router.get('/admin/vouchers', requireRole('ADMIN'), getAdminVouchersHandler)
router.post('/vouchers/images', requireRole('PARTNER'), voucherImageUpload.single('image'), uploadVoucherImageHandler)

// Partner - xem danh sách voucher
router.get('/partner/vouchers', requireRole('PARTNER'), getPartnerVouchersHandler)
router.get(
  '/partner/vouchers/:id',
  requireRole('PARTNER'),
  validate({ params: voucherIdParamSchema }),
  getPartnerVoucherHandler
)

// Partner - lấy danh sách chi nhánh để chọn khi tạo voucher
router.get('/partner/branches/options', requireRole('PARTNER'), getPartnerBranchesHandler)

// Partner - tạo voucher
router.post(
  '/vouchers',
  requireRole('PARTNER'),
  validate({
    body: createVoucherSchema
  }),
  createVoucherHandler
)

// Partner - sửa voucher khi còn DRAFT
router.patch(
  '/vouchers/:id',
  requireRole('PARTNER'),
  validate({
    params: voucherIdParamSchema,
    body: updateVoucherSchema
  }),
  updateVoucherHandler
)

// Partner - gửi voucher đi duyệt
router.post(
  '/vouchers/:id/submission',
  requireRole('PARTNER'),
  validate({
    params: voucherIdParamSchema
  }),
  submitVoucherHandler
)

// Partner - voucher bị reject thì đưa về DRAFT để sửa lại
router.post(
  '/vouchers/:id/draft',
  requireRole('PARTNER'),
  validate({
    params: voucherIdParamSchema
  }),
  returnVoucherToDraftHandler
)

// Admin - approve / reject voucher
router.patch(
  '/admin/vouchers/:id/approval',
  requireRole('ADMIN'),
  validate({
    params: voucherIdParamSchema,
    body: voucherApprovalSchema
  }),
  reviewVoucherHandler
)

// Admin - publish / suspend / unpublish
router.patch(
  '/admin/vouchers/:id/status',
  requireRole('ADMIN'),
  validate({
    params: voucherIdParamSchema,
    body: voucherStatusSchema
  }),
  changeVoucherStatusHandler
)

export default router
