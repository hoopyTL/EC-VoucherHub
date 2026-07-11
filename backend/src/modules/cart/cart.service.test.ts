import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

// Hoisting mock module
vi.mock('../../configs/prisma', () => {
  return {
    default: {
      cart: { findUnique: vi.fn(), create: vi.fn() },
      cartItem: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn(), delete: vi.fn() },
      voucherProduct: { findUnique: vi.fn() },
    }
  }
})

// Chú ý import prisma sau khi setup mock
import prisma from '../../configs/prisma'
import * as cartService from './cart.service'
import { NotFoundError, ValidationError } from '../../middleware/error-handler'

const prismaMock = prisma as any

describe('Cart Service', () => {
  const customerId = 'customer-1'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCart', () => {
    it('sẽ trả về giỏ hàng nếu đã tồn tại', async () => {
      const mockDate = new Date()
      // Setup mock
      prismaMock.cart.findUnique.mockResolvedValue({
        id: 'cart-1',
        customerId,
        updatedAt: mockDate,
        createdAt: mockDate,
        cartItems: [
          {
            id: 1,
            cartId: 'cart-1',
            voucherProductId: 'vp-1',
            quantity: 2,
            createdAt: mockDate,
            updatedAt: mockDate,
            voucherProduct: {
              name: 'Voucher 1',
              salePrice: new Decimal(100),
            }
          }
        ]
      } as any)

      const result = await cartService.getCart(customerId)

      expect(prismaMock.cart.findUnique).toHaveBeenCalledWith({
        where: { customerId },
        include: expect.any(Object)
      })
      expect(result.items).toHaveLength(1)
      expect(result.subtotal).toBe('200.00')
    })
  })

  describe('addItem', () => {
    it('ném lỗi NotFoundError nếu voucher không tồn tại', async () => {
      prismaMock.voucherProduct.findUnique.mockResolvedValue(null)

      await expect(cartService.addItem(customerId, { voucherProductId: 'vp-1', quantity: 1 }))
        .rejects
        .toThrow(NotFoundError)
    })

    it('ném lỗi ValidationError nếu voucher không đang bán', async () => {
      prismaMock.voucherProduct.findUnique.mockResolvedValue({
        id: 'vp-1',
        status: 'PAUSED',
      } as any)

      await expect(cartService.addItem(customerId, { voucherProductId: 'vp-1', quantity: 1 }))
        .rejects
        .toThrow(ValidationError)
    })
  })
})
