import { z } from 'zod'

const voucherBaseSchema = z.object({
  categoryId: z.coerce.number().int().positive().nullable().optional(),

  name: z.string().trim().min(1, 'name is required').max(255),

  description: z.string().trim().min(1, 'description is required'),

  imageUrl: z.url('invalid image url').max(512).nullable().optional(),

  originalPrice: z.coerce.number().positive('originalPrice must be greater than 0'),

  salePrice: z.coerce.number().positive('salePrice must be greater than 0'),

  saleStart: z.iso.datetime('invalid saleStart'),

  saleEnd: z.iso.datetime('invalid saleEnd'),

  usageStart: z.iso.datetime('invalid usageStart'),

  usageEnd: z.iso.datetime('invalid usageEnd'),

  totalQuantity: z.coerce.number().int().positive('totalQuantity must be greater than 0'),

  isMultiUse: z.boolean().default(false),

  usesPerCode: z.coerce.number().int().positive().nullable().optional(),

  branchIds: z.array(z.coerce.number().int().positive()).optional()
})

export const createVoucherSchema = voucherBaseSchema.superRefine((data, ctx) => {
  if (data.salePrice >= data.originalPrice) {
    ctx.addIssue({
      code: 'custom',
      path: ['salePrice'],
      message: 'salePrice must be less than originalPrice'
    })
  }

  const saleStart = new Date(data.saleStart)
  const saleEnd = new Date(data.saleEnd)

  if (saleStart >= saleEnd) {
    ctx.addIssue({
      code: 'custom',
      path: ['saleEnd'],
      message: 'saleEnd must be after saleStart'
    })
  }

  const usageStart = new Date(data.usageStart)
  const usageEnd = new Date(data.usageEnd)

  if (usageStart >= usageEnd) {
    ctx.addIssue({
      code: 'custom',
      path: ['usageEnd'],
      message: 'usageEnd must be after usageStart'
    })
  }

  if (data.isMultiUse && !data.usesPerCode) {
    ctx.addIssue({
      code: 'custom',
      path: ['usesPerCode'],
      message: 'usesPerCode is required for multi-use voucher'
    })
  }

  if (!data.isMultiUse && data.usesPerCode) {
    ctx.addIssue({
      code: 'custom',
      path: ['usesPerCode'],
      message: 'usesPerCode is only allowed for multi-use voucher'
    })
  }

  if (data.branchIds) {
    const uniqueBranchIds = new Set(data.branchIds)

    if (uniqueBranchIds.size !== data.branchIds.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['branchIds'],
        message: 'branchIds must not contain duplicates'
      })
    }
  }
})

export const updateVoucherSchema = voucherBaseSchema.partial()

export const voucherIdParamSchema = z.object({
  id: z.uuid('invalid voucher id')
})

export const voucherApprovalSchema = z
  .object({
    action: z.enum(['approve', 'reject']),

    reason: z.string().trim().min(1).optional()
  })
  .superRefine((data, ctx) => {
    if (data.action === 'reject' && !data.reason) {
      ctx.addIssue({
        code: 'custom',
        path: ['reason'],
        message: 'reason is required when rejecting voucher'
      })
    }
  })

export const voucherStatusSchema = z.object({
  action: z.enum(['publish', 'suspend', 'unpublish'])
})

export type CreateVoucherInput = z.infer<typeof createVoucherSchema>

export type UpdateVoucherInput = z.infer<typeof updateVoucherSchema>

export type VoucherApprovalInput = z.infer<typeof voucherApprovalSchema>

export type VoucherStatusInput = z.infer<typeof voucherStatusSchema>
