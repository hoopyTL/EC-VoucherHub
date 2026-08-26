import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import * as PaymentResultModule from './PaymentResultPage'
import * as orders from '../../services/orders'
import { api } from '../../services/api'

const { PaymentResultPage } = PaymentResultModule
const paidOrder = (id: string) =>
  ({ id, status: 'PAID', totalAmount: '150000', items: [], createdAt: '2026-08-26T00:00:00.000Z' }) as any

function renderWithUrl(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path='/payment-result' element={<PaymentResultPage />} />
        <Route path='/orders/:id' element={<div data-testid='completed-order-screen'>Hoàn tất</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('PaymentResultPage gateway confirmation', () => {
  beforeEach(() => vi.restoreAllMocks())
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('Stripe PAID immediately navigates to the existing completed order screen without a retry click', async () => {
    const id = '30be1486-aaaa-bbbb-cccc-123456789012'
    vi.spyOn(orders, 'getOrder').mockResolvedValue(paidOrder(id))
    renderWithUrl(`/payment-result?order_id=${id}&stripe_success=true&session_id=cs_test_123`)
    expect(await screen.findByTestId('completed-order-screen')).toBeDefined()
    expect(orders.getOrder).toHaveBeenCalledWith(id)
  })

  it('OnePay PAID immediately navigates to the existing completed order screen', async () => {
    const id = '30be1486-aaaa-bbbb-cccc-123456789012'
    vi.spyOn(api, 'get').mockResolvedValue({ data: 'responsecode=0' } as any)
    vi.spyOn(orders, 'getOrder').mockResolvedValue(paidOrder(id))
    renderWithUrl(`/payment-result?vpc_TxnResponseCode=0&vpc_MerchTxnRef=${id.replaceAll('-', '')}_123`)
    expect(await screen.findByTestId('completed-order-screen')).toBeDefined()
    expect(orders.getOrder).toHaveBeenCalledWith(id)
  })

  it('VNPay PAID verifies with the configured API client then immediately navigates to completion', async () => {
    const id = 'order-vnpay-1'
    const apiGet = vi.spyOn(api, 'get').mockResolvedValue({ data: { RspCode: '00' } } as any)
    vi.spyOn(orders, 'getOrder').mockResolvedValue(paidOrder(id))
    renderWithUrl(
      `/payment-result?vnp_TxnRef=${id}_123&vnp_ResponseCode=00&vnp_TransactionStatus=00&vnp_Amount=15000000&vnp_SecureHash=signed`
    )
    expect(await screen.findByTestId('completed-order-screen')).toBeDefined()
    expect(apiGet).toHaveBeenCalledWith(expect.stringContaining('/orders/vnpay-ipn'))
    expect(orders.getOrder).toHaveBeenCalledWith(id)
  })

  it('polls briefly while Stripe is pending then automatically completes once PAID', async () => {
    vi.spyOn(orders, 'getOrder')
      .mockResolvedValueOnce({ ...paidOrder('o2'), status: 'PENDING_PAYMENT' })
      .mockResolvedValueOnce(paidOrder('o2'))
    vi.spyOn(PaymentResultModule.paymentResultClock, 'scheduleTimeout').mockImplementation((callback: () => void) => {
      callback()
      return 1 as any
    })
    renderWithUrl('/payment-result?order_id=o2&stripe_success=true&session_id=cs_test_2')
    expect(await screen.findByTestId('completed-order-screen')).toBeDefined()
  })

  it('forged Stripe success query never completes when backend says the order is not paid', async () => {
    vi.spyOn(orders, 'getOrder').mockResolvedValue({ ...paidOrder('o4'), status: 'CANCELLED' })
    renderWithUrl('/payment-result?order_id=o4&stripe_success=true&session_id=forged')
    expect(await screen.findByText('Thanh toán chưa hoàn tất')).toBeDefined()
    expect(screen.queryByTestId('completed-order-screen')).toBeNull()
  })

  it('failed VNPay callback never completes or calls backend verification', async () => {
    const apiGet = vi.spyOn(api, 'get')
    renderWithUrl('/payment-result?vnp_TxnRef=o5_123&vnp_ResponseCode=00&vnp_TransactionStatus=24')
    expect(await screen.findByText('Thanh toán chưa hoàn tất')).toBeDefined()
    expect(apiGet).not.toHaveBeenCalled()
    expect(screen.queryByTestId('completed-order-screen')).toBeNull()
  })

  it('OnePay cancellation never requests /orders?limit=1', async () => {
    const apiGet = vi.spyOn(api, 'get').mockResolvedValue({ data: 'responsecode=1' } as any)
    renderWithUrl('/payment-result?vpc_TxnResponseCode=1&vpc_MerchTxnRef=o13_1')
    expect(await screen.findByText('Thanh toán chưa hoàn tất')).toBeDefined()
    expect(apiGet).not.toHaveBeenCalledWith(expect.stringContaining('/orders?limit=1'))
  })
})
