import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RoleName } from '@voucher/shared'

vi.mock('~/configs/prisma', () => {
  return {
    default: {
      order: { findFirst: vi.fn() },
      orderItem: { findMany: vi.fn() },
      review: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        groupBy: vi.fn()
      },
      $disconnect: vi.fn()
    }
  }
})

import prisma from '~/configs/prisma'
import { reviewService } from './review.service'
import { AppError } from '~/utils/app-error'

const prismaMock = prisma as any

describe('Review Service', () => {
  const customerId = 'c0000000-0000-0000-0000-000000000001'
  const voucherProductId = 'v0000000-0000-0000-0000-000000000001'
  const orderId = 'o0000000-0000-0000-0000-000000000001'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createReview', () => {
    it('từ chối khi khách hàng chưa từng mua hoặc thanh toán voucher (FR-10)', async () => {
      prismaMock.order.findFirst.mockResolvedValue(null)

      await expect(
        reviewService.createReview(customerId, {
          voucherProductId,
          rating: 5,
          comment: 'Voucher rất tốt'
        })
      ).rejects.toThrow(AppError)
    })

    it('từ chối khi khách hàng đã từng đánh giá voucher này trước đó (1 review per voucher)', async () => {
      prismaMock.order.findFirst.mockResolvedValue({ id: orderId, status: 'PAID' })
      prismaMock.review.findUnique.mockResolvedValue({ id: 'r-1', customerId, voucherProductId })

      await expect(
        reviewService.createReview(customerId, {
          voucherProductId,
          rating: 4
        })
      ).rejects.toThrow(AppError)
    })

    it('tạo đánh giá thành công khi đủ điều kiện', async () => {
      prismaMock.order.findFirst.mockResolvedValue({ id: orderId, status: 'PAID' })
      prismaMock.review.findUnique.mockResolvedValue(null)
      prismaMock.review.create.mockResolvedValue({
        id: 'r-new',
        customerId,
        voucherProductId,
        orderId,
        rating: 5,
        comment: 'Dịch vụ tuyệt vời!',
        createdAt: new Date(),
        customer: { id: customerId, fullName: 'Nguyen Van A' }
      })

      const review = await reviewService.createReview(customerId, {
        voucherProductId,
        rating: 5,
        comment: 'Dịch vụ tuyệt vời!'
      })

      expect(prismaMock.review.create).toHaveBeenCalledTimes(1)
      expect(review.rating).toBe(5)
      expect(review.comment).toBe('Dịch vụ tuyệt vời!')
    })
  })

  describe('getVoucherReviews', () => {
    it('tính toán đúng điểm trung bình và phân bố sao', async () => {
      prismaMock.review.count.mockResolvedValue(4)
      prismaMock.review.findMany.mockResolvedValue([
        { id: '1', rating: 5, comment: 'Tot' },
        { id: '2', rating: 5, comment: 'Ok' },
        { id: '3', rating: 4, comment: 'Tam duoc' },
        { id: '4', rating: 3, comment: 'Binh thuong' }
      ])
      prismaMock.review.groupBy.mockResolvedValue([
        { rating: 5, _count: { rating: 2 } },
        { rating: 4, _count: { rating: 1 } },
        { rating: 3, _count: { rating: 1 } }
      ])

      const result = await reviewService.getVoucherReviews(voucherProductId, { page: 1, limit: 10 })

      expect(result.summary.totalReviews).toBe(4)
      // (5*2 + 4*1 + 3*1) / 4 = 17 / 4 = 4.25 -> 4.3
      expect(result.summary.averageRating).toBe(4.3)
      expect(result.summary.distribution[5]).toBe(2)
      expect(result.summary.distribution[4]).toBe(1)
      expect(result.summary.distribution[3]).toBe(1)
      expect(result.summary.distribution[1]).toBe(0)
    })
  })

  describe('updateReview', () => {
    it('từ chối khi người dùng không phải là chủ nhân của đánh giá', async () => {
      prismaMock.review.findUnique.mockResolvedValue({
        id: 'r-1',
        customerId: 'other-user'
      })

      await expect(reviewService.updateReview('r-1', customerId, { rating: 3 })).rejects.toThrow(AppError)
    })
  })

  describe('deleteReview', () => {
    it('cho phép ADMIN xóa đánh giá bất kỳ', async () => {
      prismaMock.review.findUnique.mockResolvedValue({
        id: 'r-1',
        customerId: 'other-user'
      })
      prismaMock.review.delete.mockResolvedValue({ id: 'r-1' })

      const result = await reviewService.deleteReview('r-1', 'admin-id', RoleName.ADMIN)
      expect(result.success).toBe(true)
      expect(prismaMock.review.delete).toHaveBeenCalledWith({ where: { id: 'r-1' } })
    })

    it('từ chối khi khách hàng xóa đánh giá của người khác', async () => {
      prismaMock.review.findUnique.mockResolvedValue({
        id: 'r-1',
        customerId: 'other-user'
      })

      await expect(reviewService.deleteReview('r-1', customerId, RoleName.CUSTOMER)).rejects.toThrow(AppError)
    })
  })
})
