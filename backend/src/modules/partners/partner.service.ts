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

  async updatePartner(userId: string, data: UpdatePartnerInput) {
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
      where: { id: branchId }
    })

    if (!branch) {
      throw AppError.notFound('Branch')
    }

    if (branch.partnerId !== partner.id) {
      throw AppError.forbidden('Branch is outside partner scope')
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

  async changeOperatingStatus(partnerId: string, action: 'lock' | 'unlock') {
    const partner = await prisma.partner.findUnique({
      where: { id: partnerId }
    })

    if (!partner) {
      throw AppError.notFound('Partner')
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
