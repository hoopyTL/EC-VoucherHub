import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PriceDisplay } from './PriceDisplay'
import { VoucherCard } from './VoucherCard'
import { VoucherGrid } from './VoucherGrid'
import { makeVoucher } from '../../test-utils/voucherFixtures'

/** Wrap in a QueryClientProvider — cards mount a SaveButton (useWishlist). */
function withProviders(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('PriceDisplay', () => {
  it('shows sale price, struck-through original, and a discount badge', () => {
    render(<PriceDisplay originalPrice='200000' salePrice='150000' />)
    expect(screen.getByTestId('sale-price').textContent).toMatch(/150/)
    expect(screen.getByTestId('original-price').textContent).toMatch(/200/)
    expect(screen.getByTestId('discount-badge').textContent).toBe('-25%')
  })

  it('hides the original price/badge when there is no discount', () => {
    render(<PriceDisplay originalPrice='100000' salePrice='100000' />)
    expect(screen.getByTestId('sale-price')).toBeDefined()
    expect(screen.queryByTestId('discount-badge')).toBeNull()
    expect(screen.queryByTestId('original-price')).toBeNull()
  })

  it('prefers an explicit discountPercentage when provided', () => {
    render(<PriceDisplay originalPrice='200000' salePrice='150000' discountPercentage={40} />)
    expect(screen.getByTestId('discount-badge').textContent).toBe('-40%')
  })
})

describe('VoucherCard', () => {
  function renderCard(...args: Parameters<typeof makeVoucher>) {
    return render(withProviders(<VoucherCard voucher={makeVoucher(...args)} />))
  }

  it('renders title, partner, category and links to the detail page', () => {
    renderCard()
    const card = screen.getByTestId('voucher-card')
    expect(within(card).getByText('Spa Day Package')).toBeDefined()
    expect(within(card).getByText('Serenity Spa')).toBeDefined()
    expect(within(card).getByText('Spa & Beauty')).toBeDefined()
    expect(card.getAttribute('href')).toBe('/vouchers/v1')
  })

  it('shows remaining inventory', () => {
    renderCard({ totalQuantity: 100, soldQuantity: 90 })
    expect(screen.getByText('Còn 10')).toBeDefined()
  })

  it('shows a sold-out badge when inventory is exhausted', () => {
    renderCard({ totalQuantity: 100, soldQuantity: 100 })
    expect(screen.getByText('Hết hàng')).toBeDefined()
  })

  it('omits ratings because reviews are outside the MVP', () => {
    renderCard({ rating: { average: 4.5, count: 8 } })
    expect(screen.queryByTestId('voucher-rating')).toBeNull()
  })

  it('hides the rating when there are no reviews', () => {
    renderCard({ rating: { average: 0, count: 0 } })
    expect(screen.queryByTestId('voucher-rating')).toBeNull()
  })

  it('shows a flash-sale badge and the flash price when a flash sale is active', () => {
    const endsAt = new Date(Date.now() + 3600 * 1000).toISOString()
    renderCard({
      salePrice: '150000.00',
      flashSale: {
        active: true,
        flashSalePrice: 120000,
        flashSaleStart: new Date(Date.now() - 1000).toISOString(),
        flashSaleEnd: endsAt,
        effectivePrice: 120000
      }
    })
    expect(screen.getByTestId('flash-sale-badge')).toBeDefined()
    // The effective (flash) price is shown as the sale price.
    expect(screen.getByTestId('sale-price').textContent).toMatch(/120/)
  })

  it('shows the regular sale price when the flash sale is inactive', () => {
    renderCard({
      salePrice: '150000.00',
      flashSale: {
        active: false,
        flashSalePrice: 120000,
        flashSaleStart: null,
        flashSaleEnd: null,
        effectivePrice: 150000
      }
    })
    expect(screen.queryByTestId('flash-sale-badge')).toBeNull()
    expect(screen.getByTestId('sale-price').textContent).toMatch(/150/)
  })
})

describe('VoucherGrid', () => {
  it('renders a loading spinner when loading', () => {
    render(withProviders(<VoucherGrid vouchers={[]} isLoading />))
    expect(screen.getByRole('status')).toBeDefined()
    expect(screen.queryByTestId('voucher-grid')).toBeNull()
  })

  it('renders an empty message when there are no vouchers', () => {
    render(withProviders(<VoucherGrid vouchers={[]} />))
    expect(screen.getByTestId('voucher-grid-empty')).toBeDefined()
  })

  it('renders one card per voucher', () => {
    render(
      withProviders(
        <VoucherGrid vouchers={[makeVoucher({ id: 'v1', title: 'A' }), makeVoucher({ id: 'v2', title: 'B' })]} />
      )
    )
    expect(screen.getAllByTestId('voucher-card')).toHaveLength(2)
  })
})
