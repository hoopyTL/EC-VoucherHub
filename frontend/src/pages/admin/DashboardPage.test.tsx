import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DashboardPage } from './DashboardPage'
import { api } from '../../services/api'
import type { AnalyticsOverview, DashboardStats } from '../../types/admin'

function makeStats(overrides: Partial<DashboardStats> = {}): DashboardStats {
  return {
    revenue: { total: 1000000, today: 50000, thisWeek: 200000, thisMonth: 800000 },
    ordersByStatus: { PENDING_PAYMENT: 3, PAID: 12, CANCELLED: 1 },
    topVouchers: [
      {
        voucherId: 'v-1',
        title: 'Spa Day',
        soldQuantity: 42,
        salePrice: 150000,
        partnerName: 'Zen Spa'
      }
    ],
    partnerPerformance: [
      {
        partnerId: 'p-1',
        businessName: 'Zen Spa',
        voucherCount: 5,
        orderCount: 12,
        revenue: 800000
      }
    ],
    ...overrides
  }
}

function makeAnalytics(overrides: Partial<AnalyticsOverview> = {}): AnalyticsOverview {
  return {
    windowDays: 30,
    revenueSeries: [{ date: '2026-01-01', revenue: 100, orders: 1 }],
    signupSeries: [{ date: '2026-01-01', signups: 2 }],
    categoryBreakdown: [{ category: 'Food', revenue: 100, unitsSold: 3 }],
    funnel: {
      ordersCreated: 16,
      ordersPaid: 12,
      ordersCancelled: 1,
      paidConversionRate: 0.75
    },
    ...overrides
  }
}

/**
 * Mock the two dashboard GETs. By default analytics resolves with demo data;
 * pass `analytics: 'reject'` to simulate an analytics failure.
 */
function mockStats(stats: DashboardStats, opts: { analytics?: AnalyticsOverview | 'reject' } = {}) {
  const analytics = opts.analytics ?? makeAnalytics()
  vi.spyOn(api, 'get').mockImplementation((url: string) => {
    if (url === '/admin/dashboard/stats') {
      return Promise.resolve({ data: stats } as never)
    }
    if (url === '/admin/analytics') {
      return analytics === 'reject'
        ? Promise.reject(new Error('analytics boom'))
        : Promise.resolve({ data: analytics } as never)
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

describe('DashboardPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders revenue broken down by day/week/month (Req 5.x overview)', async () => {
    mockStats(makeStats())
    renderPage()

    expect(await screen.findByText('Hôm nay')).toBeDefined()
    expect(screen.getByText('Tuần này')).toBeDefined()
    expect(screen.getByText('Tháng này')).toBeDefined()
    expect(screen.getByText('Toàn thời gian')).toBeDefined()
  })

  it('renders the orders-by-status breakdown', async () => {
    mockStats(makeStats())
    renderPage()

    // Status labels are title-cased.
    expect(await screen.findByText('Chờ thanh toán')).toBeDefined()
    expect(screen.getByText('Đã thanh toán')).toBeDefined()
    expect(screen.getByText('Đã hủy')).toBeDefined()
  })

  it('renders the top vouchers and partner performance tables', async () => {
    mockStats(makeStats())
    renderPage()

    const topRow = await screen.findByTestId('top-voucher-v-1')
    expect(within(topRow).getByText('Spa Day')).toBeDefined()
    expect(within(topRow).getByText('42')).toBeDefined()

    const partnerRow = screen.getByTestId('partner-p-1')
    // Order count for the partner.
    expect(within(partnerRow).getByText('12')).toBeDefined()
    // Voucher count for the partner.
    expect(within(partnerRow).getByText('5')).toBeDefined()
  })

  it('shows empty states when there is no sales data', async () => {
    mockStats(makeStats({ topVouchers: [], partnerPerformance: [] }))
    renderPage()

    expect(await screen.findByText(/chưa có voucher nào được bán/i)).toBeDefined()
    expect(screen.getByText(/chưa có đối tác đăng ký/i)).toBeDefined()
  })

  it('shows an error alert when the request fails', async () => {
    vi.spyOn(api, 'get').mockRejectedValue(new Error('boom'))
    renderPage()

    await waitFor(() => {
      // Both the stats and analytics queries fail → at least one alert shown.
      expect(screen.getAllByRole('alert').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('renders the analytics charts (revenue trend + conversion)', async () => {
    mockStats(makeStats())
    renderPage()

    expect(await screen.findByText(/Doanh thu \(30 ngày gần nhất\)/i)).toBeDefined()
    expect(screen.getByText(/Tỷ lệ thanh toán/i)).toBeDefined()
    // The revenue category bar list renders the seeded category.
    expect(screen.getByText('Food')).toBeDefined()
  })

  it('shows an analytics error without breaking the summary stats', async () => {
    mockStats(makeStats(), { analytics: 'reject' })
    renderPage()

    // Summary still renders…
    expect(await screen.findByText('Hôm nay')).toBeDefined()
    // …and the analytics section surfaces its own retry alert.
    await waitFor(() => {
      expect(screen.getByText(/không thể tải dữ liệu phân tích/i)).toBeDefined()
    })
  })
})
