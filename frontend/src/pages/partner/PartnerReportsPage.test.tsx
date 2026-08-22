import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../services/api'
import { PartnerReportsPage } from './PartnerReportsPage'

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <PartnerReportsPage />
    </QueryClientProvider>
  )
}

describe('PartnerReportsPage', () => {
  afterEach(() => vi.restoreAllMocks())

  it('renders real partner totals and per-voucher metrics', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: {
        success: true,
        data: {
          summary: { revenue: 240000, issuedCount: 3, soldCount: 3, usedCount: 2, usageRate: 2 / 3 },
          vouchers: [
            {
              id: 'v-1',
              name: 'Spa Day',
              status: 'ON_SALE',
              revenue: 240000,
              issuedCount: 3,
              soldCount: 3,
              usedCount: 2,
              usageRate: 2 / 3
            }
          ]
        }
      }
    } as never)
    renderPage()
    expect((await screen.findAllByText('Spa Day')).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/240\.000/).length).toBeGreaterThan(0)
    expect(screen.getAllByText('67%').length).toBeGreaterThan(0)
    expect(screen.getByTestId('report-voucher-v-1')).toBeDefined()
  })

  it('shows an empty state when the partner has no vouchers', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: {
        success: true,
        data: { summary: { revenue: 0, issuedCount: 0, soldCount: 0, usedCount: 0, usageRate: 0 }, vouchers: [] }
      }
    } as never)
    renderPage()
    expect(await screen.findByText(/chưa có voucher để lập báo cáo/i)).toBeDefined()
  })

  it('shows a retryable error state', async () => {
    vi.spyOn(api, 'get').mockRejectedValue(new Error('network'))
    renderPage()
    expect(await screen.findByRole('alert')).toBeDefined()
    expect(screen.getByRole('button', { name: /thử lại/i })).toBeDefined()
  })
})
