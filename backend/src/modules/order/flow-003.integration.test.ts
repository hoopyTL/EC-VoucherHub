import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'

import cartRoutes from '../cart/cart.routes'
import orderRoutes from './order.routes'

// Hoisting mock for auth
vi.mock('../../middleware/auth', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.user = { id: 'cust-1', role: 'KHACH_HANG' }
    next()
  },
  requireRole: (role: string) => (req: any, res: any, next: any) => {
    if (req.user?.role === role) next()
    else res.status(403).json({ error: 'FORBIDDEN' })
  }
}))

// Hoisting mock for Prisma
vi.mock('../../configs/prisma', () => {
  return {
    default: {
      cart: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
      cartItem: { create: vi.fn(), deleteMany: vi.fn() },
      order: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
      voucherProduct: { findUnique: vi.fn(), update: vi.fn() },
      issuedVoucherCode: { findUnique: vi.fn(), create: vi.fn() },
      $transaction: vi.fn((cb) => cb(prismaMock)),
    }
  }
})
import prisma from '../../configs/prisma'
const prismaMock = prisma as any

const app = express()
app.use(express.json())
app.use('/api/cart', cartRoutes)
app.use('/api/orders', orderRoutes)

// Error handler middleware cho test
app.use((err: any, req: any, res: any, next: any) => {
  res.status(err.status || 500).json({ success: false, error: err.message, details: err.details })
})

describe('FLOW-003 Checkpoint: Cart -> Order -> Payment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Toàn bộ luồng mua sắm thành công (Thêm vào giỏ -> Đặt hàng -> Thanh toán sinh mã)', async () => {
    // --- BƯỚC 1: ĐẶT HÀNG TỪ GIỎ (Order Creation) ---
    // Mock prisma responses for createOrder
    const mockCart = {
      id: 'cart-1',
      customerId: 'cust-1',
      cartItems: [
        {
          id: 1, voucherProductId: 'vp-1', quantity: 2,
          voucherProduct: { id: 'vp-1', name: 'Buffet', salePrice: { mul: (q: number) => ({ add: (v: any) => v }) }, status: 'ON_SALE', remainingQuantity: 10 }
        }
      ]
    }
    
    // We override Decimal logic just roughly to avoid Prisma Decimal errors in mock
    import('@prisma/client/runtime/library').then(({ Decimal }) => {
      mockCart.cartItems[0].voucherProduct.salePrice = new Decimal(200000) as any;
    }).catch(() => {})

    prismaMock.cart.findUnique.mockResolvedValueOnce(mockCart)
    prismaMock.order.create.mockResolvedValueOnce({
      id: 'order-1',
      customerId: 'cust-1',
      status: 'PENDING_PAYMENT',
      paymentMethod: 'SIMULATED',
      totalAmount: 400000,
      createdAt: new Date(),
      updatedAt: new Date(),
      orderItems: [
        { id: 10, voucherProductId: 'vp-1', quantity: 2, unitPrice: 200000, voucherProduct: { name: 'Buffet' } }
      ]
    })

    const orderRes = await request(app)
      .post('/api/orders')
      .send({ paymentMethod: 'SIMULATED' })

    expect(orderRes.status).toBe(201)
    expect(orderRes.body.data.id).toBe('order-1')
    expect(orderRes.body.data.status).toBe('PENDING_PAYMENT')

    // --- BƯỚC 2: THANH TOÁN (Payment & Issuance) ---
    // Mock conditions for processPayment
    prismaMock.order.findUnique.mockResolvedValue({
      id: 'order-1',
      customerId: 'cust-1',
      status: 'PENDING_PAYMENT',
      orderItems: [
        { id: 10, quantity: 2, voucherProduct: { id: 'vp-1', name: 'Buffet', status: 'ON_SALE', remainingQuantity: 10, usageEnd: new Date(), isMultiUse: false, usesPerCode: 1 } }
      ]
    })

    prismaMock.voucherProduct.findUnique.mockResolvedValue({
      id: 'vp-1', name: 'Buffet', status: 'ON_SALE', remainingQuantity: 10
    })

    // No duplicate codes when generating
    prismaMock.issuedVoucherCode.findUnique.mockResolvedValue(null)
    
    // Auto return what was meant to be created
    prismaMock.issuedVoucherCode.create.mockImplementation(({ data }: any) => Promise.resolve({
      code: data.code, voucherProductId: data.voucherProductId, status: data.status, expiresAt: data.expiresAt
    }))

    const paymentRes = await request(app)
      .post('/api/orders/order-1/payment')
      .send({ outcome: 'SUCCESS' })

    expect(paymentRes.status).toBe(200)
    expect(paymentRes.body.data.status).toBe('PAID')
    expect(paymentRes.body.data.codes).toHaveLength(2)

    // Verify inventory deducted
    expect(prismaMock.voucherProduct.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'vp-1' },
      data: { remainingQuantity: { decrement: 2 } }
    }))
  })
})
