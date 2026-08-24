import { RoleName, type RoleName as RoleNameValue } from '@voucher/shared'
import prisma from '~/configs/prisma'
import { AppError } from '~/utils/app-error'
import type { CreateReviewDto, UpdateReviewDto, VoucherReviewQueryDto } from './review.validation'

export const reviewService = {
  /**
   * Tạo đánh giá cho voucher.
   * Yêu cầu: Khách hàng đã mua (đơn hàng PAID) hoặc đã sử dụng voucher này (FR-10 / RB-10).
   */
  async createReview(customerId: string, input: CreateReviewDto) {
    // 1. Kiểm tra điều kiện đủ tư cách đánh giá (đã có đơn hàng PAID chứa voucher này)
    let order = null
    if (input.orderId) {
      order = await prisma.order.findFirst({
        where: {
          id: input.orderId,
          customerId,
          status: 'PAID',
          orderItems: { some: { voucherProductId: input.voucherProductId } }
        }
      })
    } else {
      order = await prisma.order.findFirst({
        where: {
          customerId,
          status: 'PAID',
          orderItems: { some: { voucherProductId: input.voucherProductId } }
        },
        orderBy: { createdAt: 'desc' }
      })
    }

    if (!order) {
      throw AppError.forbidden(
        'Bạn chỉ có thể đánh giá voucher sau khi đã mua và thanh toán thành công đơn hàng chứa voucher này (FR-10).'
      )
    }

    // 2. Kiểm tra chưa gửi đánh giá trước đó (1 review duy nhất per customer per voucher)
    const existing = await prisma.review.findUnique({
      where: {
        customerId_voucherProductId: {
          customerId,
          voucherProductId: input.voucherProductId
        }
      }
    })

    if (existing) {
      throw AppError.conflict('Bạn đã gửi đánh giá cho voucher này rồi.')
    }

    // 3. Tạo bản ghi review
    const review = await prisma.review.create({
      data: {
        customerId,
        voucherProductId: input.voucherProductId,
        orderId: order.id,
        rating: input.rating,
        comment: input.comment?.trim() || null
      },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true
          }
        },
        voucherProduct: {
          select: {
            id: true,
            name: true,
            imageUrl: true
          }
        }
      }
    })

    return review
  },

  /**
   * Lấy danh sách đánh giá của voucher kèm thống kê điểm trung bình và phân bố sao.
   */
  async getVoucherReviews(voucherProductId: string, query: VoucherReviewQueryDto) {
    const page = Math.max(1, query.page || 1)
    const limit = Math.max(1, Math.min(50, query.limit || 10))
    const skip = (page - 1) * limit

    const [total, reviews, ratingGroups] = await Promise.all([
      prisma.review.count({
        where: { voucherProductId }
      }),
      prisma.review.findMany({
        where: { voucherProductId },
        include: {
          customer: {
            select: {
              id: true,
              fullName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.review.groupBy({
        by: ['rating'],
        where: { voucherProductId },
        _count: { rating: true }
      })
    ])

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    let totalScore = 0

    for (const group of ratingGroups) {
      distribution[group.rating] = group._count.rating
      totalScore += group.rating * group._count.rating
    }

    const averageRating = total > 0 ? Number((totalScore / total).toFixed(1)) : 0

    return {
      reviews,
      summary: {
        averageRating,
        totalReviews: total,
        distribution
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  },

  /**
   * Lấy danh sách đánh giá do chính khách hàng hiện tại gửi.
   */
  async getMyReviews(customerId: string) {
    return prisma.review.findMany({
      where: { customerId },
      include: {
        voucherProduct: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            originalPrice: true,
            salePrice: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  },

  /**
   * Lấy danh sách các voucher mà khách hàng đã mua nhưng chưa đánh giá.
   */
  async getEligibleVouchers(customerId: string) {
    const paidOrderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          customerId,
          status: 'PAID'
        },
        voucherProduct: {
          reviews: {
            none: {
              customerId
            }
          }
        }
      },
      select: {
        orderId: true,
        voucherProductId: true,
        voucherProduct: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            salePrice: true
          }
        }
      },
      distinct: ['voucherProductId'],
      orderBy: { orderId: 'desc' }
    })

    return paidOrderItems.map((item) => ({
      orderId: item.orderId,
      voucher: item.voucherProduct
    }))
  },

  /**
   * Cập nhật đánh giá (chỉ người tạo đánh giá mới có quyền).
   */
  async updateReview(reviewId: string, customerId: string, input: UpdateReviewDto) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId }
    })

    if (!review) {
      throw AppError.notFound('Đánh giá')
    }

    if (review.customerId !== customerId) {
      throw AppError.forbidden('Bạn không có quyền chỉnh sửa đánh giá này.')
    }

    return prisma.review.update({
      where: { id: reviewId },
      data: {
        ...(input.rating !== undefined ? { rating: input.rating } : {}),
        ...(input.comment !== undefined ? { comment: input.comment?.trim() || null } : {})
      },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true
          }
        },
        voucherProduct: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })
  },

  /**
   * Xóa đánh giá (chính khách hàng hoặc ADMIN).
   */
  async deleteReview(reviewId: string, customerId: string, role: RoleNameValue) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId }
    })

    if (!review) {
      throw AppError.notFound('Đánh giá')
    }

    if (role !== RoleName.ADMIN && review.customerId !== customerId) {
      throw AppError.forbidden('Bạn không có quyền xóa đánh giá này.')
    }

    await prisma.review.delete({
      where: { id: reviewId }
    })

    return { success: true }
  }
}
