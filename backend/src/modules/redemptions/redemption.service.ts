import { Prisma, UsageResult, VoucherCodeStatus } from '@prisma/client'
import type { VoucherCodeVerificationDto, VoucherRedemptionResultDto } from '@voucher/shared'

import prisma from '~/configs/prisma'
import { AppError } from '~/utils/app-error'
import type { VoucherCodeActionInput } from './redemption.schema'

async function getPartnerBranch(userId: string, branchId: number) {
  const partner = await prisma.partner.findUnique({ where: { ownerUserId: userId } })
  if (!partner) throw AppError.notFound('Partner')
  if (partner.approvalStatus !== 'APPROVED') throw AppError.forbidden('Partner has not been approved')
  if (partner.operatingStatus !== 'ACTIVE') throw AppError.forbidden('Partner is not active')

  const branch = await prisma.branch.findUnique({ where: { id: branchId } })
  if (!branch || branch.partnerId !== partner.id) {
    throw AppError.forbidden('The selected branch does not belong to your account')
  }
  return { partner, branch }
}

async function loadCode(code: string) {
  return prisma.issuedVoucherCode.findUnique({
    where: { code },
    include: {
      owner: { select: { fullName: true } },
      voucherProduct: {
        include: { voucherProductBranches: { select: { branchId: true } } }
      }
    }
  })
}

function invalid(result: UsageResult, message: string): VoucherCodeVerificationDto {
  return { valid: false, result, message }
}

function codeDetails(
  issuedCode: NonNullable<Awaited<ReturnType<typeof loadCode>>>
): Omit<VoucherCodeVerificationDto, 'valid' | 'result' | 'message'> {
  return {
    codeId: issuedCode.id,
    code: issuedCode.code,
    voucherName: issuedCode.voucherProduct.name,
    customerName: issuedCode.owner.fullName,
    status: issuedCode.status,
    usageStart: issuedCode.voucherProduct.usageStart.toISOString(),
    usageEnd: issuedCode.expiresAt.toISOString(),
    remainingUses: issuedCode.remainingUses
  }
}

function invalidExistingCode(
  issuedCode: NonNullable<Awaited<ReturnType<typeof loadCode>>>,
  result: UsageResult,
  message: string
): VoucherCodeVerificationDto {
  return { valid: false, result, message, ...codeDetails(issuedCode) }
}

function evaluateCode(
  issuedCode: NonNullable<Awaited<ReturnType<typeof loadCode>>>,
  partnerId: string,
  branchId: number,
  now: Date
): VoucherCodeVerificationDto {
  if (issuedCode.voucherProduct.partnerId !== partnerId) {
    throw AppError.forbidden('This voucher code belongs to another partner')
  }
  if (issuedCode.status === VoucherCodeStatus.LOCKED) {
    return invalidExistingCode(issuedCode, UsageResult.LOCKED, 'Voucher code is locked')
  }
  if (issuedCode.status === VoucherCodeStatus.CANCELLED) {
    return invalidExistingCode(issuedCode, UsageResult.LOCKED, 'Voucher code has been cancelled')
  }
  if (issuedCode.status === VoucherCodeStatus.USED || issuedCode.remainingUses <= 0) {
    return invalidExistingCode(issuedCode, UsageResult.ALREADY_USED, 'Voucher code has already been fully used')
  }
  if (
    issuedCode.status === VoucherCodeStatus.EXPIRED ||
    now > issuedCode.expiresAt ||
    now > issuedCode.voucherProduct.usageEnd
  ) {
    return invalidExistingCode(issuedCode, UsageResult.EXPIRED, 'Voucher code has expired')
  }
  if (now < issuedCode.voucherProduct.usageStart) {
    return invalidExistingCode(issuedCode, UsageResult.EXPIRED, 'Voucher code is not valid yet')
  }

  const branchIds = issuedCode.voucherProduct.voucherProductBranches.map((item) => item.branchId)
  if (branchIds.length > 0 && !branchIds.includes(branchId)) {
    return invalidExistingCode(issuedCode, UsageResult.WRONG_BRANCH, 'Voucher code is not applicable at this branch')
  }

  return {
    valid: true,
    result: UsageResult.SUCCESS,
    message: 'Voucher code is valid',
    ...codeDetails(issuedCode)
  }
}

export async function verifyVoucherCode(
  userId: string,
  input: VoucherCodeActionInput
): Promise<VoucherCodeVerificationDto> {
  const { partner, branch } = await getPartnerBranch(userId, input.branchId)
  const issuedCode = await loadCode(input.code.trim())
  if (!issuedCode) return invalid(UsageResult.INVALID_CODE, 'Voucher code does not exist')
  const result = evaluateCode(issuedCode, partner.id, branch.id, new Date())
  result.branch = { id: branch.id, name: branch.name }
  return result
}

export async function redeemVoucherCode(
  userId: string,
  input: VoucherCodeActionInput
): Promise<VoucherRedemptionResultDto> {
  const { partner, branch } = await getPartnerBranch(userId, input.branchId)

  try {
    return await prisma.$transaction(
      async (tx) => {
        const issuedCode = await tx.issuedVoucherCode.findUnique({
          where: { code: input.code.trim() },
          include: {
            owner: { select: { fullName: true } },
            voucherProduct: { include: { voucherProductBranches: { select: { branchId: true } } } }
          }
        })
        if (!issuedCode) throw AppError.notFound('Voucher code')

        const evaluation = evaluateCode(issuedCode, partner.id, branch.id, new Date())
        if (!evaluation.valid) throw AppError.conflict(evaluation.message)

        const nextRemainingUses = issuedCode.remainingUses - 1
        const nextStatus = nextRemainingUses === 0 ? VoucherCodeStatus.USED : VoucherCodeStatus.UNUSED
        const update = await tx.issuedVoucherCode.updateMany({
          where: {
            id: issuedCode.id,
            status: VoucherCodeStatus.UNUSED,
            remainingUses: issuedCode.remainingUses
          },
          data: { remainingUses: nextRemainingUses, status: nextStatus }
        })
        if (update.count !== 1) throw AppError.conflict('Voucher code was redeemed by another request')

        const log = await tx.usageLog.create({
          data: {
            issuedCodeId: issuedCode.id,
            branchId: branch.id,
            actorUserId: userId,
            result: UsageResult.SUCCESS
          }
        })

        return {
          result: UsageResult.SUCCESS,
          message: 'Voucher redeemed successfully',
          usageLogId: log.id,
          codeId: issuedCode.id,
          code: issuedCode.code,
          status: nextStatus,
          remainingUses: nextRemainingUses,
          redeemedAt: log.usedAt.toISOString(),
          branch: { id: branch.id, name: branch.name }
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    )
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      throw AppError.conflict('Voucher code was redeemed by another request')
    }
    throw error
  }
}
