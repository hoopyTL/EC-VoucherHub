import { z } from 'zod'

const voucherBaseSchema = z.object({
  categoryId: z.coerce.number().int().positive().nullable().optional(),

  name: z.string().trim().min(1, 'name is required').max(255),

  description: z.string().trim().min(1, 'description is required'),

  imageUrl: z.url('invalid image url').max(512).nullable().optional(),

  originalPrice: z.coerce.number().positive('original price must be greater than 0'),

  salePrice: z.coerce.number().positive('sale price must be greater than 0'),

  saleStart: z.iso.datetime('invalid sale start date'),

  saleEnd: z.iso.datetime('invalid sale end date'),

  usageStart: z.iso.datetime('invalid usage start date'),

  usageEnd: z.iso.datetime('invalid usage end date'),

  totalQuantity: z.coerce.number().int().positive('total quantity must be greater than 0'),

  isMultiUse: z.boolean().default(false),

  usesPerCode: z.coerce.number().int().positive().nullable().optional(),

  branchIds: z.array(z.coerce.number().int().positive()).optional()
})

export const createVoucherSchema = voucherBaseSchema.superRefine((data, ctx) => {
  if (data.salePrice >= data.originalPrice) {
    ctx.addIssue({
      code: 'custom',
      path: ['salePrice'],
      message: 'sale price must be lower than original price'
    })
  }

  if (new Date(data.saleStart) >= new Date(data.saleEnd)) {
    ctx.addIssue({
      code: 'custom',
      path: ['saleEnd'],
      message: 'sale end must be after sale start'
    })
  }

  if (new Date(data.usageStart) >= new Date(data.usageEnd)) {
    ctx.addIssue({
      code: 'custom',
      path: ['usageEnd'],
      message: 'usage end must be after usage start'
    })
  }

  if (data.isMultiUse && !data.usesPerCode) {
    ctx.addIssue({
      code: 'custom',
      path: ['usesPerCode'],
      message: 'uses per code is required for multi-use voucher'
    })
  }

  if (!data.isMultiUse && data.usesPerCode != null) {
    ctx.addIssue({
      code: 'custom',
      path: ['usesPerCode'],
      message: 'uses per code must be empty for single-use voucher'
    })
  }

  if (data.branchIds) {
    const uniqueBranches = new Set(data.branchIds)

    if (uniqueBranches.size !== data.branchIds.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['branchIds'],
        message: 'branch ids must not contain duplicates'
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
