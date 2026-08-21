import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import prisma from '../../configs/prisma'
import orderRoutes from './order.routes'
import * as orderService from './order.service'
import { createVNPayUrl, verifyVNPayReturn } from '../../utils/vnpay'

vi.mock('../../middlewares/authenticate', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { sub: 'customer-1', role: 'CUSTOMER', ver: 0 }
    next()
  }
}))
vi.mock('../../middlewares/authorize', () => ({
  authorize: () => (_req: any, _res: any, next: any) => next()
}))
vi.mock('./order.service', () => ({
  createOrder: vi.fn(),
  getMyOrders: vi.fn(),
  getOrderDetail: vi.fn(),
  processPayment: vi.fn(),
  cancelOrder: vi.fn()
}))
vi.mock('../../utils/vnpay', () => ({ createVNPayUrl: vi.fn(), verifyVNPayReturn: vi.fn() }))
vi.mock('../../configs/prisma', () => ({
  default: { order: { findUnique: vi.fn() }, $disconnect: vi.fn() }
}))

const prismaMock = prisma as any
const serviceMock = vi.mocked(orderService)
const createUrlMock = vi.mocked(createVNPayUrl)
const verifyReturnMock = vi.mocked(verifyVNPayReturn)
const app = express()
app.use(express.json())
app.use('/api/orders', orderRoutes)
app.use((err: any, _req: any, res: any, _next: any) => res.status(err.statusCode || 500).json({ error: err.message }))

describe('order controller routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  it('returns order list and order detail', async () => {
    serviceMock.getMyOrders.mockResolvedValue({ items: [], nextCursor: null })
    serviceMock.getOrderDetail.mockResolvedValue({ id: 'order-1' } as any)

    const list = await request(app).get('/api/orders?cursor=cursor-1&limit=5')
    const detail = await request(app).get('/api/orders/order-1')

    expect(list.status).toBe(200)
    expect(serviceMock.getMyOrders).toHaveBeenCalledWith('customer-1', 'cursor-1', 5)
    expect(detail.body.data.id).toBe('order-1')
  })

  it('creates VNPay URL and cancels an order', async () => {
    serviceMock.getOrderDetail.mockResolvedValue({ id: 'order-1', totalAmount: '125000' } as any)
    serviceMock.cancelOrder.mockResolvedValue({ message: 'cancelled' })
    createUrlMock.mockReturnValue('https://sandbox.example/payment')

    const paymentUrl = await request(app).get('/api/orders/order-1/vnpay').set('x-forwarded-for', '10.0.0.1')
    const cancelled = await request(app).post('/api/orders/order-1/cancel')

    expect(paymentUrl.body.data.url).toBe('https://sandbox.example/payment')
    expect(createUrlMock).toHaveBeenCalledWith(
      '10.0.0.1',
      expect.stringMatching(/^order-1_\d+$/),
      125000,
      'Thanh toan don hang order-1'
    )
    expect(cancelled.body.data.message).toBe('cancelled')
  })

  it('rejects an IPN with an invalid signature', async () => {
    verifyReturnMock.mockReturnValue(false)
    const response = await request(app).get('/api/orders/vnpay-ipn?vnp_TxnRef=order-1_123')
    expect(response.body).toEqual({ RspCode: '97', Message: 'Invalid signature' })
  })

  it('handles missing and already-confirmed IPN orders', async () => {
    verifyReturnMock.mockReturnValue(true)
    prismaMock.order.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ status: 'PAID' })

    const missing = await request(app).get('/api/orders/vnpay-ipn?vnp_TxnRef=missing_123')
    const confirmed = await request(app).get('/api/orders/vnpay-ipn?vnp_TxnRef=paid_123')

    expect(missing.body.RspCode).toBe('01')
    expect(confirmed.body.RspCode).toBe('02')
  })

  it.each([
    ['00', 'SUCCESS'],
    ['24', 'FAILURE']
  ])('processes response code %s as %s', async (responseCode, outcome) => {
    verifyReturnMock.mockReturnValue(true)
    prismaMock.order.findUnique.mockResolvedValue({ customerId: 'customer-1', status: 'PENDING_PAYMENT' })
    serviceMock.processPayment.mockResolvedValue({ orderId: 'order-1', status: 'PAID', codes: [] })

    const response = await request(app).get(
      `/api/orders/vnpay-ipn?vnp_TxnRef=order-1_123&vnp_ResponseCode=${responseCode}`
    )

    expect(response.body.RspCode).toBe('00')
    expect(serviceMock.processPayment).toHaveBeenCalledWith('customer-1', 'order-1', { outcome })
  })

  it('acknowledges an unexpected IPN processing error', async () => {
    verifyReturnMock.mockReturnValue(true)
    prismaMock.order.findUnique.mockRejectedValue(new Error('database unavailable'))
    const response = await request(app).get('/api/orders/vnpay-ipn?vnp_TxnRef=order-1_123')
    expect(response.body).toEqual({ RspCode: '99', Message: 'Unknown error' })
  })
})
