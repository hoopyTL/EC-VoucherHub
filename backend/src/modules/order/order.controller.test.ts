import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import prisma from '../../configs/prisma'
import orderRoutes from './order.routes'
import * as orderService from './order.service'
import { createVNPayUrl, verifyVNPayReturn } from '../../utils/vnpay'
import { createOnePayUrl, verifyOnePayReturn } from '../../utils/onepay'

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
vi.mock('../payment/payment.service', () => ({
  paymentService: {
    create: vi.fn().mockResolvedValue({ id: 'pay-tx-1' }),
    updateStatus: vi.fn()
  }
}))
vi.mock('../../utils/vnpay', () => ({ createVNPayUrl: vi.fn(), verifyVNPayReturn: vi.fn() }))
vi.mock('../../utils/onepay', () => ({
  createOnePayUrl: vi.fn(),
  verifyOnePayReturn: vi.fn(),
  restoreOrderIdFromTxnRef: (id: string) => id.split('_')[0]
}))
vi.mock('../../configs/prisma', () => ({
  default: {
    order: { findUnique: vi.fn() },
    paymentTransaction: { update: vi.fn() },
    $disconnect: vi.fn()
  }
}))

const prismaMock = prisma as any
const serviceMock = vi.mocked(orderService)
const createUrlMock = vi.mocked(createVNPayUrl)
const verifyReturnMock = vi.mocked(verifyVNPayReturn)
const createOnePayUrlMock = vi.mocked(createOnePayUrl)
const verifyOnePayReturnMock = vi.mocked(verifyOnePayReturn)
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
    expect(serviceMock.getMyOrders).toHaveBeenCalledWith('customer-1', 'cursor-1', 5, undefined)
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
    ['00', '00', 'SUCCESS'],
    ['24', '24', 'FAILURE']
  ])('processes response/status %s/%s as %s', async (responseCode, transactionStatus, outcome) => {
    verifyReturnMock.mockReturnValue(true)
    prismaMock.order.findUnique.mockResolvedValue({
      customerId: 'customer-1',
      status: 'PENDING_PAYMENT',
      totalAmount: '125000'
    })
    serviceMock.processPayment.mockResolvedValue({ orderId: 'order-1', status: 'PAID', codes: [] })

    const response = await request(app).get(
      `/api/orders/vnpay-ipn?vnp_TxnRef=order-1_123&vnp_ResponseCode=${responseCode}&vnp_TransactionStatus=${transactionStatus}&vnp_Amount=12500000`
    )

    expect(response.body.RspCode).toBe('00')
    expect(serviceMock.processPayment).toHaveBeenCalledWith('customer-1', 'order-1', { outcome })
  })

  it('rejects a signed VNPay callback whose amount does not match the exact order', async () => {
    verifyReturnMock.mockReturnValue(true)
    prismaMock.order.findUnique.mockResolvedValue({
      customerId: 'customer-1',
      status: 'PENDING_PAYMENT',
      totalAmount: '125000'
    })

    const response = await request(app).get(
      '/api/orders/vnpay-ipn?vnp_TxnRef=order-1_123&vnp_ResponseCode=00&vnp_TransactionStatus=00&vnp_Amount=1'
    )

    expect(response.body.RspCode).toBe('04')
    expect(serviceMock.processPayment).not.toHaveBeenCalled()
  })

  it('creates OnePay payment URL and persists transaction', async () => {
    serviceMock.getOrderDetail.mockResolvedValue({
      id: 'order-1',
      totalAmount: '150000',
      status: 'PENDING_PAYMENT'
    } as any)
    createOnePayUrlMock.mockReturnValue('https://mtf.onepay.vn/paygate/vpcpay.op?test=1')

    const response = await request(app).get('/api/orders/order-1/onepay')

    expect(response.status).toBe(200)
    expect(response.body.data.url).toBe('https://mtf.onepay.vn/paygate/vpcpay.op?test=1')
    expect(createOnePayUrlMock).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'order-1',
        amount: 150000
      })
    )
  })

  it('rejects an invalid OnePay IPN callback signature', async () => {
    verifyOnePayReturnMock.mockReturnValue(false)
    const response = await request(app).get('/api/orders/onepay-ipn?vpc_MerchTxnRef=order-1_123')
    expect(response.text).toBe('responsecode=1&desc=confirm-fail')
  })

  it('processes a successful OnePay IPN callback (vpc_TxnResponseCode=0)', async () => {
    verifyOnePayReturnMock.mockReturnValue(true)
    prismaMock.order.findUnique.mockResolvedValue({
      id: 'order-1',
      customerId: 'customer-1',
      status: 'PENDING_PAYMENT'
    })
    serviceMock.processPayment.mockResolvedValue({ orderId: 'order-1', status: 'PAID', codes: [] })

    const response = await request(app).get(
      '/api/orders/onepay-ipn?vpc_MerchTxnRef=order-1_123&vpc_TxnResponseCode=0&vpc_TransactionNo=999999'
    )

    expect(response.text).toBe('responsecode=0&desc=confirm-success')
    expect(serviceMock.processPayment).toHaveBeenCalledWith(
      'customer-1',
      'order-1',
      { outcome: 'SUCCESS' },
      expect.objectContaining({ gateway: 'ONEPAY', gatewayTransId: '999999' })
    )
  })
})
