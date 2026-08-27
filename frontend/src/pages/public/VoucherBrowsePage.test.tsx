import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { VoucherBrowsePage } from './VoucherBrowsePage'
import * as voucherService from '../../services/voucher.service'
import { makeVoucher } from '../../test-utils/voucherFixtures'
import type { SearchVouchersResponse } from '../../services/voucher.service'

function buildResponse(overrides: Partial<SearchVouchersResponse> = {}): SearchVouchersResponse {
  return {
    vouchers: [makeVoucher()],
    pagination: { page: 1, limit: 12, total: 1 },
    ...overrides
  }
}

function renderPage(initialEntries: string[] = ['/search']) {
  // A fresh client per render with retries off for deterministic tests.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={initialEntries}>
        <VoucherBrowsePage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('VoucherBrowsePage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.spyOn(voucherService, 'getVoucherFilterOptions').mockResolvedValue({
      categories: ['Ăn uống', 'Làm đẹp & Spa', 'Du lịch & Khách sạn'],
      regions: ['Hà Nội', 'TP. Hồ Chí Minh'],
      partners: [
        { id: 'p1', name: 'Serenity Spa' },
        { id: 'p2', name: 'Tasty Bites' }
      ]
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches and renders vouchers from the catalogue', async () => {
    const spy = vi.spyOn(voucherService, 'searchVouchers').mockResolvedValue(buildResponse())

    renderPage()

    expect(await screen.findByText('Spa Day Package')).toBeDefined()
    expect(screen.getByText(/Tìm thấy 1 voucher/i)).toBeDefined()
    // First request: page 1 with the default limit and no filters.
    expect(spy).toHaveBeenCalledWith({ page: 1, limit: 12 })
  })

  it('shows an empty state when no vouchers match', async () => {
    vi.spyOn(voucherService, 'searchVouchers').mockResolvedValue(
      buildResponse({ vouchers: [], pagination: { page: 1, limit: 12, total: 0 } })
    )

    renderPage()

    expect(await screen.findByTestId('voucher-grid-empty')).toBeDefined()
    expect(screen.getByText(/Tìm thấy 0 voucher/i)).toBeDefined()
  })

  it('reads the header search q param as a keyword filter', async () => {
    const spy = vi.spyOn(voucherService, 'searchVouchers').mockResolvedValue(buildResponse())

    renderPage(['/search?q=spa&sort=discount'])

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith({
        page: 1,
        limit: 12,
        keyword: 'spa'
      })
    })
  })

  it('passes committed filter values to the search query', async () => {
    const spy = vi.spyOn(voucherService, 'searchVouchers').mockResolvedValue(buildResponse())

    renderPage()
    await screen.findByText('Spa Day Package')

    fireEvent.change(screen.getByLabelText(/^tìm kiếm$/i), {
      target: { value: 'spa' }
    })
    fireEvent.change(screen.getByLabelText(/danh mục/i), {
      target: { value: 'Làm đẹp & Spa' }
    })
    fireEvent.change(screen.getByLabelText(/giá thấp nhất/i), {
      target: { value: '50000' }
    })
    fireEvent.click(screen.getByRole('button', { name: /^tìm kiếm$/i }))

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith({
        page: 1,
        limit: 12,
        keyword: 'spa',
        category: 'Làm đẹp & Spa',
        minPrice: 50000
      })
    })
  })

  it('renders an error state when the request fails', async () => {
    vi.spyOn(voucherService, 'searchVouchers').mockRejectedValue(new Error('network'))

    renderPage()

    expect(await screen.findByRole('alert')).toBeDefined()
  })
})
