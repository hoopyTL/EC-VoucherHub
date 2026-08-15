import { z } from 'zod'

export const voucherCodeActionSchema = z.object({
  code: z.string().trim().min(1, 'code is required').max(32),
  branchId: z.coerce.number().int().positive('invalid branch id')
})

export const voucherCodeParamSchema = z.object({
  code: z.string().trim().min(1, 'code is required').max(32)
})

export const voucherCodeVerificationQuerySchema = z.object({
  branchId: z.coerce.number().int().positive('invalid branch id')
})

export const voucherCodeRedemptionBodySchema = z.object({
  branchId: z.coerce.number().int().positive('invalid branch id')
})

export type VoucherCodeActionInput = z.infer<typeof voucherCodeActionSchema>
