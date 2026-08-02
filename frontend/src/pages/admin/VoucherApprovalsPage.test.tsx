import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { VoucherApprovalsPage } from './VoucherApprovalsPage'
import { ToastProvider } from '../../components/ui'
import { api } from '../../services/api'
import type { ListPendingVouchersResult, VoucherApprovalView } from '../../types/admin'

function makeVoucher(overrides: Partial<VoucherApprovalView> = {}): VoucherApprovalView {
  return {
    id: 'v-1',
    title: 'Spa Day Pass',
    description: 'A relaxing day at the spa.',
    category: 'BEAUTY_SPA',
    originalPrice: '500000.00',
    salePrice: '350000.00',
    totalQuantity: 100,
    soldQuantity: 0,
    salePeriodStart: '2025-01-01T00:00:00.000Z',
    salePeriodEnd: '2025-02-01T00:00:00.000Z',
    usagePeriodStart: '2025-01-01T00:00:00.000Z',
    usagePeriodEnd: '2025-03-01T00:00:00.000Z',
    terms: 'Valid on weekdays only.',
    status: 'PENDING_APPROVAL',
    rejectionReason: null,
    partnerId: 'p-1',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    partner: { businessName: 'Serenity Spa' },
    ...overrides
  }
}

function makeResult(overrides: Partial<ListPendingVouchersResult> = {}): ListPendingVouchersResult {
  const vouchers = overrides.vouchers ?? [makeVoucher()]
  return {
    vouchers,
    pagination: {
      page: 1,
      limit: 20,
      total: vouchers.length,
      ...overrides.pagination
    }
  }
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter>
          <VoucherApprovalsPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}

describe('VoucherApprovalsPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('lists pending vouchers with partner and pricing (Req 9.2)', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: makeResult() } as never)
    renderPage()

    expect(await screen.findByText('Spa Day Pass')).toBeDefined()
    expect(screen.getByText('Serenity Spa')).toBeDefined()
    // Category is humanised.
    expect(screen.getByText('Beauty Spa')).toBeDefined()
  })

  it('requests the pending-vouchers endpoint', async () => {
    const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ data: makeResult() } as never)
    renderPage()
    await screen.findByText('Spa Day Pass')

    expect(getSpy).toHaveBeenCalledWith('/admin/vouchers/pending', {
      params: { page: 1, limit: 20 }
    })
  })

  it('shows an empty state when there are no pending vouchers', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: makeResult({ vouchers: [] })
    } as never)
    renderPage()

    expect(await screen.findByText(/no pending vouchers/i)).toBeDefined()
  })

  it('opens a detail view with full voucher fields', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: makeResult() } as never)
    renderPage()
    await screen.findByText('Spa Day Pass')

    fireEvent.click(screen.getByRole('button', { name: /view spa day pass/i }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/a relaxing day at the spa/i)).toBeDefined()
    expect(within(dialog).getByText(/valid on weekdays only/i)).toBeDefined()
  })

  it('approves a voucher and refreshes the list (Req 9.3)', async () => {
    const getSpy = vi
      .spyOn(api, 'get')
      .mockResolvedValueOnce({ data: makeResult() } as never)
      .mockResolvedValueOnce({ data: makeResult({ vouchers: [] }) } as never)
    const patchSpy = vi.spyOn(api, 'patch').mockResolvedValue({ data: makeVoucher({ status: 'APPROVED' }) } as never)

    renderPage()
    await screen.findByText('Spa Day Pass')

    fireEvent.click(screen.getByRole('button', { name: /approve spa day pass/i }))

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledWith('/admin/vouchers/v-1/approve')
    })
    await waitFor(() => expect(getSpy).toHaveBeenCalledTimes(2))
    expect(await screen.findByText(/spa day pass.*has been approved/i)).toBeDefined()
  })

  it('requires a reason before rejecting (Req 9.4)', async () => {
    const patchSpy = vi.spyOn(api, 'patch')
    vi.spyOn(api, 'get').mockResolvedValue({ data: makeResult() } as never)

    renderPage()
    await screen.findByText('Spa Day Pass')

    fireEvent.click(screen.getByRole('button', { name: /reject spa day pass/i }))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /reject voucher/i }))

    expect(await within(dialog).findByText(/a rejection reason is required/i)).toBeDefined()
    expect(patchSpy).not.toHaveBeenCalled()
  })

  it('rejects a voucher with a reason (Req 9.4)', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: makeResult() } as never)
    const patchSpy = vi.spyOn(api, 'patch').mockResolvedValue({
      data: makeVoucher({ status: 'REJECTED', rejectionReason: 'Price too low' })
    } as never)

    renderPage()
    await screen.findByText('Spa Day Pass')

    fireEvent.click(screen.getByRole('button', { name: /reject spa day pass/i }))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(/rejection reason/i), {
      target: { value: 'Price too low' }
    })
    fireEvent.click(within(dialog).getByRole('button', { name: /reject voucher/i }))

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledWith('/admin/vouchers/v-1/reject', {
        reason: 'Price too low'
      })
    })
    expect(await screen.findByText(/spa day pass.*has been rejected/i)).toBeDefined()
  })

  it('shows an error alert when the list request fails', async () => {
    vi.spyOn(api, 'get').mockRejectedValue(new Error('boom'))
    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined()
    })
  })
})
