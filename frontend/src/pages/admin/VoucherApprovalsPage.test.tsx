import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ToastProvider } from '../../components/ui'
import { api } from '../../services/api'
import { VoucherApprovalsPage } from './VoucherApprovalsPage'

function wireVoucher(status = 'PENDING_REVIEW') {
  return {
    id: 'v-1',
    partnerId: 'p-1',
    categoryId: 3,
    name: 'Spa Day Pass',
    description: 'A relaxing day at the spa.',
    imageUrl: null,
    originalPrice: '500000.00',
    salePrice: '350000.00',
    totalQuantity: 100,
    remainingQuantity: 100,
    saleStart: '2027-01-01T00:00:00.000Z',
    saleEnd: '2027-02-01T00:00:00.000Z',
    usageStart: '2027-01-01T00:00:00.000Z',
    usageEnd: '2027-03-01T00:00:00.000Z',
    isMultiUse: false,
    usesPerCode: null,
    status,
    rejectReason: null,
    partner: { id: 'p-1', legalName: 'Serenity Spa' },
    category: { id: 3, name: 'Beauty Spa', parentId: null },
    branches: [],
    soldQuantity: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
}

function result(vouchers = [wireVoucher()]) {
  return { success: true, data: { vouchers, pagination: { page: 1, limit: 20, total: vouchers.length } } }
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
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
  afterEach(() => vi.restoreAllMocks())

  it('loads pending reviews from the canonical filtered endpoint', async () => {
    const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ data: result() } as never)
    renderPage()

    expect(await screen.findByText('Spa Day Pass')).toBeDefined()
    expect(screen.getByText('Serenity Spa')).toBeDefined()
    expect(getSpy).toHaveBeenCalledWith('/admin/vouchers', {
      params: { page: 1, limit: 20, status: 'PENDING_REVIEW' }
    })
  })

  it('opens canonical voucher details', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: result() } as never)
    renderPage()
    await screen.findByText('Spa Day Pass')
    fireEvent.click(screen.getByRole('button', { name: /view spa day pass/i }))

    expect(within(screen.getByRole('dialog')).getByText(/a relaxing day at the spa/i)).toBeDefined()
  })

  it('approves through the shared approval endpoint and refreshes', async () => {
    vi.spyOn(api, 'get')
      .mockResolvedValueOnce({ data: result() } as never)
      .mockResolvedValueOnce({ data: result([]) } as never)
    const patchSpy = vi.spyOn(api, 'patch').mockResolvedValue({
      data: { success: true, data: wireVoucher('APPROVED') }
    } as never)
    renderPage()
    await screen.findByText('Spa Day Pass')
    fireEvent.click(screen.getByRole('button', { name: /approve spa day pass/i }))

    await waitFor(() => expect(patchSpy).toHaveBeenCalledWith('/admin/vouchers/v-1/approval', { action: 'approve' }))
    expect(await screen.findByText(/spa day pass.*has been approved/i)).toBeDefined()
  })

  it('requires and sends a rejection reason through the canonical endpoint', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: result() } as never)
    const patchSpy = vi.spyOn(api, 'patch').mockResolvedValue({
      data: { success: true, data: { ...wireVoucher('REJECTED'), rejectReason: 'Price too low' } }
    } as never)
    renderPage()
    await screen.findByText('Spa Day Pass')
    fireEvent.click(screen.getByRole('button', { name: /reject spa day pass/i }))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /reject voucher/i }))
    expect(await within(dialog).findByText(/a rejection reason is required/i)).toBeDefined()

    fireEvent.change(within(dialog).getByLabelText(/rejection reason/i), { target: { value: 'Price too low' } })
    fireEvent.click(within(dialog).getByRole('button', { name: /reject voucher/i }))
    await waitFor(() =>
      expect(patchSpy).toHaveBeenCalledWith('/admin/vouchers/v-1/approval', {
        action: 'reject',
        reason: 'Price too low'
      })
    )
  })
})
