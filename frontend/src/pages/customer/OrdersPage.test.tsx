import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OrdersPage } from './OrdersPage'
import { api } from '../../services/api'
import type { Order } from '../../types/customer'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-12345678-abcd',
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
    ...overrides
  }
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/orders']}>
        <OrdersPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('OrdersPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the order list with status and total (Req 17.1)', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: [makeOrder()] } as never)
    renderPage()

    expect(await screen.findByText(/Đơn #order-12/i)).toBeDefined()
    expect(screen.getByText(/Đã thanh toán/)).toBeDefined()
    // 2 items
    expect(screen.getByText(/2 voucher/i)).toBeDefined()
  })

  it('shows an empty state when there are no orders', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: [] } as never)
    renderPage()

    expect(await screen.findByText(/chưa có đơn hàng nào/i)).toBeDefined()
  })

  it('shows an error alert when the request fails', async () => {
    vi.spyOn(api, 'get').mockRejectedValue(new Error('boom'))
    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined()
    })
  })
})
