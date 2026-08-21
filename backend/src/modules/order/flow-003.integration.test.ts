import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { Prisma } from '@prisma/client'

import cartRoutes from '../cart/cart.routes'
import orderRoutes from './order.routes'

// Hoisting mock for auth
vi.mock('../../middlewares/authenticate', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { sub: 'cust-1', role: 'CUSTOMER' }
    next()
  }
}))
vi.mock('../../middlewares/authorize', () => ({ authorize: () => (_req: any, _res: any, next: any) => next() }))

// Hoisting mock for Prisma
vi.mock('../../configs/prisma', () => {
  return {
    default: {
      cart: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
      cartItem: { create: vi.fn(), deleteMany: vi.fn() },
      order: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
      voucherProduct: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
      issuedVoucherCode: { findUnique: vi.fn(), create: vi.fn(), createManyAndReturn: vi.fn() },
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
          voucherProduct: { id: 'vp-1', name: 'Buffet', salePrice: new Prisma.Decimal(200000), status: 'ON_SALE', remainingQuantity: 10 }
        }
      ]
    }
    
    prismaMock.cart.findUnique.mockResolvedValueOnce(mockCart)
    prismaMock.order.findMany.mockResolvedValue([])
    prismaMock.voucherProduct.updateMany.mockResolvedValue({ count: 1 })
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
    prismaMock.issuedVoucherCode.createManyAndReturn.mockImplementation(({ data }: any) =>
      Promise.resolve(data.map((code: any) => ({
        code: code.code,
        voucherProductId: code.voucherProductId,
        status: code.status,
        expiresAt: code.expiresAt
      })))
    )

    const paymentRes = await request(app)
      .post('/api/orders/order-1/payment')
      .send({ outcome: 'SUCCESS' })

    expect(paymentRes.status).toBe(200)
    expect(paymentRes.body.data.status).toBe('PAID')
    expect(paymentRes.body.data.codes).toHaveLength(2)

    // Inventory was reserved atomically during order creation, not deducted twice at payment.
    expect(prismaMock.voucherProduct.updateMany).toHaveBeenCalled()
  })
})
