import { ApprovalStatus, OperatingStatus, VoucherStatus } from '@prisma/client'

import prisma from '~/configs/prisma'
import { voucherTransitions } from '~/domain/transitions'
import { AppError } from '~/utils/app-error'

import type { CreateVoucherInput, UpdateVoucherInput } from './voucher.schema'

async function getApprovedPartnerByOwner(userId: string) {
  const partner = await prisma.partner.findUnique({
    where: {
      ownerUserId: userId
    }
  })

  if (!partner) {
    throw AppError.notFound('Partner')
  }

  if (partner.approvalStatus !== ApprovalStatus.APPROVED) {
    throw AppError.forbidden('Partner has not been approved')
  }

  if (partner.operatingStatus !== OperatingStatus.ACTIVE) {
    throw AppError.forbidden('Partner is suspended')
  }

  return partner
}

async function getOwnedVoucher(userId: string, voucherId: string) {
  const partner = await getApprovedPartnerByOwner(userId)

  const voucher = await prisma.voucherProduct.findUnique({
    where: {
      id: voucherId
    },
    include: {
      voucherProductBranches: true
    }
  })

  if (!voucher) {
    throw AppError.notFound('Voucher')
  }

  if (voucher.partnerId !== partner.id) {
    throw AppError.forbidden('Voucher does not belong to this partner')
  }

  return {
    partner,
    voucher
  }
}

async function validateCategory(categoryId?: number | null) {
  if (categoryId === undefined || categoryId === null) {
    return
  }

  const category = await prisma.category.findUnique({
    where: {
      id: categoryId
    }
  })

  if (!category) {
    throw AppError.notFound('Category')
  }
}

async function validateBranches(partnerId: string, branchIds?: number[]) {
  if (!branchIds || branchIds.length === 0) {
    return
  }

  const uniqueBranchIds = [...new Set(branchIds)]

  const branches = await prisma.branch.findMany({
    where: {
      id: {
        in: uniqueBranchIds
      },
      partnerId
    },
    select: {
      id: true
    }
  })

  if (branches.length !== uniqueBranchIds.length) {
    throw AppError.badRequest('One or more branches do not belong to this partner')
  }
}

function validateVoucherValues(data: {
  originalPrice: number
  salePrice: number
  saleStart: Date
  saleEnd: Date
  usageStart: Date
  usageEnd: Date
  isMultiUse: boolean
  usesPerCode: number | null
}) {
  if (data.salePrice >= data.originalPrice) {
    throw AppError.unprocessable('salePrice must be less than originalPrice')
  }

  if (data.saleStart >= data.saleEnd) {
    throw AppError.unprocessable('saleEnd must be after saleStart')
  }

  if (data.usageStart >= data.usageEnd) {
    throw AppError.unprocessable('usageEnd must be after usageStart')
  }

  if (data.isMultiUse && !data.usesPerCode) {
    throw AppError.unprocessable('usesPerCode is required for multi-use voucher')
  }

  if (!data.isMultiUse && data.usesPerCode) {
    throw AppError.unprocessable('usesPerCode is only allowed for multi-use voucher')
  }
}

function assertTransition(currentStatus: VoucherStatus, nextStatus: VoucherStatus) {
  const allowed = voucherTransitions[currentStatus]

  if (!allowed.includes(nextStatus)) {
    throw AppError.unprocessable(`Cannot change voucher status from ${currentStatus} to ${nextStatus}`)
  }
}

export async function getPartnerBranches(userId: string) {
  const partner = await getApprovedPartnerByOwner(userId)

  return prisma.branch.findMany({
    where: {
      partnerId: partner.id
    },
    orderBy: {
      id: 'asc'
    }
  })
}

export async function createVoucher(userId: string, data: CreateVoucherInput) {
  const partner = await getApprovedPartnerByOwner(userId)

  await validateCategory(data.categoryId)
  await validateBranches(partner.id, data.branchIds)

  validateVoucherValues({
    originalPrice: data.originalPrice,
    salePrice: data.salePrice,
    saleStart: new Date(data.saleStart),
    saleEnd: new Date(data.saleEnd),
    usageStart: new Date(data.usageStart),
    usageEnd: new Date(data.usageEnd),
    isMultiUse: data.isMultiUse,
    usesPerCode: data.usesPerCode ?? null
  })

  return prisma.$transaction(async (tx) => {
    const voucher = await tx.voucherProduct.create({
      data: {
        partnerId: partner.id,
        categoryId: data.categoryId ?? null,
        name: data.name,
        description: data.description,
        imageUrl: data.imageUrl ?? null,
        originalPrice: data.originalPrice,
        salePrice: data.salePrice,
        saleStart: new Date(data.saleStart),
        saleEnd: new Date(data.saleEnd),
        usageStart: new Date(data.usageStart),
        usageEnd: new Date(data.usageEnd),
        totalQuantity: data.totalQuantity,
        remainingQuantity: data.totalQuantity,
        isMultiUse: data.isMultiUse,
        usesPerCode: data.usesPerCode ?? null,
        status: VoucherStatus.DRAFT
      }
    })

    if (data.branchIds && data.branchIds.length > 0) {
      const uniqueBranchIds = [...new Set(data.branchIds)]

      await tx.voucherProductBranch.createMany({
        data: uniqueBranchIds.map((branchId) => ({
          voucherProductId: voucher.id,
          branchId
        }))
      })
    }

    return tx.voucherProduct.findUnique({
      where: {
        id: voucher.id
      },
      include: {
        category: true,
        voucherProductBranches: {
          include: {
            branch: true
          }
        }
      }
    })
  })
}

export async function getPartnerVouchers(userId: string) {
  const partner = await getApprovedPartnerByOwner(userId)

  return prisma.voucherProduct.findMany({
    where: {
      partnerId: partner.id
    },
    include: {
      category: true,
      voucherProductBranches: {
        include: {
          branch: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })
}

export async function updateVoucher(userId: string, voucherId: string, data: UpdateVoucherInput) {
  const { partner, voucher } = await getOwnedVoucher(userId, voucherId)

  if (voucher.status !== VoucherStatus.DRAFT) {
    throw AppError.unprocessable('Only draft voucher can be updated')
  }

  await validateCategory(data.categoryId)
  await validateBranches(partner.id, data.branchIds)

  const originalPrice = data.originalPrice ?? Number(voucher.originalPrice)

  const salePrice = data.salePrice ?? Number(voucher.salePrice)

  const saleStart = data.saleStart ? new Date(data.saleStart) : voucher.saleStart

  const saleEnd = data.saleEnd ? new Date(data.saleEnd) : voucher.saleEnd

  const usageStart = data.usageStart ? new Date(data.usageStart) : voucher.usageStart

  const usageEnd = data.usageEnd ? new Date(data.usageEnd) : voucher.usageEnd

  const isMultiUse = data.isMultiUse ?? voucher.isMultiUse

  const usesPerCode = data.usesPerCode !== undefined ? data.usesPerCode : voucher.usesPerCode

  validateVoucherValues({
    originalPrice,
    salePrice,
    saleStart,
    saleEnd,
    usageStart,
    usageEnd,
    isMultiUse,
    usesPerCode
  })

  return prisma.$transaction(async (tx) => {
    await tx.voucherProduct.update({
      where: {
        id: voucherId
      },
      data: {
        categoryId: data.categoryId,
        name: data.name,
        description: data.description,
        imageUrl: data.imageUrl,
        originalPrice: data.originalPrice,
        salePrice: data.salePrice,
        saleStart: data.saleStart ? new Date(data.saleStart) : undefined,
        saleEnd: data.saleEnd ? new Date(data.saleEnd) : undefined,
        usageStart: data.usageStart ? new Date(data.usageStart) : undefined,
        usageEnd: data.usageEnd ? new Date(data.usageEnd) : undefined,
        totalQuantity: data.totalQuantity,
        remainingQuantity: data.totalQuantity !== undefined ? data.totalQuantity : undefined,
        isMultiUse: data.isMultiUse,
        usesPerCode: data.usesPerCode
      }
    })

    if (data.branchIds !== undefined) {
      await tx.voucherProductBranch.deleteMany({
        where: {
          voucherProductId: voucherId
        }
      })

      const uniqueBranchIds = [...new Set(data.branchIds)]

      if (uniqueBranchIds.length > 0) {
        await tx.voucherProductBranch.createMany({
          data: uniqueBranchIds.map((branchId) => ({
            voucherProductId: voucherId,
            branchId
          }))
        })
      }
    }

    return tx.voucherProduct.findUnique({
      where: {
        id: voucherId
      },
      include: {
        category: true,
        voucherProductBranches: {
          include: {
            branch: true
          }
        }
      }
    })
  })
}

export async function submitVoucher(userId: string, voucherId: string) {
  const { voucher } = await getOwnedVoucher(userId, voucherId)

  assertTransition(voucher.status, VoucherStatus.PENDING_REVIEW)

  return prisma.voucherProduct.update({
    where: {
      id: voucherId
    },
    data: {
      status: VoucherStatus.PENDING_REVIEW,
      rejectReason: null
    }
  })
}

export async function returnRejectedVoucherToDraft(userId: string, voucherId: string) {
  const { voucher } = await getOwnedVoucher(userId, voucherId)

  assertTransition(voucher.status, VoucherStatus.DRAFT)

  return prisma.voucherProduct.update({
    where: {
      id: voucherId
    },
    data: {
      status: VoucherStatus.DRAFT
    }
  })
}

export async function reviewVoucher(voucherId: string, action: 'approve' | 'reject', reason?: string) {
  const voucher = await prisma.voucherProduct.findUnique({
    where: {
      id: voucherId
    }
  })

  if (!voucher) {
    throw AppError.notFound('Voucher')
  }

  const nextStatus = action === 'approve' ? VoucherStatus.APPROVED : VoucherStatus.REJECTED

  assertTransition(voucher.status, nextStatus)

  if (action === 'reject' && !reason) {
    throw AppError.badRequest('Reject reason is required')
  }

  return prisma.voucherProduct.update({
    where: {
      id: voucherId
    },
    data: {
      status: nextStatus,
      rejectReason: action === 'reject' ? reason : null
    }
  })
}

export async function changeVoucherStatus(voucherId: string, action: 'publish' | 'suspend' | 'unpublish') {
  const voucher = await prisma.voucherProduct.findUnique({
    where: {
      id: voucherId
    }
  })

  if (!voucher) {
    throw AppError.notFound('Voucher')
  }

  let nextStatus: VoucherStatus

  if (action === 'publish') {
    nextStatus = VoucherStatus.ON_SALE
  } else if (action === 'suspend') {
    nextStatus = VoucherStatus.PAUSED
  } else {
    nextStatus = VoucherStatus.DISCONTINUED
  }

  assertTransition(voucher.status, nextStatus)

  return prisma.voucherProduct.update({
    where: {
      id: voucherId
    },
    data: {
      status: nextStatus
    }
  })
}
