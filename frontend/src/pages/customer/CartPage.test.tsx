import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CartPage, formatPrice, resolveCartError, type CartView } from './CartPage'
import { api } from '../../services/api'

/* -------------------------------------------------------------------------- */
/* Test helpers                                                               */
/* -------------------------------------------------------------------------- */

/** Build a fresh QueryClient with retries disabled for deterministic tests. */
function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })
}

/** Render the CartPage inside the providers it depends on. */
function renderCart() {
  return render(
    <QueryClientProvider client={makeClient()}>
      <MemoryRouter initialEntries={['/cart']}>
        <CartPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

/** A two-line sample cart used by most tests. */
function sampleCart(): CartView {
  return {
    items: [
      {
        id: 'ci-1',
        voucherId: 'v-1',
        title: 'Spa Day Pass',
        unitPrice: 50,
        quantity: 2,
        subtotal: 100
      },
      {
        id: 'ci-2',
        voucherId: 'v-2',
        title: 'Dinner for Two',
        unitPrice: 30,
        quantity: 1,
        subtotal: 30
      }
    ],
    total: 130
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

/* -------------------------------------------------------------------------- */
/* Pure helper unit tests                                                     */
/* -------------------------------------------------------------------------- */

describe('CartPage helpers', () => {
  it('formatPrice renders a currency string', () => {
    expect(formatPrice(0)).toBe('$0.00')
    expect(formatPrice(130)).toBe('$130.00')
    expect(formatPrice(12.5)).toBe('$12.50')
  })

  it('resolveCartError surfaces the backend message when present', () => {
    const message = resolveCartError({
      response: {
        data: { error: { code: 'CONFLICT', message: 'Insufficient stock' } }
      }
    })
    expect(message).toBe('Insufficient stock')
  })

  it('resolveCartError falls back to a network message when no response', () => {
    expect(resolveCartError(new Error('boom'))).toMatch(/unable to reach/i)
  })
})

/* -------------------------------------------------------------------------- */
/* Component tests                                                            */
/* -------------------------------------------------------------------------- */

describe('CartPage', () => {
  it('renders each item name, unit price, quantity, subtotal, and cart total', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: sampleCart() } as never)

    renderCart()

    expect(await screen.findByText('Spa Day Pass')).toBeDefined()
    expect(screen.getByText('Dinner for Two')).toBeDefined()

    expect(screen.getByTestId('unit-price-ci-1').textContent).toBe('$50.00')
    expect(screen.getByTestId('quantity-ci-1').textContent).toBe('2')
    expect(screen.getByTestId('subtotal-ci-1').textContent).toBe('$100.00')
    expect(screen.getByTestId('cart-total').textContent).toBe('$130.00')
  })

  it('shows an empty-cart message when there are no items', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { items: [], total: 0 }
    } as never)

    renderCart()

    expect(await screen.findByText(/giỏ hàng của bạn đang trống/i)).toBeDefined()
  })

  it('optimistically updates quantity and reconciles with the server response', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: sampleCart() } as never)
    const updated: CartView = {
      items: [
        { id: 'ci-1', voucherId: 'v-1', title: 'Spa Day Pass', unitPrice: 50, quantity: 3, subtotal: 150 },
        { id: 'ci-2', voucherId: 'v-2', title: 'Dinner for Two', unitPrice: 30, quantity: 1, subtotal: 30 }
      ],
      total: 180
    }
    // Defer the server response so we can observe the optimistic state while
    // the request is still in flight.
    let resolvePut!: (value: unknown) => void
    const putSpy = vi.spyOn(api, 'put').mockReturnValue(
      new Promise((resolve) => {
        resolvePut = resolve
      }) as never
    )

    renderCart()

    await screen.findByText('Spa Day Pass')
    fireEvent.click(screen.getByLabelText(/tăng số lượng spa day pass/i))

    // Optimistic update applies before the (still pending) request resolves.
    await waitFor(() => {
      expect(screen.getByTestId('quantity-ci-1').textContent).toBe('3')
    })
    expect(screen.getByTestId('subtotal-ci-1').textContent).toBe('$150.00')
    expect(putSpy).toHaveBeenCalledWith('/cart/ci-1', { quantity: 3 })

    // Resolve with the authoritative cart; the cache reconciles to it.
    resolvePut({ data: updated })
    await waitFor(() => {
      expect(screen.getByTestId('cart-total').textContent).toBe('$180.00')
    })
  })

  it('rolls back and shows an insufficient-stock message when an update is rejected', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: sampleCart() } as never)
    vi.spyOn(api, 'put').mockRejectedValue({
      response: {
        status: 409,
        data: {
          error: {
            code: 'CONFLICT',
            message: 'Insufficient stock for the requested quantity'
          }
        }
      }
    })

    renderCart()

    await screen.findByText('Spa Day Pass')
    fireEvent.click(screen.getByLabelText(/tăng số lượng spa day pass/i))

    // The insufficient-stock message is surfaced (Requirement 13.5).
    const alert = await screen.findByText(/insufficient stock/i)
    expect(alert).toBeDefined()

    // The optimistic change was rolled back to the original quantity/total.
    await waitFor(() => {
      expect(screen.getByTestId('quantity-ci-1').textContent).toBe('2')
    })
    expect(screen.getByTestId('cart-total').textContent).toBe('$130.00')
  })

  it('optimistically removes an item and recalculates the total', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: sampleCart() } as never)
    const afterRemoval: CartView = {
      items: [{ id: 'ci-2', voucherId: 'v-2', title: 'Dinner for Two', unitPrice: 30, quantity: 1, subtotal: 30 }],
      total: 30
    }
    const deleteSpy = vi.spyOn(api, 'delete').mockResolvedValue({ data: afterRemoval } as never)

    renderCart()

    await screen.findByText('Spa Day Pass')
    fireEvent.click(screen.getByLabelText(/xóa spa day pass khỏi giỏ hàng/i))

    await waitFor(() => {
      expect(screen.queryByText('Spa Day Pass')).toBeNull()
    })
    expect(deleteSpy).toHaveBeenCalledWith('/cart/ci-1')
    expect(screen.getByTestId('cart-total').textContent).toBe('$30.00')
  })

  it('does not exceed the maximum quantity per item', async () => {
    const maxedCart: CartView = {
      items: [{ id: 'ci-1', voucherId: 'v-1', title: 'Spa Day Pass', unitPrice: 50, quantity: 10, subtotal: 500 }],
      total: 500
    }
    vi.spyOn(api, 'get').mockResolvedValue({ data: maxedCart } as never)
    const putSpy = vi.spyOn(api, 'put')

    renderCart()

    await screen.findByText('Spa Day Pass')
    const increase = screen.getByLabelText(/tăng số lượng spa day pass/i)
    expect(increase).toHaveProperty('disabled', true)

    fireEvent.click(increase)
    expect(putSpy).not.toHaveBeenCalled()
  })

  it('renders an error state with a retry when the cart fails to load', async () => {
    vi.spyOn(api, 'get').mockRejectedValue(new Error('network down'))

    renderCart()

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText(/không thể tải giỏ hàng/i)).toBeDefined()
    expect(screen.getByRole('button', { name: /thử lại/i })).toBeDefined()
  })
})
