import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CheckoutPage } from './CheckoutPage'
import * as ordersApi from '../../services/orders'

// Keep the real helpers (formatMoney/toNumber/getApiErrorMessage) and only
// stub the network-calling functions.
vi.mock('../../services/orders', async () => {
  const actual = await vi.importActual<typeof import('../../services/orders')>('../../services/orders')
  return {
    ...actual,
    getCart: vi.fn(),
    createOrder: vi.fn()
  }
})

const getCartMock = vi.mocked(ordersApi.getCart)
const createOrderMock = vi.mocked(ordersApi.createOrder)

/** Renders the current path so redirects can be asserted. */
function LocationProbe() {
  const location = useLocation()
  return <div data-testid='location'>{location.pathname}</div>
}

function renderCheckout() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/checkout']}>
        <Routes>
          <Route path='/checkout' element={<CheckoutPage />} />
          <Route path='*' element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

const SAMPLE_CART = {
  items: [
    {
      id: '1',
      voucherId: 'v-1',
      title: 'Spa Day Pass',
      unitPrice: 50,
      quantity: 2,
      subtotal: 100
    },
    {
      id: '2',
      voucherId: 'v-2',
      title: 'Dinner for Two',
      unitPrice: 30,
      quantity: 1,
      subtotal: 30
    }
  ],
  total: 130
}

describe('CheckoutPage', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    getCartMock.mockReset()
    createOrderMock.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders the order summary from the cart with the total', async () => {
    getCartMock.mockResolvedValue(SAMPLE_CART)

    renderCheckout()

    expect(await screen.findByText('Spa Day Pass')).toBeDefined()
    expect(screen.getByText('Dinner for Two')).toBeDefined()
    // Ensure the UI uses the application's formatter (locale-aware)
    expect(screen.getByTestId('cart-total').textContent).toBe(ordersApi.formatMoney(SAMPLE_CART.total))
  })

  it('shows an empty-cart message and hides the order form', async () => {
    getCartMock.mockResolvedValue({ items: [], total: 0 })

    renderCheckout()

    expect(await screen.findByText(/giỏ hàng của bạn đang trống/i)).toBeDefined()
    expect(screen.queryByRole('button', { name: /đặt hàng/i })).toBeNull()
  })

  it('creates an order and navigates to the payment page', async () => {
    getCartMock.mockResolvedValue(SAMPLE_CART)
    createOrderMock.mockResolvedValue({
      id: 'order-123',
      customerId: 'u-1',
      totalAmount: '130',
      status: 'PENDING_PAYMENT',
      paymentMethod: 'VNPAY',
      giftRecipient: null,
      paidAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: []
    })

    renderCheckout()

    await screen.findByText('Spa Day Pass')
    fireEvent.click(screen.getByRole('button', { name: /đặt hàng/i }))

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/orders/order-123')
    })
    // No recipient details entered → all fields omitted.
    expect(createOrderMock).toHaveBeenCalledWith({ giftRecipient: undefined, selectedCartItemIds: [1, 2] })
  })

  it('passes gift recipient details when provided', async () => {
    getCartMock.mockResolvedValue(SAMPLE_CART)
    createOrderMock.mockResolvedValue({
      id: 'order-9',
      customerId: 'u-1',
      totalAmount: '130',
      status: 'PENDING_PAYMENT',
      paymentMethod: 'VNPAY',
      giftRecipient: { name: 'Bob', email: 'bob@example.com' },
      paidAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: []
    })

    renderCheckout()

    await screen.findByText('Spa Day Pass')
    fireEvent.change(screen.getByLabelText(/tên người nhận/i), {
      target: { value: 'Bob' }
    })
    fireEvent.change(screen.getByLabelText(/email người nhận/i), {
      target: { value: 'bob@example.com' }
    })
    fireEvent.click(screen.getByRole('button', { name: /đặt hàng/i }))

    await waitFor(() => {
      expect(createOrderMock).toHaveBeenCalledWith({
        selectedCartItemIds: [1, 2],
        giftRecipient: {
          name: 'Bob',
          email: 'bob@example.com',
          phone: undefined
        }
      })
    })
  })

  it('surfaces a server error when order creation fails', async () => {
    getCartMock.mockResolvedValue(SAMPLE_CART)
    createOrderMock.mockRejectedValue({
      response: {
        status: 409,
        data: { error: { code: 'CONFLICT', message: '"Spa Day Pass" is out of stock' } }
      }
    })

    renderCheckout()

    await screen.findByText('Spa Day Pass')
    fireEvent.click(screen.getByRole('button', { name: /đặt hàng/i }))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toMatch(/out of stock/i)
    // Stays on the checkout page (no redirect occurred).
    expect(screen.queryByTestId('location')).toBeNull()
  })
})
