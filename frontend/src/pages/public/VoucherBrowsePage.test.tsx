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
      categories: ['Ẩm Thực', 'Spa & Làm đẹp', 'Tour du lịch'],
      regions: ['Hà Nội', 'TP. Hồ Chí Minh'],
      partners: [
        { id: 'p1', name: 'Serenity Spa' },
        { id: 'p2', name: 'Tasty Bites' }
      ],
      priceRange: { min: 35_000, max: 8_990_000 }
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

  it('passes sidebar filter values to the search query', async () => {
    const spy = vi.spyOn(voucherService, 'searchVouchers').mockResolvedValue(buildResponse())

    renderPage()
    await screen.findByText('Spa Day Package')

    fireEvent.click(screen.getByRole('button', { name: 'Spa & Làm đẹp' }))

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith({
        page: 1,
        limit: 12,
        category: 'Spa & Làm đẹp'
      })
    })
  })

  it('shows a refreshing state while a changed filter is loading', async () => {
    let resolveFiltered!: (response: SearchVouchersResponse) => void
    const filteredResponse = new Promise<SearchVouchersResponse>((resolve) => {
      resolveFiltered = resolve
    })
    const spy = vi
      .spyOn(voucherService, 'searchVouchers')
      .mockResolvedValueOnce(buildResponse())
      .mockReturnValueOnce(filteredResponse)

    renderPage()
    await screen.findByText('Spa Day Package')

    fireEvent.click(screen.getByRole('button', { name: /Spa & Làm đẹp/i }))

    expect((await screen.findByRole('status')).textContent).toMatch(/Đang cập nhật kết quả/i)
    expect(screen.getByTestId('voucher-grid').parentElement?.getAttribute('aria-busy')).toBe('true')

    resolveFiltered(buildResponse())
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull())
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('passes both price bounds, including prices above one million, to the API', async () => {
    const spy = vi.spyOn(voucherService, 'searchVouchers').mockResolvedValue(buildResponse())

    renderPage()
    await screen.findByText('Spa Day Package')

    fireEvent.change(screen.getByLabelText(/giá từ/i), { target: { value: '1200000' } })
    fireEvent.change(screen.getByLabelText(/giá đến/i), { target: { value: '8990000' } })
    fireEvent.click(screen.getByRole('button', { name: /áp dụng/i }))

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith({
        page: 1,
        limit: 12,
        minPrice: 1_200_000,
        maxPrice: 8_990_000
      })
    })
  })

  it('renders an error state when the request fails', async () => {
    vi.spyOn(voucherService, 'searchVouchers').mockRejectedValue(new Error('network'))

    renderPage()

    expect(await screen.findByRole('alert')).toBeDefined()
  })
})
