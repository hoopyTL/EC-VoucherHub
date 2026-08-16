import { ApprovalStatus, OperatingStatus, Prisma, VoucherCodeStatus, VoucherStatus } from '@prisma/client'
import type { VoucherDto } from '@voucher/shared'

import prisma from '~/configs/prisma'
import { voucherTransitions } from '~/domain/transitions'
import { assertTransition } from '~/domain/state-machine'
import { AppError } from '~/utils/app-error'
import type {
  AdminVoucherStatusInput,
  CreateVoucherInput,
  PartnerVoucherStatusInput,
  UpdateVoucherInput,
  VoucherApprovalInput,
  VoucherListInput
} from './voucher.validation'

const voucherInclude = {
  category: true,
  partner: { select: { id: true, legalName: true, approvalStatus: true, operatingStatus: true } },
  voucherProductBranches: { include: { branch: true }, orderBy: { branchId: 'asc' as const } }
} as const

type VoucherRecord = Prisma.VoucherProductGetPayload<{ include: typeof voucherInclude }>
type VoucherCodeCounts = Pick<VoucherDto, 'issuedCodeCount' | 'usedCodeCount' | 'expiredCodeCount'>

const emptyCodeCounts = (): VoucherCodeCounts => ({ issuedCodeCount: 0, usedCodeCount: 0, expiredCodeCount: 0 })

function toVoucherDto(voucher: VoucherRecord, codeCounts: VoucherCodeCounts = emptyCodeCounts()): VoucherDto {
  return {
    id: voucher.id,
    partnerId: voucher.partnerId,
    categoryId: voucher.categoryId,
    name: voucher.name,
    description: voucher.description,
    imageUrl: voucher.imageUrl,
    originalPrice: voucher.originalPrice.toString(),
    salePrice: voucher.salePrice.toString(),
    saleStart: voucher.saleStart.toISOString(),
    saleEnd: voucher.saleEnd.toISOString(),
    usageStart: voucher.usageStart.toISOString(),
    usageEnd: voucher.usageEnd.toISOString(),
    totalQuantity: voucher.totalQuantity,
    remainingQuantity: voucher.remainingQuantity,
    isMultiUse: voucher.isMultiUse,
    usesPerCode: voucher.usesPerCode,
    status: voucher.status,
    rejectReason: voucher.rejectReason,
    partner: { id: voucher.partner.id, legalName: voucher.partner.legalName },
    category: voucher.category,
    branches: voucher.voucherProductBranches.map(({ branch }) => branch),
    soldQuantity: voucher.totalQuantity - voucher.remainingQuantity,
    ...codeCounts,
    createdAt: voucher.createdAt.toISOString(),
    updatedAt: voucher.updatedAt.toISOString()
  }
}

async function getPartnerByOwner(userId: string) {
  const partner = await prisma.partner.findUnique({ where: { ownerUserId: userId } })
  if (!partner) throw AppError.notFound('Hồ sơ đối tác')
  if (partner.approvalStatus !== ApprovalStatus.APPROVED) throw AppError.forbidden('Đối tác chưa được duyệt')
  if (partner.operatingStatus !== OperatingStatus.ACTIVE) throw AppError.forbidden('Đối tác đang bị tạm khóa')
  return partner
}

async function getOwnedVoucher(userId: string, voucherId: string) {
  const partner = await getPartnerByOwner(userId)
  const voucher = await prisma.voucherProduct.findUnique({ where: { id: voucherId }, include: voucherInclude })
  if (!voucher) throw AppError.notFound('Voucher')
  if (voucher.partnerId !== partner.id) throw AppError.forbidden('Voucher nằm ngoài phạm vi đối tác')
  return { partner, voucher }
}

async function validateRelations(
  tx: Prisma.TransactionClient,
  partnerId: string,
  input: CreateVoucherInput | UpdateVoucherInput
) {
  if (
    input.categoryId != null &&
    !(await tx.category.findUnique({ where: { id: input.categoryId }, select: { id: true } }))
  ) {
    throw AppError.validation('Danh mục không tồn tại')
  }
  if (input.branchIds?.length) {
    const count = await tx.branch.count({ where: { id: { in: input.branchIds }, partnerId } })
    if (count !== input.branchIds.length) throw AppError.forbidden('Một hoặc nhiều chi nhánh nằm ngoài phạm vi đối tác')
  }
}

function validateCompleteValues(input: {
  originalPrice: number
  salePrice: number
  saleStart: string | Date
  saleEnd: string | Date
  usageStart: string | Date
  usageEnd: string | Date
  totalQuantity: number
  isMultiUse: boolean
  usesPerCode?: number | null
}) {
  if (input.salePrice >= input.originalPrice) throw AppError.unprocessable('Giá bán phải nhỏ hơn giá gốc')
  if (new Date(input.saleStart) >= new Date(input.saleEnd))
    throw AppError.unprocessable('Kết thúc bán phải sau bắt đầu bán')
  if (new Date(input.usageStart) >= new Date(input.usageEnd)) {
    throw AppError.unprocessable('Kết thúc sử dụng phải sau bắt đầu sử dụng')
  }
  if (input.totalQuantity <= 0) throw AppError.unprocessable('Tổng số lượng phải lớn hơn 0')
  if (input.isMultiUse && !input.usesPerCode) throw AppError.unprocessable('Voucher nhiều lượt cần số lượt mỗi mã')
  if (!input.isMultiUse && input.usesPerCode != null) {
    throw AppError.unprocessable('Voucher một lượt không có số lượt mỗi mã')
  }
}

function validateCanPublish(voucher: VoucherRecord) {
  validateCompleteValues({
    originalPrice: Number(voucher.originalPrice),
    salePrice: Number(voucher.salePrice),
    saleStart: voucher.saleStart,
    saleEnd: voucher.saleEnd,
    usageStart: voucher.usageStart,
    usageEnd: voucher.usageEnd,
    totalQuantity: voucher.totalQuantity,
    isMultiUse: voucher.isMultiUse,
    usesPerCode: voucher.usesPerCode
  })
  if (voucher.saleEnd <= new Date()) throw AppError.unprocessable('Thời gian bán đã kết thúc')
  if (voucher.remainingQuantity <= 0) throw AppError.unprocessable('Voucher đã hết hàng')
  if (
    voucher.partner.approvalStatus !== ApprovalStatus.APPROVED ||
    voucher.partner.operatingStatus !== OperatingStatus.ACTIVE
  ) {
    throw AppError.unprocessable('Đối tác sở hữu voucher chưa được duyệt hoặc đang bị khóa')
  }
}

async function loadVoucher(id: string, tx: Prisma.TransactionClient = prisma) {
  const voucher = await tx.voucherProduct.findUnique({ where: { id }, include: voucherInclude })
  if (!voucher) throw AppError.notFound('Voucher')
  return voucher
}

async function loadCodeCounts(voucherIds: string[], tx: Prisma.TransactionClient = prisma) {
  const counts = new Map(voucherIds.map((id) => [id, emptyCodeCounts()]))
  if (!voucherIds.length) return counts

  const groups = await tx.issuedVoucherCode.groupBy({
    by: ['voucherProductId', 'status'],
    where: { voucherProductId: { in: voucherIds } },
    _count: { _all: true }
  })
  for (const group of groups) {
    const current = counts.get(group.voucherProductId) ?? emptyCodeCounts()
    current.issuedCodeCount += group._count._all
    if (group.status === VoucherCodeStatus.USED) current.usedCodeCount += group._count._all
    if (group.status === VoucherCodeStatus.EXPIRED) current.expiredCodeCount += group._count._all
    counts.set(group.voucherProductId, current)
  }
  return counts
}

async function loadVoucherDto(id: string, tx: Prisma.TransactionClient = prisma) {
  const voucher = await loadVoucher(id, tx)
  const counts = await loadCodeCounts([id], tx)
  return toVoucherDto(voucher, counts.get(id))
}

async function listVouchers(
  input: VoucherListInput,
  where: Prisma.VoucherProductWhereInput | undefined,
  orderBy: Prisma.VoucherProductOrderByWithRelationInput
) {
  const [records, total] = await prisma.$transaction([
    prisma.voucherProduct.findMany({
      where,
      include: voucherInclude,
      orderBy,
      skip: (input.page - 1) * input.limit,
      take: input.limit
    }),
    prisma.voucherProduct.count({ where })
  ])
  const counts = await loadCodeCounts(records.map(({ id }) => id))
  return {
    vouchers: records.map((record) => toVoucherDto(record, counts.get(record.id))),
    pagination: { page: input.page, limit: input.limit, total }
  }
}

async function updateStatusAtomically(
  tx: Prisma.TransactionClient,
  voucher: VoucherRecord,
  nextStatus: VoucherStatus,
  extra: Prisma.VoucherProductUpdateManyMutationInput = {}
) {
  assertTransition(voucherTransitions, voucher.status, nextStatus, 'voucher')
  if (nextStatus === VoucherStatus.ON_SALE) {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM partners WHERE id = ${voucher.partnerId}::uuid FOR UPDATE`)
    const partner = await tx.partner.findUniqueOrThrow({ where: { id: voucher.partnerId } })
    if (partner.approvalStatus !== ApprovalStatus.APPROVED || partner.operatingStatus !== OperatingStatus.ACTIVE) {
      throw AppError.unprocessable('Đối tác sở hữu voucher chưa được duyệt hoặc đang bị khóa')
    }
  }
  const result = await tx.voucherProduct.updateMany({
    where: { id: voucher.id, status: voucher.status },
    data: { ...extra, status: nextStatus }
  })
  if (result.count !== 1) throw AppError.conflict('Trạng thái voucher đã thay đổi, vui lòng tải lại')
  return loadVoucherDto(voucher.id, tx)
}

export const voucherService = {
  async create(userId: string, input: CreateVoucherInput) {
    const partner = await getPartnerByOwner(userId)
    validateCompleteValues(input)
    return prisma.$transaction(async (tx) => {
      await validateRelations(tx, partner.id, input)
      const voucher = await tx.voucherProduct.create({
        data: {
          partnerId: partner.id,
          categoryId: input.categoryId ?? null,
          name: input.name,
          description: input.description,
          imageUrl: input.imageUrl ?? null,
          originalPrice: input.originalPrice,
          salePrice: input.salePrice,
          saleStart: new Date(input.saleStart),
          saleEnd: new Date(input.saleEnd),
          usageStart: new Date(input.usageStart),
          usageEnd: new Date(input.usageEnd),
          totalQuantity: input.totalQuantity,
          remainingQuantity: input.totalQuantity,
          isMultiUse: input.isMultiUse,
          usesPerCode: input.usesPerCode ?? null,
          voucherProductBranches: input.branchIds?.length
            ? { createMany: { data: input.branchIds.map((branchId) => ({ branchId })) } }
            : undefined
        }
      })
      return loadVoucherDto(voucher.id, tx)
    })
  },

  async listMine(userId: string, input: VoucherListInput) {
    const partner = await getPartnerByOwner(userId)
    const where = { partnerId: partner.id, ...(input.status && { status: input.status }) }
    return listVouchers(input, where, { createdAt: 'desc' })
  },

  async getMine(userId: string, voucherId: string) {
    const { voucher } = await getOwnedVoucher(userId, voucherId)
    const counts = await loadCodeCounts([voucher.id])
    return toVoucherDto(voucher, counts.get(voucher.id))
  },

  async update(userId: string, voucherId: string, input: UpdateVoucherInput) {
    const { partner, voucher } = await getOwnedVoucher(userId, voucherId)
    if (voucher.status !== VoucherStatus.DRAFT) throw AppError.unprocessable('Chỉ voucher bản nháp mới được chỉnh sửa')
    const values = {
      originalPrice: input.originalPrice ?? Number(voucher.originalPrice),
      salePrice: input.salePrice ?? Number(voucher.salePrice),
      saleStart: input.saleStart ?? voucher.saleStart,
      saleEnd: input.saleEnd ?? voucher.saleEnd,
      usageStart: input.usageStart ?? voucher.usageStart,
      usageEnd: input.usageEnd ?? voucher.usageEnd,
      totalQuantity: input.totalQuantity ?? voucher.totalQuantity,
      isMultiUse: input.isMultiUse ?? voucher.isMultiUse,
      usesPerCode: input.usesPerCode !== undefined ? input.usesPerCode : voucher.usesPerCode
    }
    validateCompleteValues(values)
    return prisma.$transaction(async (tx) => {
      await validateRelations(tx, partner.id, input)
      const updated = await tx.voucherProduct.updateMany({
        where: { id: voucherId, status: VoucherStatus.DRAFT },
        data: {
          categoryId: input.categoryId,
          name: input.name,
          description: input.description,
          imageUrl: input.imageUrl,
          originalPrice: input.originalPrice,
          salePrice: input.salePrice,
          saleStart: input.saleStart ? new Date(input.saleStart) : undefined,
          saleEnd: input.saleEnd ? new Date(input.saleEnd) : undefined,
          usageStart: input.usageStart ? new Date(input.usageStart) : undefined,
          usageEnd: input.usageEnd ? new Date(input.usageEnd) : undefined,
          totalQuantity: input.totalQuantity,
          remainingQuantity: input.totalQuantity,
          isMultiUse: input.isMultiUse,
          usesPerCode: input.usesPerCode
        }
      })
      if (updated.count !== 1) throw AppError.conflict('Voucher không còn là bản nháp')
      if (input.branchIds !== undefined) {
        await tx.voucherProductBranch.deleteMany({ where: { voucherProductId: voucherId } })
        if (input.branchIds.length) {
          await tx.voucherProductBranch.createMany({
            data: input.branchIds.map((branchId) => ({ voucherProductId: voucherId, branchId }))
          })
        }
      }
      return loadVoucherDto(voucherId, tx)
    })
  },

  async submit(userId: string, voucherId: string) {
    const { voucher } = await getOwnedVoucher(userId, voucherId)
    validateCanPublish(voucher)
    return prisma.$transaction((tx) =>
      updateStatusAtomically(tx, voucher, VoucherStatus.PENDING_REVIEW, { rejectReason: null })
    )
  },

  async returnToDraft(userId: string, voucherId: string) {
    const { voucher } = await getOwnedVoucher(userId, voucherId)
    return prisma.$transaction((tx) => updateStatusAtomically(tx, voucher, VoucherStatus.DRAFT))
  },

  async changeMineStatus(userId: string, voucherId: string, input: PartnerVoucherStatusInput) {
    const { voucher } = await getOwnedVoucher(userId, voucherId)
    const nextStatus = input.action === 'pause' ? VoucherStatus.PAUSED : VoucherStatus.ON_SALE
    if (nextStatus === VoucherStatus.ON_SALE) validateCanPublish(voucher)
    return prisma.$transaction((tx) => updateStatusAtomically(tx, voucher, nextStatus))
  },

  async listAdmin(input: VoucherListInput) {
    const where = input.status ? { status: input.status } : undefined
    return listVouchers(input, where, { updatedAt: 'desc' })
  },

  async review(voucherId: string, input: VoucherApprovalInput) {
    const voucher = await loadVoucher(voucherId)
    const nextStatus = input.action === 'approve' ? VoucherStatus.APPROVED : VoucherStatus.REJECTED
    if (input.action === 'approve') validateCanPublish(voucher)
    return prisma.$transaction((tx) =>
      updateStatusAtomically(tx, voucher, nextStatus, { rejectReason: input.action === 'reject' ? input.reason : null })
    )
  },

  async changeAdminStatus(voucherId: string, input: AdminVoucherStatusInput) {
    const voucher = await loadVoucher(voucherId)
    const nextStatus = {
      publish: VoucherStatus.ON_SALE,
      suspend: VoucherStatus.PAUSED,
      resume: VoucherStatus.ON_SALE,
      discontinue: VoucherStatus.DISCONTINUED
    }[input.action]
    if (nextStatus === VoucherStatus.ON_SALE) validateCanPublish(voucher)
    return prisma.$transaction((tx) => updateStatusAtomically(tx, voucher, nextStatus))
  }
}
