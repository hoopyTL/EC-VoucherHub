import { Decimal } from '@prisma/client/runtime/library'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import prisma from '../../configs/prisma'
import { ConflictError, ForbiddenError, ValidationError } from '../../middleware/error-handler'
import { createOrder, getOrderDetail, processPayment } from './order.service'

vi.mock('../../configs/prisma', () => ({
  default: {
    order: { findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    voucherProduct: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    issuedVoucherCode: { findUnique: vi.fn(), createManyAndReturn: vi.fn() },
    paymentTransaction: { create: vi.fn(), update: vi.fn() },
    cart: { findUnique: vi.fn() },
    cartItem: { deleteMany: vi.fn() },
    $disconnect: vi.fn(),
    $transaction: vi.fn((callback) => callback(prismaMock))
  }
}))
const prismaMock = prisma as any

describe('Order Service - Payment', () => {
  const customerId = 'cust-1'
  const orderId = 'order-1'
  const usageEnd = new Date('2026-12-31T23:59:59.000Z')
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.$transaction.mockImplementation((callback: any) => callback(prismaMock))
    prismaMock.paymentTransaction.create.mockResolvedValue({ id: 'payment-1' })
    prismaMock.paymentTransaction.update.mockResolvedValue({ id: 'payment-1' })
    prismaMock.order.findUnique.mockResolvedValue({
      id: orderId,
      customerId,
      status: 'PENDING_PAYMENT',
      expiresAt: new Date(Date.now() + 60_000),
      orderItems: [
        {
          id: 1,
          quantity: 2,
          voucherProduct: {
            id: 'vp-1',
            name: 'Voucher 1',
            status: 'ON_SALE',
            remainingQuantity: 8,
            usageEnd,
            isMultiUse: false,
            usesPerCode: 1
          }
        }
      ]
    })
  })
  it('does not issue codes when payment fails', async () => {
    expect(await processPayment(customerId, orderId, { outcome: 'FAILURE' })).toEqual({
      orderId,
      status: 'PENDING_PAYMENT',
      codes: []
    })
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })
  it('rejects an order owned by another customer', async () => {
    prismaMock.order.findUnique.mockResolvedValue({ customerId: 'other', status: 'PENDING_PAYMENT' })
    await expect(processPayment(customerId, orderId, { outcome: 'SUCCESS' })).rejects.toThrow(ForbiddenError)
  })
  it('rejects an order that is not pending payment', async () => {
    prismaMock.order.findUnique.mockResolvedValue({ customerId, status: 'PAID' })
    await expect(processPayment(customerId, orderId, { outcome: 'SUCCESS' })).rejects.toThrow(ConflictError)
  })
  it('rejects an expired pending order', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      customerId,
      status: 'PENDING_PAYMENT',
      expiresAt: new Date(Date.now() - 1)
    })
    await expect(processPayment(customerId, orderId, { outcome: 'SUCCESS' })).rejects.toThrow(ConflictError)
  })
  it('marks the order paid and bulk issues voucher codes', async () => {
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
    const result = await processPayment(customerId, orderId, { outcome: 'SUCCESS' })
    expect(prismaMock.issuedVoucherCode.createManyAndReturn.mock.calls[0][0].data).toHaveLength(2)
    expect(prismaMock.order.update).toHaveBeenCalledWith({
      where: { id: orderId },
      data: { status: 'PAID', paidAt: expect.any(Date) }
    })
    expect(prismaMock.voucherProduct.update).not.toHaveBeenCalled()
    expect(result.codes).toHaveLength(2)
    expect(result.codes[0].expiresAt).toBe(usageEnd.toISOString())
  })
})

describe('Order Service - getOrderDetail', () => {
  beforeEach(() => vi.clearAllMocks())
  it('rejects an order owned by another customer', async () => {
    prismaMock.order.findUnique.mockResolvedValue({ id: 'order-1', customerId: 'other' })
    await expect(getOrderDetail('cust-1', 'order-1')).rejects.toThrow(ForbiddenError)
  })
  it('hides issued codes before payment', async () => {
    prismaMock.order.findUnique.mockResolvedValue(orderRecord('PENDING_PAYMENT'))
    expect((await getOrderDetail('cust-1', 'order-1')).codes).toBeUndefined()
  })
  it('returns issued codes after payment', async () => {
    prismaMock.order.findUnique.mockResolvedValue(orderRecord('PAID'))
    expect((await getOrderDetail('cust-1', 'order-1')).codes).toHaveLength(1)
  })
})

describe('Order Service - createOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.$transaction.mockImplementation((callback: any) => callback(prismaMock))
  })
  it('reserves stock, creates an order and clears purchased cart items', async () => {
    prismaMock.order.findMany.mockResolvedValue([])
    prismaMock.cart.findUnique.mockResolvedValue(cartRecord(5))
    prismaMock.voucherProduct.updateMany.mockResolvedValue({ count: 1 })
    prismaMock.order.create.mockResolvedValue(orderRecord('PENDING_PAYMENT', false))
    const result = await createOrder('cust-1', {})
    expect(prismaMock.voucherProduct.updateMany).toHaveBeenCalledWith({
      where: { id: 'vp-1', remainingQuantity: { gte: 5 } },
      data: { remainingQuantity: { decrement: 5 } }
    })
    expect(prismaMock.cartItem.deleteMany).toHaveBeenCalledWith({ where: { id: { in: [1] } } })
    expect(result.status).toBe('PENDING_PAYMENT')
  })
  it('prevents holding more than ten units of one voucher', async () => {
    prismaMock.order.findMany.mockResolvedValue([{ orderItems: [{ voucherProductId: 'vp-1', quantity: 6 }] }])
    prismaMock.cart.findUnique.mockResolvedValue(cartRecord(5))
    await expect(createOrder('cust-1', {})).rejects.toThrow(ValidationError)
  })
})

function cartRecord(quantity: number) {
  return {
    id: 'cart-1',
    customerId: 'cust-1',
    cartItems: [
      {
        id: 1,
        quantity,
        voucherProductId: 'vp-1',
        voucherProduct: {
          id: 'vp-1',
          name: 'Voucher 1',
          status: 'ON_SALE',
          remainingQuantity: 100,
          salePrice: new Decimal(100)
        }
      }
    ]
  }
}
function orderRecord(status: string, includeCode = true) {
  return {
    id: 'order-1',
    customerId: 'cust-1',
    status,
    totalAmount: new Decimal(500),
    paymentMethod: 'SIMULATED',
    giftRecipient: null,
    paidAt: status === 'PAID' ? new Date() : null,
    createdAt: new Date(),
    updatedAt: new Date(),
    orderItems: [
      {
        id: 1,
        voucherProductId: 'vp-1',
        quantity: 5,
        unitPrice: new Decimal(100),
        voucherProduct: { name: 'Voucher 1' }
      }
    ],
    issuedVoucherCodes: includeCode
      ? [{ code: 'ABC123', voucherProductId: 'vp-1', status: 'UNUSED', expiresAt: new Date() }]
      : []
  }
}
