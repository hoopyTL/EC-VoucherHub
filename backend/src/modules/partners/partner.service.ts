import { ApprovalStatus, OperatingStatus, Prisma } from '@prisma/client'
import type { CreateBranchDto, CreatePartnerDto, UpdateBranchDto, UpdatePartnerDto } from '@voucher/shared'

import prisma from '~/configs/prisma'
import { AppError } from '~/utils/app-error'

export class PartnerService {
  async registerPartner(userId: string, data: CreatePartnerDto) {
    const existingPartner = await prisma.partner.findUnique({
      where: { ownerUserId: userId }
    })

    if (existingPartner) {
      throw AppError.conflict('User already has a partner profile')
    }

    const duplicateTaxCode = await prisma.partner.findUnique({
      where: { taxCode: data.taxCode }
    })

    if (duplicateTaxCode) {
      throw AppError.conflict('Tax code already exists')
    }

    try {
      return await prisma.partner.create({
        data: {
          ownerUserId: userId,
          legalName: data.legalName,
          taxCode: data.taxCode,
          representative: data.representative
        }
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw AppError.conflict('Partner profile already exists')
      }

      throw error
    }
  }

  async getPartnerByOwner(userId: string) {
    const partner = await prisma.partner.findUnique({
      where: { ownerUserId: userId },
      include: {
        branches: true
      }
    })

    if (!partner) {
      throw AppError.notFound('Partner')
    }

    return partner
  }

  async updatePartner(userId: string, data: UpdatePartnerDto) {
    const partner = await this.getPartnerByOwner(userId)

    if (data.taxCode && data.taxCode !== partner.taxCode) {
      const duplicateTaxCode = await prisma.partner.findUnique({
        where: { taxCode: data.taxCode }
      })

      if (duplicateTaxCode) {
        throw AppError.conflict('Tax code already exists')
      }
    }

    return prisma.partner.update({
      where: { id: partner.id },
      data
    })
  }

  async listBranches(userId: string) {
    const partner = await this.getPartnerByOwner(userId)
    return partner.branches
  }

  async addBranch(userId: string, data: CreateBranchDto) {
    const partner = await this.getPartnerByOwner(userId)

    return prisma.branch.create({
      data: {
        partnerId: partner.id,
        name: data.name,
        address: data.address,
        region: data.region
      }
    })
  }

  async updateBranch(userId: string, branchId: number, data: UpdateBranchDto) {
    const partner = await this.getPartnerByOwner(userId)

    const branch = await prisma.branch.findUnique({
      where: { id: branchId }
    })

    if (!branch) {
      throw AppError.notFound('Branch')
    }

    if (branch.partnerId !== partner.id) {
      throw AppError.forbidden('Branch is outside partner scope')
    }

    return prisma.branch.update({
      where: { id: branchId },
      data
    })
  }

  async deleteBranch(userId: string, branchId: number) {
    const partner = await this.getPartnerByOwner(userId)

    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      include: {
        _count: {
          select: {
            voucherProductBranches: true,
            usageLogs: true
          }
        }
      }
    })

    if (!branch) {
      throw AppError.notFound('Branch')
    }

    if (branch.partnerId !== partner.id) {
      throw AppError.forbidden('Branch is outside partner scope')
    }

    const activeVoucherUsingBranch = await prisma.voucherProduct.count({
      where: {
        partnerId: partner.id,
        status: {
          in: ['PENDING_REVIEW', 'APPROVED', 'ON_SALE', 'PAUSED']
        },
        OR: [
          {
            voucherProductBranches: {
              some: { branchId }
            }
          },
          {
            // An empty branch list means the voucher applies to every branch
            // owned by this partner.
            voucherProductBranches: {
              none: {}
            }
          }
        ]
      }
    })

    if (branch._count.voucherProductBranches > 0 || activeVoucherUsingBranch > 0) {
      throw AppError.conflict('Branch is being used by one or more vouchers and cannot be deleted')
    }

    if (branch._count.usageLogs > 0) {
      throw AppError.conflict('Branch has voucher usage history and cannot be deleted')
    }

    await prisma.branch.delete({
      where: { id: branchId }
    })
  }

  async reviewPartner(partnerId: string, action: 'approve' | 'reject', reason?: string) {
    const partner = await prisma.partner.findUnique({
      where: { id: partnerId }
    })

    if (!partner) {
      throw AppError.notFound('Partner')
    }

    if (partner.approvalStatus !== ApprovalStatus.PENDING) {
      throw AppError.conflict('Partner is not pending approval')
    }

    if (action === 'reject' && !reason) {
      throw AppError.badRequest('Reject reason is required')
    }

    return prisma.partner.update({
      where: { id: partnerId },
      data: {
        approvalStatus: action === 'approve' ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED,
        rejectReason: action === 'reject' ? reason : null
      }
    })
  }

  async listPendingPartners(page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const where = { approvalStatus: ApprovalStatus.PENDING }
    const [partners, total] = await prisma.$transaction([
      prisma.partner.findMany({
        where,
        include: { owner: true, branches: true },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit
      }),
      prisma.partner.count({ where })
    ])
    return { partners, page, limit, total }
  }

  async listPartners(page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const [partners, total] = await prisma.$transaction([
      prisma.partner.findMany({
        include: { owner: true, branches: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.partner.count()
    ])
    return { partners, page, limit, total }
  }

  async updateBranchAsAdmin(partnerId: string, branchId: number, data: UpdateBranchDto) {
    const branch = await prisma.branch.findUnique({ where: { id: branchId } })
    if (!branch) throw AppError.notFound('Branch')
    if (branch.partnerId !== partnerId) throw AppError.forbidden('Branch is outside partner scope')
    return prisma.branch.update({ where: { id: branchId }, data })
  }

  async changeOperatingStatus(partnerId: string, action: 'lock' | 'unlock') {
    const partner = await prisma.partner.findUnique({
      where: { id: partnerId }
    })

    if (!partner) {
      throw AppError.notFound('Partner')
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.partner.update({
        where: { id: partnerId },
        data: {
          operatingStatus: action === 'lock' ? OperatingStatus.SUSPENDED : OperatingStatus.ACTIVE
        }
      })

      if (action === 'lock') {
        await tx.voucherProduct.updateMany({
          where: { partnerId, status: 'ON_SALE' },
          data: { status: 'PAUSED' }
        })
      }

      return updated
    })
  }
}

export const partnerService = new PartnerService()
