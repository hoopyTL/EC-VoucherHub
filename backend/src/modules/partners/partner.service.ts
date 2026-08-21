import { ApprovalStatus, OperatingStatus, Prisma } from '@prisma/client'

import prisma from '~/configs/prisma'
import { AppError } from '~/utils/app-error'

import type { CreateBranchInput, CreatePartnerInput, UpdateBranchInput, UpdatePartnerInput } from './partner.schema'

export class PartnerService {
  async registerPartner(userId: string, data: CreatePartnerInput) {
    const existingPartner = await prisma.partner.findUnique({
      where: { ownerUserId: userId }
    })

    if (existingPartner) {
      throw AppError.conflict('Người dùng đã có hồ sơ đối tác')
    }

    const duplicateTaxCode = await prisma.partner.findUnique({
      where: { taxCode: data.taxCode }
    })

    if (duplicateTaxCode) {
      throw AppError.conflict('Mã số thuế đã tồn tại')
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
        throw AppError.conflict('Hồ sơ đối tác đã tồn tại')
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
      throw AppError.notFound('Không tìm thấy đối tác')
    }

    return partner
  }

  async updatePartner(userId: string, data: UpdatePartnerInput) {
    const partner = await this.getPartnerByOwner(userId)

    if (data.taxCode && data.taxCode !== partner.taxCode) {
      const duplicateTaxCode = await prisma.partner.findUnique({
        where: { taxCode: data.taxCode }
      })

      if (duplicateTaxCode) {
        throw AppError.conflict('Mã số thuế đã tồn tại')
      }
    }

    return prisma.partner.update({
      where: { id: partner.id },
      data
    })
  }

  async addBranch(userId: string, data: CreateBranchInput) {
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

  async updateBranch(userId: string, branchId: number, data: UpdateBranchInput) {
    const partner = await this.getPartnerByOwner(userId)

    const branch = await prisma.branch.findUnique({
      where: { id: branchId }
    })

    if (!branch) {
      throw AppError.notFound('Không tìm thấy chi nhánh')
    }

    if (branch.partnerId !== partner.id) {
      throw AppError.forbidden('Chi nhánh không thuộc phạm vi đối tác')
    }

    return prisma.branch.update({
      where: { id: branchId },
      data
    })
  }

  async deleteBranch(userId: string, branchId: number) {
    const partner = await this.getPartnerByOwner(userId)

    const branch = await prisma.branch.findUnique({
      where: { id: branchId }
    })

    if (!branch) {
      throw AppError.notFound('Không tìm thấy chi nhánh')
    }

    if (branch.partnerId !== partner.id) {
      throw AppError.forbidden('Chi nhánh không thuộc phạm vi đối tác')
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
      throw AppError.notFound('Không tìm thấy đối tác')
    }

    if (partner.approvalStatus !== ApprovalStatus.PENDING) {
      throw AppError.conflict('Đối tác không ở trạng thái chờ duyệt')
    }

    if (action === 'reject' && !reason) {
      throw AppError.badRequest('Lý do từ chối là bắt buộc')
    }

    return prisma.partner.update({
      where: { id: partnerId },
      data: {
        approvalStatus: action === 'approve' ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED,
        rejectReason: action === 'reject' ? reason : null
      }
    })
  }

  async changeOperatingStatus(partnerId: string, action: 'lock' | 'unlock') {
    const partner = await prisma.partner.findUnique({
      where: { id: partnerId }
    })

    if (!partner) {
      throw AppError.notFound('Không tìm thấy đối tác')
    }

    return prisma.partner.update({
      where: { id: partnerId },
      data: {
        operatingStatus: action === 'lock' ? OperatingStatus.SUSPENDED : OperatingStatus.ACTIVE
      }
    })
  }
}

export const partnerService = new PartnerService()
