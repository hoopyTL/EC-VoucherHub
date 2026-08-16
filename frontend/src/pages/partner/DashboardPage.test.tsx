import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DashboardPage, deriveDashboardStats } from './DashboardPage'
import { api } from '../../services/api'
import { listPartnerVouchers as fetchAllPartnerVouchers } from '../../services/partner'
import type { Branch, PartnerVoucher } from '../../types/partner'

function makeBranch(overrides: Partial<Branch> = {}): Branch {
  return {
    id: 1,
    name: 'Downtown',
    address: '1 Main St',
    region: 'Hà Nội',
    partnerId: 'p-1',
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
    status: 'ON_SALE',
    createdAt: '2025-01-01T00:00:00.000Z',
    ...overrides
  }
}

/**
 * Mock the two GET endpoints the dashboard fans out to. `/partner/branches`
 * returns the standard API envelope with canonical voucher fields.
 */
function mockApi(branches: Branch[], vouchers: PartnerVoucher[]) {
  vi.spyOn(api, 'get').mockImplementation((url: string) => {
    if (url === '/partner/branches') {
      return Promise.resolve({ data: { success: true, data: branches } } as never)
    }
    if (url === '/partner/vouchers') {
      return Promise.resolve({
        data: {
          success: true,
          data: {
            vouchers: vouchers.map((voucher) => ({
              id: voucher.id,
              partnerId: 'p-1',
              categoryId: 1,
              name: voucher.title,
              description: 'Description',
              imageUrl: null,
              originalPrice: voucher.originalPrice,
              salePrice: voucher.salePrice,
              saleStart: '2027-01-01T00:00:00.000Z',
              saleEnd: '2027-02-01T00:00:00.000Z',
              usageStart: '2027-01-01T00:00:00.000Z',
              usageEnd: '2027-03-01T00:00:00.000Z',
              totalQuantity: voucher.totalQuantity,
              remainingQuantity: voucher.totalQuantity - voucher.soldQuantity,
              isMultiUse: false,
              usesPerCode: null,
              status: voucher.status,
              rejectReason: null,
              partner: { id: 'p-1', legalName: 'Partner' },
              category: { id: 1, name: voucher.category, parentId: null },
              branches: [],
              soldQuantity: voucher.soldQuantity,
              createdAt: voucher.createdAt,
              updatedAt: voucher.createdAt
            })),
            pagination: { page: 1, limit: 100, total: vouchers.length }
          }
        }
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
      [makeBranch(), makeBranch({ id: 2 })],
      [
        makeVoucher({ id: 'v-1', status: 'ON_SALE', salePrice: '100', soldQuantity: 2 }),
        makeVoucher({ id: 'v-2', status: 'DRAFT', salePrice: '50', soldQuantity: 0 }),
        makeVoucher({ id: 'v-3', status: 'ON_SALE', salePrice: '10', soldQuantity: 5 })
      ]
    )

    expect(stats.totalBranches).toBe(2)
    expect(stats.activeBranches).toBe(2)
    expect(stats.totalVouchers).toBe(3)
    expect(stats.approvedVouchers).toBe(2)
    expect(stats.unitsSold).toBe(7)
    // 100*2 + 50*0 + 10*5 = 250
    expect(stats.grossSales).toBe(250)
    expect(stats.vouchersByStatus).toEqual({ ON_SALE: 2, DRAFT: 1 })
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
      [makeBranch(), makeBranch({ id: 2 })],
      [
        makeVoucher({ id: 'v-1', status: 'ON_SALE', soldQuantity: 4 }),
        makeVoucher({ id: 'v-2', status: 'DRAFT', soldQuantity: 0 })
      ]
    )

    renderPage()

    // Every persisted branch is active in the current schema.
    expect(await screen.findByText('2 / 2')).toBeDefined()
    // Units sold card.
    expect(screen.getByText('4')).toBeDefined()
    // Status breakdown lists both statuses.
    expect(screen.getByText('Đang bán')).toBeDefined()
    expect(screen.getByText('Bản nháp')).toBeDefined()
  })

  it('loads dashboard vouchers across every page without a request burst', async () => {
    const getSpy = vi.spyOn(api, 'get').mockImplementation((_url, config) => {
      const page = (config as { params: { page: number } }).params.page
      const voucher = makeVoucher({ id: `v-${page}` })
      return Promise.resolve({
        data: {
          success: true,
          data: {
            vouchers: [
              {
                id: voucher.id,
                name: voucher.title,
                category: { name: voucher.category },
                originalPrice: voucher.originalPrice,
                salePrice: voucher.salePrice,
                totalQuantity: voucher.totalQuantity,
                soldQuantity: voucher.soldQuantity,
                status: voucher.status,
                createdAt: voucher.createdAt
              }
            ],
            pagination: { page, limit: 100, total: 101 }
          }
        }
      } as never)
    })

    const result = await fetchAllPartnerVouchers(100)

    expect(result.vouchers.map(({ id }) => id)).toEqual(['v-1', 'v-2'])
    expect(getSpy).toHaveBeenNthCalledWith(1, '/partner/vouchers', { params: { page: 1, limit: 100 } })
    expect(getSpy).toHaveBeenNthCalledWith(2, '/partner/vouchers', { params: { page: 2, limit: 100 } })
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
