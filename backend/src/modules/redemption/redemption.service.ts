import { VoucherCodeStatus } from '@prisma/client'

import prisma from '~/configs/prisma'
import { AppError } from '~/utils/app-error'

const codeInclude = {
  voucherProduct: {
    include: {
      partner: { select: { id: true, ownerUserId: true } },
      voucherProductBranches: { select: { branchId: true } }
    }
  }
} as const

async function getActorScope(client: typeof prisma, userId: string) {
  const partner = await client.partner.findUnique({ where: { ownerUserId: userId }, select: { id: true } })
  if (partner) return { partnerId: partner.id, assignedBranchIds: null as number[] | null }
  const staff = await client.partnerStaff.findUnique({
    where: { userId },
    select: { partnerId: true, status: true, assignments: { select: { branchId: true } } }
  })
  if (!staff || staff.status !== 'ACTIVE') throw AppError.forbidden('Tài khoản không thuộc đối tác đang hoạt động')
  return { partnerId: staff.partnerId, assignedBranchIds: staff.assignments.map((item) => item.branchId) }
}

function codeState(code: { status: VoucherCodeStatus; expiresAt: Date }) {
  if (code.status === VoucherCodeStatus.USED) return { valid: false, reason: 'Mã voucher đã được sử dụng' }
  if (code.status === VoucherCodeStatus.CANCELLED) return { valid: false, reason: 'Mã voucher đã bị hủy' }
  if (code.status === VoucherCodeStatus.LOCKED) return { valid: false, reason: 'Mã voucher đang bị khóa' }
  if (code.status === VoucherCodeStatus.EXPIRED || code.expiresAt <= new Date()) {
    return { valid: false, reason: 'Mã voucher đã hết hạn' }
  }
  return { valid: true, reason: null }
}

async function findScopedCode(userId: string, rawCode: string) {
  const scope = await getActorScope(prisma, userId)
  const code = await prisma.issuedVoucherCode.findUnique({
    where: { code: rawCode.trim() },
    include: codeInclude
  })
  if (!code) throw AppError.notFound('Mã voucher không hợp lệ')
  if (code.voucherProduct.partnerId !== scope.partnerId)
    throw AppError.forbidden('Mã voucher nằm ngoài phạm vi đối tác')
  return { scope, code }
}

function toValidationResult(code: Awaited<ReturnType<typeof findScopedCode>>['code']) {
  const state = codeState(code)
  return {
    code: code.code,
    status: code.status,
    valid: state.valid,
    reason: state.reason,
    remainingUses: code.remainingUses,
    expiresAt: code.expiresAt.toISOString(),
    voucher: {
      id: code.voucherProduct.id,
      name: code.voucherProduct.name,
      isMultiUse: code.voucherProduct.isMultiUse
    }
  }
}

export async function validateVoucherCode(userId: string, rawCode: string) {
  const { code } = await findScopedCode(userId, rawCode)
  return toValidationResult(code)
}

export async function listRedemptionBranches(userId: string) {
  const scope = await getActorScope(prisma, userId)
  return prisma.branch.findMany({
    where: {
      partnerId: scope.partnerId,
      ...(scope.assignedBranchIds ? { id: { in: scope.assignedBranchIds } } : {})
    },
    orderBy: { id: 'asc' }
  })
}

/**
 * Return every issued voucher owned by the authenticated customer.
 * The effective status treats a code past its expiry timestamp as EXPIRED even
 * when the persisted status has not yet been updated by a maintenance job.
 */
export async function listMyVouchers(userId: string) {
  const now = new Date()
  const codes = await prisma.issuedVoucherCode.findMany({
    where: { ownerUserId: userId },
    orderBy: { issuedAt: 'desc' },
    include: {
      voucherProduct: {
        select: {
          id: true,
          name: true,
          description: true,
          imageUrl: true,
          isMultiUse: true,
          usesPerCode: true,
          partner: { select: { legalName: true } }
        }
      },
      order: { select: { id: true, createdAt: true } },
      usageLogs: {
        where: { result: 'SUCCESS' },
        orderBy: { usedAt: 'desc' },
        take: 1,
        select: {
          usedAt: true,
          branch: { select: { id: true, name: true, address: true } }
        }
      }
    }
  })

  return codes.map((code) => {
    const latestUsage = code.usageLogs[0] ?? null
    const status =
      code.status === VoucherCodeStatus.UNUSED && code.expiresAt <= now ? VoucherCodeStatus.EXPIRED : code.status
    return {
      id: code.id,
      code: code.code,
      status,
      remainingUses: code.remainingUses,
      totalUses: code.voucherProduct.isMultiUse ? (code.voucherProduct.usesPerCode ?? 1) : 1,
      issuedAt: code.issuedAt.toISOString(),
      expiresAt: code.expiresAt.toISOString(),
      lastUsedAt: latestUsage?.usedAt.toISOString() ?? null,
      lastUsedBranch: latestUsage?.branch ?? null,
      order: {
        id: code.order.id,
        createdAt: code.order.createdAt.toISOString()
      },
      voucher: {
        id: code.voucherProduct.id,
        name: code.voucherProduct.name,
        description: code.voucherProduct.description,
        imageUrl: code.voucherProduct.imageUrl,
        partnerName: code.voucherProduct.partner.legalName
      }
    }
  })
}

export async function redeemVoucherCode(userId: string, rawCode: string, branchId: number) {
  return prisma.$transaction(async (tx) => {
    const scope = await getActorScope(tx as typeof prisma, userId)
    const branch = await tx.branch.findUnique({ where: { id: branchId }, select: { id: true, partnerId: true } })
    if (!branch || branch.partnerId !== scope.partnerId) throw AppError.forbidden('Chi nhánh nằm ngoài phạm vi đối tác')
    if (scope.assignedBranchIds && !scope.assignedBranchIds.includes(branchId)) {
      throw AppError.forbidden('Nhân viên chưa được phân công tại chi nhánh này')
    }

    const code = await tx.issuedVoucherCode.findUnique({
      where: { code: rawCode.trim() },
      include: codeInclude
    })
    if (!code) throw AppError.notFound('Mã voucher không hợp lệ')
    if (code.voucherProduct.partnerId !== scope.partnerId)
      throw AppError.forbidden('Mã voucher nằm ngoài phạm vi đối tác')
    const applicableBranches = code.voucherProduct.voucherProductBranches.map(({ branchId: id }) => id)
    if (applicableBranches.length > 0 && !applicableBranches.includes(branch.id)) {
      throw AppError.forbidden('Voucher không áp dụng tại chi nhánh này')
    }

    const state = codeState(code)
    if (!state.valid) throw AppError.conflict(state.reason ?? 'Mã voucher không sử dụng được')
    if (code.remainingUses <= 0) throw AppError.conflict('Mã voucher đã được sử dụng hết lượt')

    const remainingUses = code.remainingUses - 1
    const status = remainingUses === 0 ? VoucherCodeStatus.USED : VoucherCodeStatus.UNUSED
    const updated = await tx.issuedVoucherCode.updateMany({
      where: { id: code.id, status: VoucherCodeStatus.UNUSED, remainingUses: code.remainingUses },
      data: { remainingUses, status }
    })
    if (updated.count !== 1) throw AppError.conflict('Mã voucher vừa được sử dụng, vui lòng kiểm tra lại')

    const usedAt = new Date()
    await tx.usageLog.create({
      data: { issuedCodeId: code.id, branchId: branch.id, actorUserId: userId, usedAt, result: 'SUCCESS' }
    })
    return {
      id: code.id,
      code: code.code,
      status,
      remainingUses,
      usedAt: usedAt.toISOString(),
      redeemedAt: usedAt.toISOString(),
      branchId: branch.id,
      redemptionBranchId: String(branch.id)
    }
  })
}
