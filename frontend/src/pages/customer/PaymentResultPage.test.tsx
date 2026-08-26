import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { act } from 'react'
import { MemoryRouter } from 'react-router-dom'
import * as PaymentResultModule from './PaymentResultPage'
const { PaymentResultPage } = PaymentResultModule
import * as orders from '../../services/orders'
import { api } from '../../services/api'

function renderWithUrl(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <PaymentResultPage />
    </MemoryRouter>
  )
}

describe('PaymentResultPage (Stripe)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('renders success immediately when order already PAID', async () => {
    vi.spyOn(orders, 'getOrder').mockResolvedValue({ id: 'o1', status: 'PAID', totalAmount: '100000' } as any)
    renderWithUrl('/payment-result?order_id=o1&stripe_success=true&session_id=s1')

    expect(await screen.findByText(/Thanh toán thành công/)).toBeDefined()
    expect(screen.getByText(/o1/)).toBeDefined()
  })

  it('polls then shows success when status changes to PAID', async () => {
    const mock = vi.spyOn(orders, 'getOrder')
    // first 2 calls pending, then paid
    mock.mockImplementationOnce(async () => ({ id: 'o2', status: 'PENDING_PAYMENT' }) as any)
    mock.mockImplementationOnce(async () => ({ id: 'o2', status: 'PENDING_PAYMENT' }) as any)
    mock.mockImplementationOnce(async () => ({ id: 'o2', status: 'PAID', totalAmount: '200000' }) as any)
    // make scheduled polls run synchronously in tests by stubbing scheduleTimeout
    const scheduleSpy = vi
      .spyOn(PaymentResultModule.paymentResultClock, 'scheduleTimeout')
      .mockImplementation((cb: any) => {
        cb()
        return 1 as any
      })

    renderWithUrl('/payment-result?order_id=o2&stripe_success=true&session_id=s2')

    expect(await screen.findByText(/Thanh toán thành công/)).toBeDefined()
    expect(screen.getByText(/o2/)).toBeDefined()
    scheduleSpy.mockRestore()
  })

  it('shows pending after max attempts remain PENDING_PAYMENT', async () => {
    vi.spyOn(orders, 'getOrder').mockResolvedValue({ id: 'o3', status: 'PENDING_PAYMENT' } as any)

    const scheduleSpy = vi
      .spyOn(PaymentResultModule.paymentResultClock, 'scheduleTimeout')
      .mockImplementation((cb: any) => {
        cb()
        return 1 as any
      })

    renderWithUrl('/payment-result?order_id=o3&stripe_success=true&session_id=s3')

    expect(await screen.findByText(/Thanh toán đang được xác nhận/)).toBeDefined()
    scheduleSpy.mockRestore()
  })

  it('renders failed when stripe_success is false', async () => {
    renderWithUrl('/payment-result?order_id=o4&stripe_success=false&session_id=s4')
    expect(await screen.findByText(/Thanh toán chưa hoàn tất/)).toBeDefined()
  })

  it('renders failed on API error', async () => {
    vi.spyOn(orders, 'getOrder').mockRejectedValue(new Error('boom'))
    renderWithUrl('/payment-result?order_id=o5&stripe_success=true&session_id=s5')
    expect(await screen.findByText(/Thanh toán chưa hoàn tất/)).toBeDefined()
  })
})

describe('PaymentResultPage (OnePay)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('OnePay success -> order already PAID shows success', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: 'responsecode=0&desc=confirm-success' } as any)
    vi.spyOn(orders, 'getOrder').mockResolvedValue({ id: 'o10', status: 'PAID', totalAmount: '50000' } as any)

    renderWithUrl('/payment-result?vpc_TxnResponseCode=0&vpc_MerchTxnRef=o10_123')

    expect(await screen.findByText(/Thanh toán thành công/)).toBeDefined()
    expect(screen.getByText(/o10/)).toBeDefined()
    expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/orders/onepay-ipn'))
    expect(orders.getOrder).toHaveBeenCalledWith('o10')
  })

  it('OnePay success -> pending then PAID via polling', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: 'responsecode=0&desc=confirm-success' } as any)
    const mock = vi.spyOn(orders, 'getOrder')
    mock.mockImplementationOnce(async () => ({ id: 'o11', status: 'PENDING_PAYMENT' }) as any)
    mock.mockImplementationOnce(async () => ({ id: 'o11', status: 'PAID', totalAmount: '70000' }) as any)

    const scheduleSpy = vi
      .spyOn(PaymentResultModule.paymentResultClock, 'scheduleTimeout')
      .mockImplementation((cb: any) => {
        cb()
        return 1 as any
      })

    renderWithUrl('/payment-result?vpc_TxnResponseCode=0&vpc_MerchTxnRef=o11_1')

    expect(await screen.findByText(/Thanh toán thành công/)).toBeDefined()
    scheduleSpy.mockRestore()
  })

  it('OnePay sync fails -> shows failed', async () => {
    vi.spyOn(api, 'get').mockRejectedValue(new Error('sync-failed'))
    renderWithUrl('/payment-result?vpc_TxnResponseCode=0&vpc_MerchTxnRef=o12_1')

    expect(await screen.findByText(/Thanh toán chưa hoàn tất/)).toBeDefined()
  })

  it('OnePay canceled response -> shows failed and does not call orders?limit=1', async () => {
    const spyApi = vi.spyOn(api, 'get').mockResolvedValue({ data: 'responsecode=0&desc=confirm-success' } as any)
    renderWithUrl('/payment-result?vpc_TxnResponseCode=1&vpc_MerchTxnRef=o13_1')

    expect(await screen.findByText(/Thanh toán chưa hoàn tất/)).toBeDefined()
    expect(spyApi).not.toHaveBeenCalledWith(expect.stringContaining('/orders?limit=1'))
  })
})
