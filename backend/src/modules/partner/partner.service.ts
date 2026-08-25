import { ApprovalStatus, OperatingStatus, Prisma, VoucherStatus } from '@prisma/client'
import { RoleName } from '@voucher/shared'

import prisma from '~/configs/prisma'
import { AppError } from '~/utils/app-error'
import { hashPassword } from '~/utils/password'
import { getCompatibleRoleNames } from '~/utils/role'
import type {
  AdminCreatePartnerDto,
  AdminUpdatePartnerDto,
  ApprovalDto,
  BranchDto,
  OperatingStatusDto,
  PartnerListDto,
  RegisterPartnerDto,
  UpdateBranchDto,
  UpdatePartnerDto
} from './partner.validation'

const partnerInclude = {
  owner: { select: { email: true, phone: true, fullName: true } },
  branches: { orderBy: { id: 'asc' as const } }
}

async function findPartnerByOwner(userId: string) {
  const partner = await prisma.partner.findUnique({ where: { ownerUserId: userId }, include: partnerInclude })
  if (!partner) throw AppError.notFound('Hồ sơ đối tác')
  return partner
}

function mapUniqueConflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw AppError.conflict('Email, số điện thoại hoặc mã số thuế đã được sử dụng')
  }
  throw error
}

async function assertBranchOwnership(userId: string, branchId: number) {
  const partner = await findPartnerByOwner(userId)
  const branch = await prisma.branch.findUnique({ where: { id: branchId } })
  if (!branch) throw AppError.notFound('Chi nhánh')
  if (branch.partnerId !== partner.id) throw AppError.forbidden('Chi nhánh nằm ngoài phạm vi đối tác')
  return { partner, branch }
}

export const partnerService = {
  async createAsAdmin(dto: AdminCreatePartnerDto) {
    const created = await this.register(dto)
    return prisma.partner.update({
      where: { id: created.partner.id },
      data: {
        approvalStatus: ApprovalStatus.APPROVED,
        operatingStatus: dto.operatingStatus as OperatingStatus,
        businessCategory: dto.businessCategory,
        logoUrl: dto.logoUrl
      },
      include: partnerInclude
    })
  },

  async updateAsAdmin(partnerId: string, dto: AdminUpdatePartnerDto) {
    const partner = await prisma.partner.findUnique({ where: { id: partnerId }, select: { ownerUserId: true } })
    if (!partner) throw AppError.notFound('Hồ sơ đối tác')
    const { email, phone, ...profile } = dto
    try {
      return await prisma.$transaction(async (tx) => {
        if (email !== undefined || phone !== undefined) {
          await tx.user.update({
            where: { id: partner.ownerUserId },
            data: { ...(email !== undefined ? { email } : {}), ...(phone !== undefined ? { phone } : {}) }
          })
        }
        return tx.partner.update({ where: { id: partnerId }, data: profile, include: partnerInclude })
      })
    } catch (error) {
      return mapUniqueConflict(error)
    }
  },

  async deleteAsAdmin(partnerId: string) {
    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
      select: { ownerUserId: true, _count: { select: { voucherProducts: true, staff: true } } }
    })
    if (!partner) throw AppError.notFound('Hồ sơ đối tác')
    if (partner._count.voucherProducts > 0 || partner._count.staff > 0) {
      throw AppError.conflict('Đối tác đã có voucher hoặc nhân viên; hãy tạm khóa thay vì xóa')
    }
    await prisma.$transaction(async (tx) => {
      await tx.branch.deleteMany({ where: { partnerId } })
      await tx.partner.delete({ where: { id: partnerId } })
      await tx.user.delete({ where: { id: partner.ownerUserId } })
    })
  },

  async register(dto: RegisterPartnerDto) {
    const role = await prisma.role.findFirst({
      where: { name: { in: getCompatibleRoleNames(RoleName.PARTNER) } }
    })
    if (!role) throw AppError.internal('Vai trò PARTNER chưa được cấu hình')

    const passwordHash = await hashPassword(dto.password)
    try {
      return await prisma.$transaction(async (tx) => {
        const identifiers = [
          dto.email ? { email: dto.email } : undefined,
          dto.phone ? { phone: dto.phone } : undefined
        ].filter((value): value is { email: string } | { phone: string } => value !== undefined)
        if (await tx.user.findFirst({ where: { OR: identifiers }, select: { id: true } })) {
          throw AppError.conflict('Email hoặc số điện thoại đã được sử dụng')
        }
        if (await tx.partner.findUnique({ where: { taxCode: dto.taxCode }, select: { id: true } })) {
          throw AppError.conflict('Mã số thuế đã được sử dụng')
        }

        const user = await tx.user.create({
          data: {
            email: dto.email,
            phone: dto.phone,
            passwordHash,
            fullName: dto.representative,
            roleId: role.id
          }
        })
        const partner = await tx.partner.create({
          data: {
            ownerUserId: user.id,
            legalName: dto.legalName,
            taxCode: dto.taxCode,
            representative: dto.representative,
            businessCategory: dto.businessCategory,
            logoUrl: dto.logoUrl,
            branches: { create: dto.branches }
          },
          include: partnerInclude
        })
        return { user: { id: user.id, email: user.email, phone: user.phone, role: RoleName.PARTNER }, partner }
      })
    } catch (error) {
      return mapUniqueConflict(error)
    }
  },

  getMine(userId: string) {
    return findPartnerByOwner(userId)
  },

  async updateMine(userId: string, dto: UpdatePartnerDto) {
    const partner = await findPartnerByOwner(userId)
    try {
      return await prisma.partner.update({ where: { id: partner.id }, data: dto, include: partnerInclude })
    } catch (error) {
      return mapUniqueConflict(error)
    }
  },

  async listBranches(userId: string) {
    const partner = await findPartnerByOwner(userId)
    return partner.branches
  },

  async createBranch(userId: string, dto: BranchDto) {
    const partner = await findPartnerByOwner(userId)
    return prisma.branch.create({ data: { ...dto, partnerId: partner.id } })
  },

  async updateBranch(userId: string, branchId: number, dto: UpdateBranchDto) {
    await assertBranchOwnership(userId, branchId)
    return prisma.branch.update({ where: { id: branchId }, data: dto })
  },

  async deleteBranch(userId: string, branchId: number) {
    const { partner, branch } = await assertBranchOwnership(userId, branchId)
    const [linkedVouchers, usageLogs, globalVouchers, staffAssignments] = await Promise.all([
      prisma.voucherProductBranch.count({ where: { branchId } }),
      prisma.usageLog.count({ where: { branchId } }),
      prisma.voucherProduct.count({
        where: {
          partnerId: partner.id,
          status: {
            in: [VoucherStatus.PENDING_REVIEW, VoucherStatus.APPROVED, VoucherStatus.ON_SALE, VoucherStatus.PAUSED]
          },
          voucherProductBranches: { none: {} }
        }
      }),
      prisma.partnerStaffBranch.count({ where: { branchId } })
    ])
    if (linkedVouchers > 0 || usageLogs > 0 || globalVouchers > 0 || staffAssignments > 0) {
      throw AppError.conflict('Chi nhánh đang được sử dụng và không thể xóa')
    }
    await prisma.branch.delete({ where: { id: branch.id } })
  },

  async list(dto: PartnerListDto, pendingOnly = false) {
    const where: Prisma.PartnerWhereInput = {
      approvalStatus: pendingOnly ? ApprovalStatus.PENDING : dto.approvalStatus,
      operatingStatus: dto.operatingStatus,
      ...(dto.q
        ? {
            OR: [
              { legalName: { contains: dto.q, mode: 'insensitive' } },
              { taxCode: { contains: dto.q, mode: 'insensitive' } },
              { representative: { contains: dto.q, mode: 'insensitive' } },
              { owner: { email: { contains: dto.q, mode: 'insensitive' } } },
              { owner: { phone: { contains: dto.q } } }
            ]
          }
        : {})
    }
    const skip = (dto.page - 1) * dto.limit
    const [partners, total] = await prisma.$transaction([
      prisma.partner.findMany({
        where,
        include: partnerInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: dto.limit
      }),
      prisma.partner.count({ where })
    ])
    return { partners, pagination: { ...dto, total } }
  },

  async review(partnerId: string, dto: ApprovalDto) {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.partner.updateMany({
        where: { id: partnerId, approvalStatus: ApprovalStatus.PENDING },
        data: {
          approvalStatus: dto.action === 'approve' ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED,
          rejectReason: dto.action === 'reject' ? dto.reason : null
        }
      })
      if (updated.count === 0) {
        const exists = await tx.partner.findUnique({ where: { id: partnerId }, select: { id: true } })
        if (!exists) throw AppError.notFound('Hồ sơ đối tác')
        throw AppError.conflict('Hồ sơ đối tác không còn ở trạng thái chờ duyệt')
      }
      return tx.partner.findUniqueOrThrow({ where: { id: partnerId }, include: partnerInclude })
    })
  },

  async changeOperatingStatus(partnerId: string, dto: OperatingStatusDto) {
    const operatingStatus = dto.action === 'lock' ? OperatingStatus.SUSPENDED : OperatingStatus.ACTIVE
    return prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`SELECT id FROM partners WHERE id = ${partnerId}::uuid FOR UPDATE`
      )
      if (locked.length === 0) throw AppError.notFound('Hồ sơ đối tác')
      const updated = await tx.partner.update({
        where: { id: partnerId },
        data: { operatingStatus },
        include: partnerInclude
      })
      if (dto.action === 'lock') {
        await tx.voucherProduct.updateMany({
          where: { partnerId, status: VoucherStatus.ON_SALE },
          data: { status: VoucherStatus.PAUSED }
        })
      }
      return updated
    })
  },

  async updateBranchAsAdmin(partnerId: string, branchId: number, dto: UpdateBranchDto) {
    const branch = await prisma.branch.findUnique({ where: { id: branchId } })
    if (!branch) throw AppError.notFound('Chi nhánh')
    if (branch.partnerId !== partnerId) throw AppError.forbidden('Chi nhánh nằm ngoài phạm vi đối tác')
    return prisma.branch.update({ where: { id: branchId }, data: dto })
  }
}
