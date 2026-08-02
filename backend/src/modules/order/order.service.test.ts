import { describe, it, expect, vi, beforeEach } from 'vitest'
import { processPayment } from './order.service'
import { NotFoundError, ForbiddenError, ConflictError, ValidationError } from '../../middleware/error-handler'

// Hoisting mock module
vi.mock('../../configs/prisma', () => {
  return {
    default: {
      order: { findUnique: vi.fn(), update: vi.fn() },
      voucherProduct: { findUnique: vi.fn(), update: vi.fn() },
      issuedVoucherCode: { findUnique: vi.fn(), create: vi.fn() },
      $transaction: vi.fn((cb) => cb(prismaMock)),
    }
  }
})

import prisma from '../../configs/prisma'
const prismaMock = prisma as any

describe('Order Service - Payment', () => {
  const customerId = 'cust-1'
  const orderId = 'order-1'
  const dateStr = '2026-12-31T23:59:59.000Z'
  const usageEnd = new Date(dateStr)

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default valid mock for findUnique order
    prismaMock.order.findUnique.mockResolvedValue({
      id: orderId,
      customerId,
      status: 'PENDING_PAYMENT',
      orderItems: [
        {
          id: 1,
          quantity: 2,
          voucherProduct: {
            id: 'vp-1',
            name: 'Voucher 1',
            status: 'ON_SALE',
            remainingQuantity: 10,
            usageEnd,
            isMultiUse: false,
            usesPerCode: 1
          }
        }
      ]
    })
  })

  it('Thanh toán thất bại (FAILURE) -> không phát hành mã, giữ status', async () => {
    const result = await processPayment(customerId, orderId, { outcome: 'FAILURE' })
    expect(result.status).toBe('PENDING_PAYMENT')
    expect(result.codes).toHaveLength(0)
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it('Từ chối nếu đơn hàng không thuộc về customer', async () => {
    prismaMock.order.findUnique.mockResolvedValue({ customerId: 'other-cust', status: 'PENDING_PAYMENT' })
    await expect(processPayment(customerId, orderId, { outcome: 'SUCCESS' })).rejects.toThrow(ForbiddenError)
  })

  it('Từ chối nếu đơn hàng không phải PENDING_PAYMENT', async () => {
    prismaMock.order.findUnique.mockResolvedValue({ customerId, status: 'PAID' })
    await expect(processPayment(customerId, orderId, { outcome: 'SUCCESS' })).rejects.toThrow(ConflictError)
  })

  it('Thành công (SUCCESS) -> giao dịch nguyên tử sinh mã và trừ tồn kho', async () => {
    // Mock the fresh fetch of voucher inside transaction
    prismaMock.voucherProduct.findUnique.mockResolvedValue({
      id: 'vp-1',
      name: 'Voucher 1',
      status: 'ON_SALE',
      remainingQuantity: 10
    })

    prismaMock.issuedVoucherCode.findUnique.mockResolvedValue(null) // no collision
    prismaMock.issuedVoucherCode.create.mockImplementation(({ data }: any) => Promise.resolve({
      code: data.code,
      voucherProductId: data.voucherProductId,
      status: data.status,
      expiresAt: data.expiresAt
    }))

    const result = await processPayment(customerId, orderId, { outcome: 'SUCCESS' })
    
    expect(prismaMock.voucherProduct.update).toHaveBeenCalledWith({
      where: { id: 'vp-1' },
      data: { remainingQuantity: { decrement: 2 } }
    })
    expect(prismaMock.issuedVoucherCode.create).toHaveBeenCalledTimes(2)
    expect(prismaMock.order.update).toHaveBeenCalledWith({
      where: { id: orderId },
      data: { status: 'PAID', paidAt: expect.any(Date) }
    })
    
    expect(result.status).toBe('PAID')
    expect(result.codes).toHaveLength(2)
    expect(result.codes[0].expiresAt).toBe(usageEnd.toISOString())
  })

  it('Chống oversell (Hết hàng khi thanh toán) -> rollback qua ValidationError', async () => {
    // Mock inventory is less than requested quantity (2)
    prismaMock.voucherProduct.findUnique.mockResolvedValue({
      id: 'vp-1',
      name: 'Voucher 1',
      status: 'ON_SALE',
      remainingQuantity: 1 // only 1 left!
    })

    await expect(processPayment(customerId, orderId, { outcome: 'SUCCESS' })).rejects.toThrow(ValidationError)
    
    expect(prismaMock.voucherProduct.update).not.toHaveBeenCalled()
    expect(prismaMock.order.update).not.toHaveBeenCalled()
  })
})

describe('Order Service - getOrderDetail', () => {
  const customerId = 'cust-1'
  const orderId = 'order-1'
  
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Trả về lỗi 403 nếu đơn hàng không thuộc về customer', async () => {
    prismaMock.order.findUnique.mockResolvedValue({ id: orderId, customerId: 'other-cust' })
    await expect(import('./order.service').then(m => m.getOrderDetail(customerId, orderId))).rejects.toThrow(ForbiddenError)
  })

  it('Ẩn mảng codes nếu đơn hàng chưa PAID', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      id: orderId,
      customerId,
      status: 'PENDING_PAYMENT',
      totalAmount: { toFixed: () => '100.00' },
      paymentMethod: 'SIMULATED',
      giftRecipient: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      paidAt: null,
      orderItems: [],
      issuedVoucherCodes: [{ code: 'SECRET-CODE' }] // Giả lập lọt code
    })
    const m = await import('./order.service')
    const result = await m.getOrderDetail(customerId, orderId)
    expect(result.codes).toBeUndefined()
  })

  it('Trả về mảng codes nếu đơn hàng đã PAID', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      id: orderId,
      customerId,
      status: 'PAID',
      totalAmount: { toFixed: () => '200.00' },
      paymentMethod: 'SIMULATED',
      giftRecipient: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      paidAt: new Date(),
      orderItems: [],
      issuedVoucherCodes: [{ code: 'A1B2C3D4E5F6', voucherProductId: 'vp-1', status: 'UNUSED', expiresAt: new Date() }]
    })
    const m = await import('./order.service')
    const result = await m.getOrderDetail(customerId, orderId)
    expect(result.codes).toHaveLength(1)
    expect(result.codes![0].code).toBe('A1B2C3D4E5F6')
  })
})
