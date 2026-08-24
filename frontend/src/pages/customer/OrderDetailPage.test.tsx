import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, AxiosHeaders } from 'axios'
import { OrderDetailPage } from './OrderDetailPage'
import { api } from '../../services/api'
import type { Order } from '../../types/customer'
import { ToastProvider } from '../../components/ui'

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    customerId: 'user-1',
    totalAmount: '250000',
    status: 'PAID',
    paymentMethod: 'VNPAY',
    giftRecipient: null,
    paidAt: '2025-01-05T10:01:00.000Z',
    createdAt: '2025-01-05T10:00:00.000Z',
    updatedAt: '2025-01-05T10:00:00.000Z',
    items: [
      {
        id: 1,
        voucherProductId: 'v-1',
        voucherProductName: 'Spa Day',
        quantity: 2,
        unitPrice: '125000'
      }
    ],
    codes: [
      { code: 'SPA-AAAA-1111', voucherProductId: 'v-1', status: 'UNUSED', expiresAt: '2025-12-31T00:00:00.000Z' }
    ],
    ...overrides
  }
}

function notFoundError(): AxiosError {
  const err = new AxiosError('Not found', 'ERR_BAD_REQUEST')
  err.response = {
    status: 404,
    statusText: 'Not Found',
    data: { error: { code: 'NOT_FOUND', message: 'Order not found' } },
    headers: {},
    config: { headers: new AxiosHeaders() }
  }
  return err
}

function renderAt(id: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[`/orders/${id}`]}>
          <Routes>
            <Route path='/orders/:id' element={<OrderDetailPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}

describe('OrderDetailPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders order items, status, and total (Req 17.1, 17.2)', async () => {
    vi.spyOn(api, 'get').mockImplementation((url: string) => {
      if (url === '/orders/order-1') {
        return Promise.resolve({ data: makeOrder() } as never)
      }
      return Promise.resolve({ data: [] } as never)
    })

    renderAt('order-1')

    expect(await screen.findByText('Spa Day')).toBeDefined()
    expect(screen.getByText(/Đã thanh toán/)).toBeDefined()
    // total appears in the table footer
    expect(screen.getAllByText(/250\D*000/).length).toBeGreaterThan(0)
  })

  it('shows voucher codes for PAID orders without an out-of-scope detail route (Req 17.2)', async () => {
    vi.spyOn(api, 'get').mockImplementation((url: string) => {
      if (url === '/orders/order-1') {
        return Promise.resolve({ data: makeOrder() } as never)
      }
      return Promise.resolve({ data: [] } as never)
    })

    renderAt('order-1')

    expect(await screen.findByText('SPA-AAAA-1111')).toBeDefined()
    expect(screen.queryByRole('link', { name: 'SPA-AAAA-1111' })).toBeNull()
  })

  it('renders the payment transaction timeline in Vietnamese', async () => {
    vi.spyOn(api, 'get').mockImplementation((url: string) => {
      if (url === '/orders/order-1') {
        return Promise.resolve({ data: makeOrder() } as never)
      }
      if (url === '/orders/order-1/payments') {
        return Promise.resolve({
          data: {
            data: [
              {
                id: 'payment-1',
                orderId: 'order-1',
                gateway: 'STRIPE',
                gatewayTransId: 'pi_demo_123',
                amount: '250000',
                currency: 'VND',
                status: 'SUCCESS',
                failureReason: null,
                paidAt: '2025-01-05T10:01:00.000Z',
                refundedAt: null,
                createdAt: '2025-01-05T10:00:00.000Z'
              }
            ]
          }
        } as never)
      }
      return Promise.resolve({ data: [] } as never)
    })

    renderAt('order-1')

    expect(await screen.findByText('Thông tin thanh toán')).toBeDefined()
    expect(await screen.findByText('Thẻ quốc tế · Stripe')).toBeDefined()
    expect(screen.getAllByText('Đã thanh toán').length).toBeGreaterThan(0)
    expect(screen.getByText(/pi_demo_123/)).toBeDefined()
  })

  it('does not fetch or show codes for a PENDING_PAYMENT order', async () => {
    const getSpy = vi.spyOn(api, 'get').mockImplementation((url: string) => {
      if (url === '/orders/order-1') {
        return Promise.resolve({
          data: makeOrder({ status: 'PENDING_PAYMENT' })
        } as never)
      }
      return Promise.resolve({ data: [] } as never)
    })

    renderAt('order-1')

    expect(await screen.findByText(/chờ hoàn tất thanh toán/i)).toBeDefined()
    expect(screen.getByRole('button', { name: /PayPal/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /OnePay/i })).toBeDefined()
    expect(screen.queryByText(/Voucher codes/i)).toBeNull()
    // /my-codes must not be queried when the order is unpaid.
    expect(getSpy).not.toHaveBeenCalledWith('/my-codes')
  })

  it('renders a not-found message on 404', async () => {
    vi.spyOn(api, 'get').mockRejectedValue(notFoundError())
    renderAt('missing')

    expect(await screen.findByText(/không tìm thấy đơn hàng/i)).toBeDefined()
  })
})
