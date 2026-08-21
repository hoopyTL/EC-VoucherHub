import { VoucherStatus } from '@voucher/shared'
import { z } from 'zod'

const MAX_INT = 2_147_483_647
const MAX_MONEY = 9_999_999_999.99
const positiveInt = z.coerce.number().int().positive().max(MAX_INT)
const nullablePositiveInt = positiveInt.nullable().optional()
const money = z.coerce.number().positive().max(MAX_MONEY).multipleOf(0.01)

const voucherFields = {
  categoryId: nullablePositiveInt,
  name: z.string().trim().min(1, 'Tên voucher không được để trống').max(255),
  description: z.string().trim().min(1, 'Mô tả không được để trống').max(10000),
  imageUrl: z
    .string()
    .trim()
    .max(512)
    .refine((value) => value.startsWith('/uploads/vouchers/'), 'Ảnh voucher phải được tải lên hệ thống')
    .nullable()
    .optional(),
  originalPrice: money,
  salePrice: money,
  saleStart: z.iso.datetime('Thời gian bắt đầu bán không hợp lệ'),
  saleEnd: z.iso.datetime('Thời gian kết thúc bán không hợp lệ'),
  usageStart: z.iso.datetime('Thời gian bắt đầu sử dụng không hợp lệ'),
  usageEnd: z.iso.datetime('Thời gian kết thúc sử dụng không hợp lệ'),
  totalQuantity: z.coerce.number().int().positive('Tổng số lượng phải lớn hơn 0').max(MAX_INT),
  isMultiUse: z.boolean(),
  usesPerCode: nullablePositiveInt,
  branchIds: z.array(positiveInt).max(100).optional()
}

function validateVoucherValues(data: Partial<z.infer<z.ZodObject<typeof voucherFields>>>, ctx: z.RefinementCtx) {
  if (data.salePrice !== undefined && data.originalPrice !== undefined && data.salePrice >= data.originalPrice) {
    ctx.addIssue({ code: 'custom', path: ['salePrice'], message: 'Giá bán phải nhỏ hơn giá gốc' })
  }
  if (data.saleStart && data.saleEnd && new Date(data.saleStart) >= new Date(data.saleEnd)) {
    ctx.addIssue({ code: 'custom', path: ['saleEnd'], message: 'Kết thúc bán phải sau bắt đầu bán' })
  }
  if (data.usageStart && data.usageEnd && new Date(data.usageStart) >= new Date(data.usageEnd)) {
    ctx.addIssue({ code: 'custom', path: ['usageEnd'], message: 'Kết thúc sử dụng phải sau bắt đầu sử dụng' })
  }
  if (data.isMultiUse === true && !data.usesPerCode) {
    ctx.addIssue({ code: 'custom', path: ['usesPerCode'], message: 'Voucher nhiều lượt cần số lượt mỗi mã' })
  }
  if (data.isMultiUse === false && data.usesPerCode != null) {
    ctx.addIssue({ code: 'custom', path: ['usesPerCode'], message: 'Voucher một lượt không có số lượt mỗi mã' })
  }
  if (data.branchIds && new Set(data.branchIds).size !== data.branchIds.length) {
    ctx.addIssue({ code: 'custom', path: ['branchIds'], message: 'Danh sách chi nhánh không được trùng' })
  }
}

export const createVoucherSchema = z.object(voucherFields).superRefine(validateVoucherValues)
export const updateVoucherSchema = z
  .object(voucherFields)
  .partial()
  .superRefine(validateVoucherValues)
  .refine((data) => Object.keys(data).length > 0, 'Cần ít nhất một trường để cập nhật')
export const voucherIdSchema = z.object({ id: z.string().uuid('Voucher ID không hợp lệ') })
export const voucherListSchema = z.object({
  page: positiveInt.default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(VoucherStatus).optional()
})
export const voucherApprovalSchema = z
  .object({
    action: z.enum(['approve', 'reject']),
    reason: z.string().trim().min(1, 'Lý do từ chối không được để trống').max(2000).optional()
  })
  .refine((data) => data.action !== 'reject' || data.reason, {
    path: ['reason'],
    message: 'Lý do từ chối là bắt buộc'
  })
export const partnerVoucherStatusSchema = z.object({ action: z.enum(['pause', 'resume']) })
export const adminVoucherStatusSchema = z.object({
  action: z.enum(['publish', 'suspend', 'resume', 'discontinue'])
})

export type CreateVoucherInput = z.infer<typeof createVoucherSchema>
export type UpdateVoucherInput = z.infer<typeof updateVoucherSchema>
export type VoucherListInput = z.infer<typeof voucherListSchema>
export type VoucherApprovalInput = z.infer<typeof voucherApprovalSchema>
export type PartnerVoucherStatusInput = z.infer<typeof partnerVoucherStatusSchema>
export type AdminVoucherStatusInput = z.infer<typeof adminVoucherStatusSchema>
