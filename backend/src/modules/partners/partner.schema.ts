import { z } from 'zod'

export const createPartnerSchema = z.object({
  legalName: z.string().trim().min(1, 'legalName is required').max(255),
  taxCode: z.string().trim().min(1, 'taxCode is required').max(32),
  representative: z.string().trim().min(1, 'representative is required').max(255)
})

export const updatePartnerSchema = createPartnerSchema.partial()

export const createBranchSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(255),
  address: z.string().trim().min(1, 'address is required'),
  region: z.string().trim().min(1, 'region is required').max(128)
})

export const updateBranchSchema = createBranchSchema.partial()

export const partnerIdParamSchema = z.object({
  id: z.string().uuid('invalid partner id')
})

export const branchIdParamSchema = z.object({
  id: z.coerce.number().int().positive('invalid branch id')
})

export const approvalPartnerSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().trim().min(1).optional()
})

export const lockPartnerSchema = z.object({
  action: z.enum(['lock', 'unlock'])
})

export type CreatePartnerInput = z.infer<typeof createPartnerSchema>
export type UpdatePartnerInput = z.infer<typeof updatePartnerSchema>
export type CreateBranchInput = z.infer<typeof createBranchSchema>
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>
