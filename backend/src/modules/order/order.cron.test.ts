import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import prisma from '../../configs/prisma'
import { startOrderCleanupCron } from './order.cron'

vi.mock('../../configs/prisma', () => ({
  default: {
    order: { findMany: vi.fn(), delete: vi.fn() },
    voucherProduct: { update: vi.fn() },
    cart: { findUnique: vi.fn(), create: vi.fn() },
    cartItem: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
    orderItem: { deleteMany: vi.fn() },
    $disconnect: vi.fn(),
    $transaction: vi.fn((callback) => callback(prismaMock))
  }
}))

const prismaMock = prisma as any
const expiredOrder = {
  id: 'order-1',
  customerId: 'customer-1',
  orderItems: [{ id: 1, voucherProductId: 'voucher-1', quantity: 2 }]
}

describe('order cleanup cron', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    prismaMock.$transaction.mockImplementation((callback: any) => callback(prismaMock))
    vi.spyOn(console, 'log').mockImplementation(() => undefined)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('does nothing when no pending order has expired', async () => {
    prismaMock.order.findMany.mockResolvedValue([])
    startOrderCleanupCron()

    await vi.advanceTimersByTimeAsync(60_000)

    expect(prismaMock.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'PENDING_PAYMENT' }) })
    )
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it('restores stock, merges an existing cart item and deletes the expired order', async () => {
    prismaMock.order.findMany.mockResolvedValue([expiredOrder])
    prismaMock.cart.findUnique.mockResolvedValue({ id: 'cart-1' })
    prismaMock.cartItem.findUnique.mockResolvedValue({ id: 10, quantity: 3 })
    startOrderCleanupCron()

    await vi.advanceTimersByTimeAsync(60_000)

    expect(prismaMock.voucherProduct.update).toHaveBeenCalledWith({
      where: { id: 'voucher-1' },
      data: { remainingQuantity: { increment: 2 } }
    })
    expect(prismaMock.cartItem.update).toHaveBeenCalledWith({ where: { id: 10 }, data: { quantity: 5 } })
    expect(prismaMock.orderItem.deleteMany).toHaveBeenCalledWith({ where: { orderId: 'order-1' } })
    expect(prismaMock.order.delete).toHaveBeenCalledWith({ where: { id: 'order-1' } })
  })

  it('creates a cart and cart item when neither exists', async () => {
    prismaMock.order.findMany.mockResolvedValue([expiredOrder])
    prismaMock.cart.findUnique.mockResolvedValue(null)
    prismaMock.cart.create.mockResolvedValue({ id: 'new-cart' })
    prismaMock.cartItem.findUnique.mockResolvedValue(null)
    startOrderCleanupCron()

    await vi.advanceTimersByTimeAsync(60_000)

    expect(prismaMock.cart.create).toHaveBeenCalledWith({ data: { customerId: 'customer-1' } })
    expect(prismaMock.cartItem.create).toHaveBeenCalledWith({
      data: { cartId: 'new-cart', voucherProductId: 'voucher-1', quantity: 2 }
    })
  })

  it('isolates a failed order transaction and reports a failed scan', async () => {
    prismaMock.order.findMany.mockResolvedValueOnce([expiredOrder]).mockRejectedValueOnce(new Error('scan failed'))
    prismaMock.$transaction.mockRejectedValueOnce(new Error('transaction failed'))
    startOrderCleanupCron()

    await vi.advanceTimersByTimeAsync(60_000)
    await vi.advanceTimersByTimeAsync(60_000)

    expect(console.error).toHaveBeenCalledTimes(2)
  })
})
