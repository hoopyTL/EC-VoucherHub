import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DashboardPage, deriveDashboardStats } from './DashboardPage'
import { api } from '../../services/api'
import type { Branch, PartnerVoucher } from '../../types/partner'

function makeBranch(overrides: Partial<Branch> = {}): Branch {
  return {
    id: 'b-1',
    name: 'Downtown',
    address: '1 Main St',
    region: 'Hà Nội',
    contact: '0123',
    isActive: true,
    partnerId: 'p-1',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides
  }
}

function makeVoucher(overrides: Partial<PartnerVoucher> = {}): PartnerVoucher {
  return {
    id: 'v-1',
    title: 'Spa Day',
    category: 'Spa & Beauty',
    originalPrice: '200000.00',
    salePrice: '150000.00',
    totalQuantity: 100,
    soldQuantity: 10,
    status: 'APPROVED',
    createdAt: '2025-01-01T00:00:00.000Z',
    ...overrides
  }
}

/**
 * Mock the two GET endpoints the dashboard fans out to. `/partner/branches`
 * returns a bare array; `/partner/vouchers` returns the paginated envelope.
 */
function mockApi(branches: Branch[], vouchers: PartnerVoucher[]) {
  vi.spyOn(api, 'get').mockImplementation((url: string) => {
    if (url === '/partner/branches') {
      return Promise.resolve({ data: branches } as never)
    }
    if (url === '/partner/vouchers') {
      return Promise.resolve({
        data: { vouchers, pagination: { page: 1, limit: 100, total: vouchers.length } }
      } as never)
    }
    return Promise.reject(new Error(`unexpected url ${url}`))
  })
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('deriveDashboardStats', () => {
  it('counts branches, vouchers by status, units sold and gross sales', () => {
    const stats = deriveDashboardStats(
      [makeBranch({ isActive: true }), makeBranch({ id: 'b-2', isActive: false })],
      [
        makeVoucher({ id: 'v-1', status: 'APPROVED', salePrice: '100', soldQuantity: 2 }),
        makeVoucher({ id: 'v-2', status: 'DRAFT', salePrice: '50', soldQuantity: 0 }),
        makeVoucher({ id: 'v-3', status: 'APPROVED', salePrice: '10', soldQuantity: 5 })
      ]
    )

    expect(stats.totalBranches).toBe(2)
    expect(stats.activeBranches).toBe(1)
    expect(stats.totalVouchers).toBe(3)
    expect(stats.approvedVouchers).toBe(2)
    expect(stats.unitsSold).toBe(7)
    // 100*2 + 50*0 + 10*5 = 250
    expect(stats.grossSales).toBe(250)
    expect(stats.vouchersByStatus).toEqual({ APPROVED: 2, DRAFT: 1 })
  })

  it('returns zeroed stats for empty inputs', () => {
    const stats = deriveDashboardStats([], [])
    expect(stats).toEqual({
      totalBranches: 0,
      activeBranches: 0,
      totalVouchers: 0,
      approvedVouchers: 0,
      unitsSold: 0,
      grossSales: 0,
      vouchersByStatus: {}
    })
  })
})

describe('DashboardPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders derived overview stats from branches and vouchers', async () => {
    mockApi(
      [makeBranch({ isActive: true }), makeBranch({ id: 'b-2', isActive: false })],
      [
        makeVoucher({ id: 'v-1', status: 'APPROVED', soldQuantity: 4 }),
        makeVoucher({ id: 'v-2', status: 'DRAFT', soldQuantity: 0 })
      ]
    )

    renderPage()

    // Active branches card shows "1 / 2".
    expect(await screen.findByText('1 / 2')).toBeDefined()
    // Units sold card.
    expect(screen.getByText('4')).toBeDefined()
    // Status breakdown lists both statuses.
    expect(screen.getByText('Đã duyệt')).toBeDefined()
    expect(screen.getByText('Bản nháp')).toBeDefined()
  })

  it('shows an empty state for the breakdown when there are no vouchers', async () => {
    mockApi([makeBranch()], [])
    renderPage()

    expect(await screen.findByText(/bạn chưa tạo voucher nào/i)).toBeDefined()
  })

  it('shows an error alert when a request fails', async () => {
    vi.spyOn(api, 'get').mockRejectedValue(new Error('boom'))
    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined()
    })
  })
})
