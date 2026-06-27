import { z } from 'zod'

export const registerPartnerSchema = z.object({
  legalName: z.string().trim().min(2).max(255),
  taxCode: z.string().trim().min(3).max(32),
  representative: z.string().trim().min(2).max(255),
  branches: z
    .array(
      z.object({
        name: z.string().trim().min(2).max(255),
        address: z.string().trim().min(5),
        region: z.string().trim().min(2).max(128)
      })
    )
    .optional()
})

export const updatePartnerSchema = z.object({
  legalName: z.string().trim().min(2).max(255).optional(),
  representative: z.string().trim().min(2).max(255).optional()
})

export const branchBodySchema = z.object({
  name: z.string().trim().min(2).max(255),
  address: z.string().trim().min(5),
  region: z.string().trim().min(2).max(128)
})

export const branchIdParamsSchema = z.object({
  id: z.coerce.number().int().positive()
})

export const partnerIdParamsSchema = z.object({
  id: z.string().uuid()
})

export const partnerApprovalSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('approve')
  }),
  z.object({
    action: z.literal('reject'),
    rejectReason: z.string().trim().min(3).max(1000)
  })
])

export const partnerLockSchema = z.object({
  action: z.enum(['lock', 'unlock'])
})

export type RegisterPartnerInput = z.infer<typeof registerPartnerSchema>
export type UpdatePartnerInput = z.infer<typeof updatePartnerSchema>
export type BranchInput = z.infer<typeof branchBodySchema>
export type PartnerApprovalInput = z.infer<typeof partnerApprovalSchema>
export type PartnerLockInput = z.infer<typeof partnerLockSchema>
