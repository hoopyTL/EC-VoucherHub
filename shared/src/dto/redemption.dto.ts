import type { UsageResult, VoucherCodeStatus } from '../enums'

export interface VerifyVoucherCodeDto {
  code: string
  branchId: number
}

export type RedeemVoucherCodeDto = VerifyVoucherCodeDto

export interface VoucherCodeVerificationDto {
  valid: boolean
  result: UsageResult
  message: string
  codeId?: string
  code?: string
  voucherName?: string
  customerName?: string
  status?: VoucherCodeStatus
  usageStart?: string
  usageEnd?: string
  remainingUses?: number
  branch?: { id: number; name: string }
}

export interface VoucherRedemptionResultDto {
  result: UsageResult
  message: string
  usageLogId: number
  codeId: string
  code: string
  status: VoucherCodeStatus
  remainingUses: number
  redeemedAt: string
  branch: { id: number; name: string }
}
