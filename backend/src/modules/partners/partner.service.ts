import { ApprovalStatus, OperatingStatus, VoucherStatus, type Prisma } from '@prisma/client'
import { prisma } from '~/configs/prisma'
import { AppError } from '~/utils/app-error'

import type {
  BranchInput,
  PartnerApprovalInput,
  PartnerLockInput,
  RegisterPartnerInput,
  UpdatePartnerInput
} from './partner.validation'

async function findMyPartnerOrThrow(actorUserId: string) {
  const partner = await prisma.partner.findUnique({
    where: { ownerUserId: actorUserId },
    include: {
      branches: true
    }
  })

  if (!partner) {
    throw AppError.notFound('Partner profile')
  }

  return partner
}

export const partnerService = {
  async registerPartner(actorUserId: string, input: RegisterPartnerInput) {
    const user = await prisma.user.findUnique({
      where: { id: actorUserId }
    })

    if (!user) {
      throw AppError.notFound('User')
    }

    const existedPartner = await prisma.partner.findUnique({
      where: { ownerUserId: actorUserId }
    })

    if (existedPartner) {
      throw AppError.conflict('This user already has a partner profile')
    }

    return prisma.partner.create({
      data: {
        owner: {
          connect: { id: actorUserId }
        },
        legalName: input.legalName,
        taxCode: input.taxCode,
        representative: input.representative,
        approvalStatus: ApprovalStatus.PENDING,
        operatingStatus: OperatingStatus.ACTIVE,
        branches: input.branches?.length
          ? {
              create: input.branches.map((branch) => ({
                name: branch.name,
                address: branch.address,
                region: branch.region
              }))
            }
          : undefined
      },
      include: {
        branches: true
      }
    })
  },

  async getMyPartner(actorUserId: string) {
    return findMyPartnerOrThrow(actorUserId)
  },

  async updateMyPartner(actorUserId: string, input: UpdatePartnerInput) {
    const partner = await findMyPartnerOrThrow(actorUserId)

    return prisma.partner.update({
      where: { id: partner.id },
      data: {
        legalName: input.legalName,
        representative: input.representative
      },
      include: {
        branches: true
      }
    })
  },

  async createBranch(actorUserId: string, input: BranchInput) {
    const partner = await findMyPartnerOrThrow(actorUserId)

    return prisma.branch.create({
      data: {
        partner: {
          connect: { id: partner.id }
        },
        name: input.name,
        address: input.address,
        region: input.region
      }
    })
  },

  async updateBranch(actorUserId: string, branchId: number, input: BranchInput) {
    const partner = await findMyPartnerOrThrow(actorUserId)

    const branch = await prisma.branch.findFirst({
      where: {
        id: branchId,
        partnerId: partner.id
      }
    })

    if (!branch) {
      throw AppError.notFound('Branch')
    }

    return prisma.branch.update({
      where: { id: branchId },
      data: {
        name: input.name,
        address: input.address,
        region: input.region
      }
    })
  },

  async deleteBranch(actorUserId: string, branchId: number) {
    const partner = await findMyPartnerOrThrow(actorUserId)

    const branch = await prisma.branch.findFirst({
      where: {
        id: branchId,
        partnerId: partner.id
      }
    })

    if (!branch) {
      throw AppError.notFound('Branch')
    }

    await prisma.branch.delete({
      where: { id: branchId }
    })
  },

  async reviewPartner(partnerId: string, input: PartnerApprovalInput) {
    const partner = await prisma.partner.findUnique({
      where: { id: partnerId }
    })

    if (!partner) {
      throw AppError.notFound('Partner')
    }

    if (partner.approvalStatus !== ApprovalStatus.PENDING) {
      throw AppError.conflict('Only pending partner profiles can be reviewed')
    }

    if (input.action === 'approve') {
      return prisma.partner.update({
        where: { id: partnerId },
        data: {
          approvalStatus: ApprovalStatus.APPROVED,
          rejectReason: null
        }
      })
    }

    return prisma.partner.update({
      where: { id: partnerId },
      data: {
        approvalStatus: ApprovalStatus.REJECTED,
        rejectReason: input.rejectReason
      }
    })
  },

  async setPartnerOperatingStatus(partnerId: string, input: PartnerLockInput) {
    const partner = await prisma.partner.findUnique({
      where: { id: partnerId }
    })

    if (!partner) {
      throw AppError.notFound('Partner')
    }

    if (input.action === 'unlock') {
      return prisma.partner.update({
        where: { id: partnerId },
        data: {
          operatingStatus: OperatingStatus.ACTIVE
        }
      })
    }

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updatedPartner = await tx.partner.update({
        where: { id: partnerId },
        data: {
          operatingStatus: OperatingStatus.SUSPENDED
        }
      })

      await tx.voucherProduct.updateMany({
        where: {
          partnerId,
          status: VoucherStatus.ON_SALE
        },
        data: {
          status: VoucherStatus.PAUSED
        }
      })

      return updatedPartner
    })
  }
}
