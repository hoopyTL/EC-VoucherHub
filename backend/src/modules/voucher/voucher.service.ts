import { ApprovalStatus, OperatingStatus, OrderStatus, Prisma, VoucherCodeStatus, VoucherStatus } from '@prisma/client'
import type { VoucherDto } from '@voucher/shared'
import fs from 'node:fs'
import path from 'node:path'

import prisma from '~/configs/prisma'
import { voucherTransitions } from '~/domain/transitions'
import { assertTransition } from '~/domain/state-machine'
import { AppError } from '~/utils/app-error'
import type {
  AdminVoucherStatusInput,
  CreateVoucherInput,
  PartnerVoucherStatusInput,
  PublicVoucherSearchInput,
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

function assertOwnedImage(imageUrl: string | null | undefined, partnerId: string): void {
  if (!imageUrl) return
  const expectedPrefix = `/uploads/vouchers/${partnerId}-`
  if (!imageUrl.startsWith(expectedPrefix)) {
    throw AppError.forbidden('Ảnh voucher không thuộc đối tác của bạn')
  }
  const filename = path.basename(imageUrl)
  const absolutePath = path.resolve(process.cwd(), 'uploads', 'vouchers', filename)
  if (!fs.existsSync(absolutePath)) {
    throw AppError.validation('Ảnh voucher không tồn tại hoặc đã bị xóa')
  }
}

function toVoucherDto(
  voucher: VoucherRecord,
  codeCounts: VoucherCodeCounts = emptyCodeCounts(),
  soldQuantity = 0
): VoucherDto {
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
    soldQuantity,
    ...codeCounts,
    createdAt: voucher.createdAt.toISOString(),
    updatedAt: voucher.updatedAt.toISOString()
  }
}

function toPublicVoucher(voucher: VoucherRecord, soldQuantity = 0) {
  const originalPrice = Number(voucher.originalPrice)
  const salePrice = Number(voucher.salePrice)
  return {
    id: voucher.id,
    title: voucher.name,
    description: voucher.description,
    category: voucher.category?.name ?? 'Chưa phân loại',
    originalPrice: voucher.originalPrice.toString(),
    salePrice: voucher.salePrice.toString(),
    totalQuantity: voucher.totalQuantity,
    soldQuantity,
    remainingQuantity: voucher.remainingQuantity,
    discountPercentage: Math.round(((originalPrice - salePrice) / originalPrice) * 100),
    salePeriodStart: voucher.saleStart.toISOString(),
    salePeriodEnd: voucher.saleEnd.toISOString(),
    usagePeriodStart: voucher.usageStart.toISOString(),
    usagePeriodEnd: voucher.usageEnd.toISOString(),
    terms: null,
    imageUrl: voucher.imageUrl,
    status: voucher.status,
    partnerId: voucher.partnerId,
    createdAt: voucher.createdAt.toISOString(),
    updatedAt: voucher.updatedAt.toISOString(),
    partner: { businessName: voucher.partner.legalName },
    voucherBranches: voucher.voucherProductBranches.map(({ branch, voucherProductId, branchId }) => ({
      id: `${voucherProductId}:${branchId}`,
      voucherId: voucherProductId,
      branchId: String(branchId),
      branch: {
        id: String(branch.id),
        name: branch.name,
        address: branch.address,
        region: branch.region,
        contact: '',
        isActive: branch.isActive
      }
    }))
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
    const count = await tx.branch.count({ where: { id: { in: input.branchIds }, partnerId, isActive: true } })
    if (count !== input.branchIds.length) {
      throw AppError.forbidden('Một hoặc nhiều chi nhánh nằm ngoài phạm vi đối tác hoặc đang ngừng hoạt động')
    }
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

/** Quantities from completed sales only; pending orders merely reserve inventory. */
async function loadPaidSoldQuantities(voucherIds: string[], tx: Prisma.TransactionClient = prisma) {
  const quantities = new Map(voucherIds.map((id) => [id, 0]))
  if (!voucherIds.length) return quantities

  const groups = await tx.orderItem.groupBy({
    by: ['voucherProductId'],
    where: {
      voucherProductId: { in: voucherIds },
      order: { status: OrderStatus.PAID }
    },
    _sum: { quantity: true }
  })
  for (const group of groups) quantities.set(group.voucherProductId, group._sum.quantity ?? 0)
  return quantities
}

async function loadVoucherDto(id: string, tx: Prisma.TransactionClient = prisma) {
  const voucher = await loadVoucher(id, tx)
  const [counts, soldQuantities] = await Promise.all([loadCodeCounts([id], tx), loadPaidSoldQuantities([id], tx)])
  return toVoucherDto(voucher, counts.get(id), soldQuantities.get(id))
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
  const voucherIds = records.map(({ id }) => id)
  const [counts, soldQuantities] = await Promise.all([loadCodeCounts(voucherIds), loadPaidSoldQuantities(voucherIds)])
  return {
    vouchers: records.map((record) => toVoucherDto(record, counts.get(record.id), soldQuantities.get(record.id))),
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
  async listExternal() {
    const records = await prisma.externalPromotion.findMany({ orderBy: { lastSeenAt: 'desc' }, take: 100 })
    return records.map((record) => ({
      ...record,
      originalPrice: record.originalPrice?.toString() ?? null,
      salePrice: record.salePrice?.toString() ?? null,
      saleStart: record.saleStart?.toISOString() ?? null,
      saleEnd: record.saleEnd?.toISOString() ?? null,
      checkoutAllowed: false
    }))
  },
  async searchPublic(input: PublicVoucherSearchInput) {
    const now = new Date()
    const where: Prisma.VoucherProductWhereInput = {
      status: VoucherStatus.ON_SALE,
      remainingQuantity: { gt: 0 },
      saleStart: { lte: now },
      saleEnd: { gte: now },
      ...(input.keyword && {
        OR: [
          { name: { contains: input.keyword, mode: 'insensitive' } },
          { description: { contains: input.keyword, mode: 'insensitive' } }
        ]
      }),
      ...(input.category && input.category !== 'Tất cả danh mục' && { category: { name: input.category } }),
      ...(input.region && { voucherProductBranches: { some: { branch: { region: input.region } } } }),
      ...(input.partnerId && { partnerId: input.partnerId }),
      ...((input.minPrice !== undefined || input.maxPrice !== undefined) && {
        salePrice: { gte: input.minPrice, lte: input.maxPrice }
      })
    }
    if (input.minDiscount === undefined) {
      // Let DB do pagination and counting when no minDiscount filter is present
      const [records, total] = await prisma.$transaction([
        prisma.voucherProduct.findMany({
          where,
          include: voucherInclude,
          orderBy: { createdAt: 'desc' },
          skip: (input.page - 1) * input.limit,
          take: input.limit
        }),
        prisma.voucherProduct.count({ where })
      ])
      const soldQuantities = await loadPaidSoldQuantities(records.map(({ id }) => id))
      return {
        vouchers: records.map((voucher) => toPublicVoucher(voucher, soldQuantities.get(voucher.id))),
        pagination: { page: input.page, limit: input.limit, total }
      }
    }

    // When minDiscount is provided, preserve existing in-memory filter semantics.
    const records = await prisma.voucherProduct.findMany({
      where,
      include: voucherInclude,
      orderBy: { createdAt: 'desc' }
    })
    const filtered = records.filter(
      (voucher) =>
        Math.round(
          ((Number(voucher.originalPrice) - Number(voucher.salePrice)) / Number(voucher.originalPrice)) * 100
        ) >= input.minDiscount!
    )
    const start = (input.page - 1) * input.limit
    const pageRecords = filtered.slice(start, start + input.limit)
    const soldQuantities = await loadPaidSoldQuantities(pageRecords.map(({ id }) => id))
    return {
      vouchers: pageRecords.map((voucher) => toPublicVoucher(voucher, soldQuantities.get(voucher.id))),
      pagination: { page: input.page, limit: input.limit, total: filtered.length }
    }
  },

  async getPublic(voucherId: string) {
    const now = new Date()
    const voucher = await prisma.voucherProduct.findFirst({
      where: {
        id: voucherId,
        status: VoucherStatus.ON_SALE,
        remainingQuantity: { gt: 0 },
        saleStart: { lte: now },
        saleEnd: { gte: now }
      },
      include: voucherInclude
    })
    if (!voucher) throw AppError.notFound('Voucher')
    const soldQuantities = await loadPaidSoldQuantities([voucher.id])
    return toPublicVoucher(voucher, soldQuantities.get(voucher.id))
  },

  async getPublicFilters() {
    const now = new Date()
    const vouchers = await prisma.voucherProduct.findMany({
      where: {
        status: VoucherStatus.ON_SALE,
        remainingQuantity: { gt: 0 },
        saleStart: { lte: now },
        saleEnd: { gte: now }
      },
      select: {
        category: { select: { name: true } },
        partner: { select: { id: true, legalName: true } },
        voucherProductBranches: { select: { branch: { select: { region: true } } } }
      }
    })
    return {
      categories: [...new Set(vouchers.flatMap((voucher) => (voucher.category ? [voucher.category.name] : [])))].sort(),
      regions: [
        ...new Set(vouchers.flatMap((voucher) => voucher.voucherProductBranches.map(({ branch }) => branch.region)))
      ].sort(),
      partners: [
        ...new Map(
          vouchers.map((voucher) => [voucher.partner.id, { id: voucher.partner.id, name: voucher.partner.legalName }])
        ).values()
      ].sort((a, b) => a.name.localeCompare(b.name, 'vi'))
    }
  },

  async create(userId: string, input: CreateVoucherInput) {
    const partner = await getPartnerByOwner(userId)
    validateCompleteValues(input)
    assertOwnedImage(input.imageUrl, partner.id)
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
    const [counts, soldQuantities] = await Promise.all([
      loadCodeCounts([voucher.id]),
      loadPaidSoldQuantities([voucher.id])
    ])
    return toVoucherDto(voucher, counts.get(voucher.id), soldQuantities.get(voucher.id))
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
    assertOwnedImage(input.imageUrl, partner.id)
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
    const where = input.status
      ? { status: input.status }
      : input.excludeStatus
        ? { status: { not: input.excludeStatus } }
        : undefined
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
