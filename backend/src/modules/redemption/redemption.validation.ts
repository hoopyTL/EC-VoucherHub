import { z } from 'zod'

export const voucherCodeParamsSchema = z.object({
  code: z.string().trim().min(1, 'Mã voucher không được để trống').max(32)
})

export const redeemVoucherCodeSchema = z.object({
  branchId: z.coerce.number().int().positive('Chi nhánh không hợp lệ')
})

export type VoucherCodeParams = z.infer<typeof voucherCodeParamsSchema>
export type RedeemVoucherCodeInput = z.infer<typeof redeemVoucherCodeSchema>
