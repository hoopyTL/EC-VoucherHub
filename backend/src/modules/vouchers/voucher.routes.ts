import { Router } from 'express'

import { validate } from '~/middlewares/validate'

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
  getPartnerVouchersHandler,
  returnVoucherToDraftHandler,
  reviewVoucherHandler,
  submitVoucherHandler,
  updateVoucherHandler
} from './voucher.controller'

const router = Router()

// Partner - xem danh sách voucher
router.get('/partner/vouchers', getPartnerVouchersHandler)

// Partner - lấy danh sách chi nhánh để chọn khi tạo voucher
router.get('/partner/branches/options', getPartnerBranchesHandler)

// Partner - tạo voucher
router.post(
  '/vouchers',
  validate({
    body: createVoucherSchema
  }),
  createVoucherHandler
)

// Partner - sửa voucher khi còn DRAFT
router.patch(
  '/vouchers/:id',
  validate({
    params: voucherIdParamSchema,
    body: updateVoucherSchema
  }),
  updateVoucherHandler
)

// Partner - gửi voucher đi duyệt
router.post(
  '/vouchers/:id/submission',
  validate({
    params: voucherIdParamSchema
  }),
  submitVoucherHandler
)

// Partner - voucher bị reject thì đưa về DRAFT để sửa lại
router.post(
  '/vouchers/:id/draft',
  validate({
    params: voucherIdParamSchema
  }),
  returnVoucherToDraftHandler
)

// Admin - approve / reject voucher
router.patch(
  '/admin/vouchers/:id/approval',
  validate({
    params: voucherIdParamSchema,
    body: voucherApprovalSchema
  }),
  reviewVoucherHandler
)

// Admin - publish / suspend / unpublish
router.patch(
  '/admin/vouchers/:id/status',
  validate({
    params: voucherIdParamSchema,
    body: voucherStatusSchema
  }),
  changeVoucherStatusHandler
)

export default router
