import { Decimal } from '@prisma/client/runtime/library'
import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import prisma from '../../configs/prisma'
import orderRoutes from './order.routes'

vi.mock('../../middlewares/authenticate', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { sub: 'cust-1', role: 'CUSTOMER', ver: 0 }
    next()
  }
}))
vi.mock('../../middlewares/authorize', () => ({ authorize: () => (_req: any, _res: any, next: any) => next() }))
vi.mock('../../configs/prisma', () => ({
  default: {
    cart: { findUnique: vi.fn() },
    cartItem: { deleteMany: vi.fn() },
    order: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    voucherProduct: { updateMany: vi.fn(), update: vi.fn() },
    issuedVoucherCode: { findUnique: vi.fn(), createManyAndReturn: vi.fn() },
    paymentTransaction: { create: vi.fn(), update: vi.fn() },
    $disconnect: vi.fn(),
    $transaction: vi.fn((callback) => callback(prismaMock))
  }
}))
const prismaMock = prisma as any
const app = express()
app.use(express.json())
app.use('/api/orders', orderRoutes)
app.use((err: any, _req: any, res: any, _next: any) =>
  res.status(err.statusCode || 500).json({ success: false, error: err.message, details: err.details })
)

describe('FLOW-003: Cart -> Order -> Payment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.$transaction.mockImplementation((callback: any) => callback(prismaMock))
    prismaMock.paymentTransaction.create.mockResolvedValue({ id: 'payment-1' })
    prismaMock.paymentTransaction.update.mockResolvedValue({ id: 'payment-1' })
  })
  it('creates an order and issues codes after successful payment', async () => {
    const usageEnd = new Date('2026-12-31T23:59:59.000Z')
    prismaMock.order.findMany.mockResolvedValue([])
    prismaMock.cart.findUnique.mockResolvedValue({
      id: 'cart-1',
      customerId: 'cust-1',
      cartItems: [
        {
          id: 1,
          voucherProductId: 'vp-1',
          quantity: 2,
          voucherProduct: {
            id: 'vp-1',
            name: 'Buffet',
            salePrice: new Decimal(200000),
            status: 'ON_SALE',
            remainingQuantity: 10
          }
        }
      ]
    })
    prismaMock.voucherProduct.updateMany.mockResolvedValue({ count: 1 })
    prismaMock.order.create.mockResolvedValue({
      id: 'order-1',
      customerId: 'cust-1',
      status: 'PENDING_PAYMENT',
      paymentMethod: 'SIMULATED',
      giftRecipient: null,
      totalAmount: new Decimal(400000),
      paidAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      orderItems: [
        {
          id: 10,
          voucherProductId: 'vp-1',
          quantity: 2,
          unitPrice: new Decimal(200000),
          voucherProduct: { name: 'Buffet' }
        }
      ]
    })
    const orderResponse = await request(app).post('/api/orders').send({ paymentMethod: 'SIMULATED' })
    expect(orderResponse.status).toBe(201)
    expect(orderResponse.body.data.status).toBe('PENDING_PAYMENT')

    prismaMock.order.findUnique.mockResolvedValue({
      id: 'order-1',
      customerId: 'cust-1',
      status: 'PENDING_PAYMENT',
      expiresAt: new Date(Date.now() + 60_000),
      orderItems: [
        {
          id: 10,
          quantity: 2,
          voucherProduct: {
            id: 'vp-1',
            name: 'Buffet',
            status: 'ON_SALE',
            remainingQuantity: 8,
            usageEnd,
            isMultiUse: false,
            usesPerCode: 1
          }
        }
      ]
    })
    prismaMock.issuedVoucherCode.findUnique.mockResolvedValue(null)
    prismaMock.issuedVoucherCode.createManyAndReturn.mockImplementation(({ data }: any) =>
      Promise.resolve(
        data.map((code: any) => ({
          code: code.code,
          voucherProductId: code.voucherProductId,
          status: code.status,
          expiresAt: code.expiresAt
        }))
      )
    )
    const paymentResponse = await request(app).post('/api/orders/order-1/payment').send({ outcome: 'SUCCESS' })
    expect(paymentResponse.status).toBe(200)
    expect(paymentResponse.body.data.status).toBe('PAID')
    expect(paymentResponse.body.data.codes).toHaveLength(2)
    expect(prismaMock.voucherProduct.updateMany).toHaveBeenCalledTimes(1)
    expect(prismaMock.issuedVoucherCode.createManyAndReturn).toHaveBeenCalledTimes(1)
  })
})
