import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as PaymentResultModule from './PaymentResultPage'
import * as orders from '../../services/orders'
import { api } from '../../services/api'

const { PaymentResultPage } = PaymentResultModule

function paidOrder(id: string, totalAmount = '150000') {
  return {
    id,
    customerId: 'customer-1',
    status: 'PAID',
    totalAmount,
    paymentMethod: 'STRIPE',
    giftRecipient: null,
    paidAt: '2026-08-26T08:00:00.000Z',
    createdAt: '2026-08-26T07:45:00.000Z',
    updatedAt: '2026-08-26T08:00:00.000Z',
    items: [
      { id: 1, voucherProductId: 'voucher-1', voucherProductName: 'Voucher cà phê', quantity: 2, unitPrice: '75000' }
    ],
    codes: [
      { code: 'CAFE-PAID-001', voucherProductId: 'voucher-1', status: 'UNUSED', expiresAt: '2026-12-31T00:00:00.000Z' }
    ]
  } as any
}

function renderWithUrl(url: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[url]}>
        <PaymentResultPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('PaymentResultPage gateway confirmation', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(orders, 'getOrderPayments').mockResolvedValue([])
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('Stripe PAID renders the shared completed order detail with step 3, paid badge, item and VND total', async () => {
    const id = '30be1486-aaaa-bbbb-cccc-123456789012'
    vi.spyOn(orders, 'getOrder').mockResolvedValue(paidOrder(id))
    renderWithUrl(`/payment-result?order_id=${id}&stripe_success=true&session_id=s1`)

    expect(await screen.findByTestId('completed-order-detail')).toBeDefined()
    expect(screen.getByTestId('checkout-step-complete').textContent).toContain('Hoàn tất')
    expect(screen.getByText('Đã thanh toán')).toBeDefined()
    expect(screen.getByText('Đơn #30be1486')).toBeDefined()
    expect(screen.getByText('Voucher cà phê')).toBeDefined()
    expect(screen.getAllByText(/150\.000/).length).toBeGreaterThan(0)
    expect(orders.getOrder).toHaveBeenCalledWith(id)
  })

  it('OnePay PAID renders the same shared completion UI for the exact merchant order id', async () => {
    const id = '30be1486-aaaa-bbbb-cccc-123456789012'
    vi.spyOn(api, 'get').mockResolvedValue({ data: 'responsecode=0&desc=confirm-success' } as any)
    vi.spyOn(orders, 'getOrder').mockResolvedValue(paidOrder(id, '50000'))
    renderWithUrl(`/payment-result?vpc_TxnResponseCode=0&vpc_MerchTxnRef=${id.replaceAll('-', '')}_123`)

    expect(await screen.findByTestId('completed-order-detail')).toBeDefined()
    expect(screen.getByText('Đã thanh toán')).toBeDefined()
    expect(screen.getByTestId('checkout-step-complete').textContent).toContain('Hoàn tất')
    expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/orders/onepay-ipn'))
    expect(orders.getOrder).toHaveBeenCalledWith(id)
  })

  it('polls Stripe PENDING_PAYMENT then renders the shared completion UI only after PAID', async () => {
    const getOrder = vi.spyOn(orders, 'getOrder')
    getOrder.mockResolvedValueOnce({ ...paidOrder('o2'), status: 'PENDING_PAYMENT' })
    getOrder.mockResolvedValueOnce(paidOrder('o2'))
    vi.spyOn(PaymentResultModule.paymentResultClock, 'scheduleTimeout').mockImplementation((callback: () => void) => {
      callback()
      return 1 as any
    })
    renderWithUrl('/payment-result?order_id=o2&stripe_success=true&session_id=s2')

    expect(await screen.findByTestId('completed-order-detail')).toBeDefined()
    expect(getOrder).toHaveBeenCalledTimes(2)
  })

  it('pending payment does not show the completed order detail', async () => {
    vi.spyOn(orders, 'getOrder').mockResolvedValue({ ...paidOrder('o3'), status: 'PENDING_PAYMENT' })
    vi.spyOn(PaymentResultModule.paymentResultClock, 'scheduleTimeout').mockImplementation(() => 1 as any)
    renderWithUrl('/payment-result?order_id=o3&stripe_success=true&session_id=s3')

    expect(await screen.findByText('Thanh toán đang được xác nhận')).toBeDefined()
    expect(screen.queryByTestId('completed-order-detail')).toBeNull()
  })

  it('forged Stripe success query cannot show completed UI unless the backend order is PAID', async () => {
    vi.spyOn(orders, 'getOrder').mockResolvedValue({ ...paidOrder('o4'), status: 'CANCELLED' })
    renderWithUrl('/payment-result?order_id=o4&stripe_success=true&session_id=forged')

    expect(await screen.findByText('Thanh toán chưa hoàn tất')).toBeDefined()
    expect(screen.queryByTestId('completed-order-detail')).toBeNull()
  })

  it('Stripe canceled response shows failed UI without completed details', async () => {
    renderWithUrl('/payment-result?order_id=o5&stripe_success=false&session_id=s5')
    expect(await screen.findByText('Thanh toán chưa hoàn tất')).toBeDefined()
    expect(screen.queryByTestId('completed-order-detail')).toBeNull()
  })

  it('OnePay canceled response is locally mocked and never requests /orders?limit=1', async () => {
    const spyApi = vi.spyOn(api, 'get').mockResolvedValue({ data: 'responsecode=1&desc=cancelled' } as any)
    renderWithUrl('/payment-result?vpc_TxnResponseCode=1&vpc_MerchTxnRef=o13_1')

    expect(await screen.findByText('Thanh toán chưa hoàn tất')).toBeDefined()
    expect(spyApi).toHaveBeenCalledWith(expect.stringContaining('/orders/onepay-ipn'))
    expect(spyApi).not.toHaveBeenCalledWith(expect.stringContaining('/orders?limit=1'))
    expect(screen.queryByTestId('completed-order-detail')).toBeNull()
  })
})
