import { ApiResponse } from '~/utils/api-response'
import { asyncHandler } from '~/utils/async-handler'
import { reviewService } from './review.service'
import type { CreateReviewDto, UpdateReviewDto, VoucherReviewQueryDto } from './review.validation'

export const reviewController = {
  create: asyncHandler(async (req, res) => {
    const customerId = req.user!.sub
    const review = await reviewService.createReview(customerId, req.body as CreateReviewDto)
    ApiResponse.created(res, review)
  }),

  getVoucherReviews: asyncHandler(async (req, res) => {
    const voucherProductId = req.params.id as string
    const result = await reviewService.getVoucherReviews(
      voucherProductId,
      req.query as unknown as VoucherReviewQueryDto
    )
    ApiResponse.success(res, result)
  }),

  getMyReviews: asyncHandler(async (req, res) => {
    const customerId = req.user!.sub
    const reviews = await reviewService.getMyReviews(customerId)
    ApiResponse.success(res, reviews)
  }),

  getEligibleVouchers: asyncHandler(async (req, res) => {
    const customerId = req.user!.sub
    const eligible = await reviewService.getEligibleVouchers(customerId)
    ApiResponse.success(res, eligible)
  }),

  update: asyncHandler(async (req, res) => {
    const reviewId = req.params.id as string
    const customerId = req.user!.sub
    const updated = await reviewService.updateReview(reviewId, customerId, req.body as UpdateReviewDto)
    ApiResponse.success(res, updated)
  }),

  delete: asyncHandler(async (req, res) => {
    const reviewId = req.params.id as string
    const customerId = req.user!.sub
    const role = req.user!.role
    const result = await reviewService.deleteReview(reviewId, customerId, role)
    ApiResponse.success(res, result)
  })
}
