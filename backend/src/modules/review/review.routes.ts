import { RoleName } from '@voucher/shared'
import { Router } from 'express'
import { authenticate } from '~/middlewares/authenticate'
import { authorize } from '~/middlewares/authorize'
import { validate } from '~/middlewares/validate'
import { reviewController } from './review.controller'
import {
  createReviewSchema,
  reviewIdParamSchema,
  updateReviewSchema,
  voucherIdParamSchema,
  voucherReviewQuerySchema
} from './review.validation'

export const reviewRoutes = Router()

// Public route: Xem danh sách đánh giá của voucher
reviewRoutes.get(
  '/vouchers/:id/reviews',
  validate({ params: voucherIdParamSchema, query: voucherReviewQuerySchema }),
  reviewController.getVoucherReviews
)

// Customer routes: Quản lý đánh giá của khách hàng
const customerOnly = [authenticate, authorize(RoleName.CUSTOMER)] as const

reviewRoutes.post('/reviews', ...customerOnly, validate({ body: createReviewSchema }), reviewController.create)

reviewRoutes.get('/reviews/me', ...customerOnly, reviewController.getMyReviews)

reviewRoutes.get('/reviews/eligible', ...customerOnly, reviewController.getEligibleVouchers)

reviewRoutes.patch(
  '/reviews/:id',
  ...customerOnly,
  validate({ params: reviewIdParamSchema, body: updateReviewSchema }),
  reviewController.update
)

// Xóa review: Customer (chính chủ) hoặc Admin
reviewRoutes.delete('/reviews/:id', authenticate, validate({ params: reviewIdParamSchema }), reviewController.delete)
