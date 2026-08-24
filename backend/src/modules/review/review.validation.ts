import { z } from 'zod'

export const createReviewSchema = z.object({
  voucherProductId: z.string().uuid('Mã sản phẩm voucher không hợp lệ'),
  orderId: z.string().uuid('Mã đơn hàng không hợp lệ').optional(),
  rating: z.number().int().min(1, 'Đánh giá tối thiểu 1 sao').max(5, 'Đánh giá tối đa 5 sao'),
  comment: z.string().max(1000, 'Nội dung nhận xét tối đa 1000 ký tự').optional()
})

export const updateReviewSchema = z
  .object({
    rating: z.number().int().min(1, 'Đánh giá tối thiểu 1 sao').max(5, 'Đánh giá tối đa 5 sao').optional(),
    comment: z.string().max(1000, 'Nội dung nhận xét tối đa 1000 ký tự').nullable().optional()
  })
  .refine((data) => data.rating !== undefined || data.comment !== undefined, {
    message: 'Cần cập nhật ít nhất số sao hoặc nội dung nhận xét'
  })

export const voucherReviewQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10)
})

export const reviewIdParamSchema = z.object({
  id: z.string().uuid('ID đánh giá không hợp lệ')
})

export const voucherIdParamSchema = z.object({
  id: z.string().uuid('ID voucher không hợp lệ')
})

export type CreateReviewDto = z.infer<typeof createReviewSchema>
export type UpdateReviewDto = z.infer<typeof updateReviewSchema>
export type VoucherReviewQueryDto = z.infer<typeof voucherReviewQuerySchema>
