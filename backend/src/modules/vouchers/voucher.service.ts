import { ApprovalStatus, OperatingStatus, VoucherStatus } from '@prisma/client'

import type { CreateVoucherDto, UpdateVoucherDto } from '@voucher/shared'

import prisma from '~/configs/prisma'
import { voucherTransitions } from '~/domain/transitions'
import { AppError } from '~/utils/app-error'

async function getApprovedPartnerByOwner(userId: string) {
  const partner = await prisma.partner.findUnique({
    where: {
      ownerUserId: userId
    }
  })

  if (!partner) {
    throw AppError.notFound('Không tìm thấy đối tác')
  }

  if (partner.approvalStatus !== ApprovalStatus.APPROVED) {
    throw AppError.forbidden('Đối tác chưa được phê duyệt')
  }

  if (partner.operatingStatus !== OperatingStatus.ACTIVE) {
    throw AppError.forbidden('Đối tác hiện không hoạt động')
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
      voucherProductBranches: {
        include: {
          branch: true
        }
      }
    }
  })

  if (!voucher) {
    throw AppError.notFound('Không tìm thấy voucher')
  }

  if (voucher.partnerId !== partner.id) {
    throw AppError.forbidden('Voucher không thuộc đối tác này')
  }

  return {
    partner,
    voucher
  }
}

async function validateCategory(categoryId?: number | null) {
  if (categoryId == null) {
    return
  }

  const category = await prisma.category.findUnique({
    where: {
      id: categoryId
    }
  })

  if (!category) {
    throw AppError.validation('Không tìm thấy danh mục')
  }
}

async function validateBranches(partnerId: string, branchIds?: number[]) {
  if (!branchIds?.length) {
    return
  }

  const branches = await prisma.branch.findMany({
    where: {
      id: {
        in: branchIds
      },
      partnerId
    },
    select: {
      id: true
    }
  })

  if (branches.length !== branchIds.length) {
    throw AppError.validation('Một hoặc nhiều chi nhánh không hợp lệ')
  }
}

function validateVoucherValues(input: {
  originalPrice: number
  salePrice: number

  saleStart: string | Date
  saleEnd: string | Date

  usageStart: string | Date
  usageEnd: string | Date

  isMultiUse: boolean
  usesPerCode?: number | null
}) {
  if (input.salePrice >= input.originalPrice) {
    throw AppError.unprocessable('Giá bán phải thấp hơn giá gốc')
  }

  if (new Date(input.saleStart) >= new Date(input.saleEnd)) {
    throw AppError.unprocessable('Thời gian kết thúc bán phải sau thời gian bắt đầu bán')
  }

  if (new Date(input.usageStart) >= new Date(input.usageEnd)) {
    throw AppError.unprocessable('Thời gian kết thúc sử dụng phải sau thời gian bắt đầu sử dụng')
  }

  if (input.isMultiUse && !input.usesPerCode) {
    throw AppError.unprocessable('Voucher nhiều lượt phải có số lượt sử dụng cho mỗi mã')
  }

  if (!input.isMultiUse && input.usesPerCode != null) {
    throw AppError.unprocessable('Voucher một lượt không được đặt số lượt sử dụng cho mỗi mã')
  }
}

function assertTransition(currentStatus: VoucherStatus, nextStatus: VoucherStatus) {
  const allowed = voucherTransitions[currentStatus]

  if (!allowed || !allowed.includes(nextStatus)) {
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

export async function createVoucher(userId: string, input: CreateVoucherDto) {
  const partner = await getApprovedPartnerByOwner(userId)

  await validateCategory(input.categoryId)

  await validateBranches(partner.id, input.branchIds)

  validateVoucherValues(input)

  return prisma.$transaction(async (tx) => {
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

        status: VoucherStatus.DRAFT
      }
    })

    if (input.branchIds?.length) {
      await tx.voucherProductBranch.createMany({
        data: input.branchIds.map((branchId) => ({
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

export async function updateVoucher(userId: string, voucherId: string, input: UpdateVoucherDto) {
  const { partner, voucher } = await getOwnedVoucher(userId, voucherId)

  if (voucher.status !== VoucherStatus.DRAFT) {
    throw AppError.unprocessable('Chỉ có thể cập nhật voucher ở trạng thái bản nháp')
  }

  await validateCategory(input.categoryId)

  await validateBranches(partner.id, input.branchIds)

  const originalPrice = input.originalPrice ?? Number(voucher.originalPrice)

  const salePrice = input.salePrice ?? Number(voucher.salePrice)

  const saleStart = input.saleStart ?? voucher.saleStart

  const saleEnd = input.saleEnd ?? voucher.saleEnd

  const usageStart = input.usageStart ?? voucher.usageStart

  const usageEnd = input.usageEnd ?? voucher.usageEnd

  const isMultiUse = input.isMultiUse ?? voucher.isMultiUse

  const usesPerCode = input.usesPerCode !== undefined ? input.usesPerCode : voucher.usesPerCode

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

        remainingQuantity: input.totalQuantity !== undefined ? input.totalQuantity : undefined,

        isMultiUse: input.isMultiUse,

        usesPerCode: input.usesPerCode
      }
    })

    if (input.branchIds !== undefined) {
      await tx.voucherProductBranch.deleteMany({
        where: {
          voucherProductId: voucherId
        }
      })

      if (input.branchIds.length) {
        await tx.voucherProductBranch.createMany({
          data: input.branchIds.map((branchId) => ({
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
    throw AppError.notFound('Không tìm thấy voucher')
  }

  const nextStatus = action === 'approve' ? VoucherStatus.APPROVED : VoucherStatus.REJECTED

  assertTransition(voucher.status, nextStatus)

  if (action === 'reject' && !reason) {
    throw AppError.validation('Lý do từ chối là bắt buộc')
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
    throw AppError.notFound('Không tìm thấy voucher')
  }

  const nextStatusMap = {
    publish: VoucherStatus.ON_SALE,

    suspend: VoucherStatus.PAUSED,

    unpublish: VoucherStatus.DISCONTINUED
  }

  const nextStatus = nextStatusMap[action]

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
