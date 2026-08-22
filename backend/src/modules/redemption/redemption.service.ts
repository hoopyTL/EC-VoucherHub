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

async function getPartner(userId: string) {
  const partner = await prisma.partner.findUnique({ where: { ownerUserId: userId }, select: { id: true } })
  if (!partner) throw AppError.forbidden('Tài khoản không thuộc đối tác')
  return partner
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
  const partner = await getPartner(userId)
  const code = await prisma.issuedVoucherCode.findUnique({
    where: { code: rawCode.trim() },
    include: codeInclude
  })
  if (!code) throw AppError.notFound('Mã voucher không hợp lệ')
  if (code.voucherProduct.partnerId !== partner.id) throw AppError.forbidden('Mã voucher nằm ngoài phạm vi đối tác')
  return { partner, code }
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

export async function redeemVoucherCode(userId: string, rawCode: string, branchId: number) {
  return prisma.$transaction(async (tx) => {
    const partner = await tx.partner.findUnique({ where: { ownerUserId: userId }, select: { id: true } })
    if (!partner) throw AppError.forbidden('Tài khoản không thuộc đối tác')
    const branch = await tx.branch.findUnique({ where: { id: branchId }, select: { id: true, partnerId: true } })
    if (!branch || branch.partnerId !== partner.id) throw AppError.forbidden('Chi nhánh nằm ngoài phạm vi đối tác')

    const code = await tx.issuedVoucherCode.findUnique({
      where: { code: rawCode.trim() },
      include: codeInclude
    })
    if (!code) throw AppError.notFound('Mã voucher không hợp lệ')
    if (code.voucherProduct.partnerId !== partner.id) throw AppError.forbidden('Mã voucher nằm ngoài phạm vi đối tác')
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
