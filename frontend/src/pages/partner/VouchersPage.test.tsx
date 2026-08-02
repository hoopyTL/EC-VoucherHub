import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { VouchersPage } from './VouchersPage'
import { api } from '../../services/api'
import { availableActions, type PartnerVoucher } from '../../services/partnerVoucher'

function makeVoucher(overrides: Partial<PartnerVoucher> = {}): PartnerVoucher {
  return {
    id: 'voucher-1',
    title: 'Spa Day',
    description: 'Relaxing spa package',
    category: 'Spa & Beauty',
    originalPrice: '500000',
    salePrice: '350000',
    totalQuantity: 100,
    soldQuantity: 20,
    salePeriodStart: '2025-01-01T00:00:00.000Z',
    salePeriodEnd: '2025-02-01T00:00:00.000Z',
    usagePeriodStart: '2025-01-01T00:00:00.000Z',
    usagePeriodEnd: '2025-03-01T00:00:00.000Z',
    terms: null,
    imageUrl: null,
    status: 'DRAFT',
    rejectionReason: null,
    partnerId: 'partner-1',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    voucherBranches: [],
    ...overrides
  }
}

function mockList(vouchers: PartnerVoucher[]) {
  return vi.spyOn(api, 'get').mockResolvedValue({
    data: {
      vouchers,
      pagination: { page: 1, limit: 20, total: vouchers.length }
    }
  } as never)
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/partner/vouchers']}>
        <VouchersPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('VouchersPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the voucher list with a status badge (Req 8.1)', async () => {
    mockList([makeVoucher()])

    renderPage()

    expect(await screen.findByText('Spa Day')).toBeDefined()
    // DRAFT status badge is rendered as a humanised label.
    expect(screen.getByText('Bản nháp')).toBeDefined()
  })

  it('shows an empty state when the partner has no vouchers', async () => {
    mockList([])

    renderPage()

    expect(await screen.findByText(/chưa tạo voucher nào/i)).toBeDefined()
  })

  it('shows an error alert when the request fails', async () => {
    vi.spyOn(api, 'get').mockRejectedValue(new Error('boom'))

    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/không thể tải danh sách voucher/i)).toBeDefined()
    })
  })

  it('offers submit + cancel for a DRAFT voucher and submits it (Req 9.1)', async () => {
    mockList([makeVoucher({ status: 'DRAFT' })])
    const postSpy = vi
      .spyOn(api, 'post')
      .mockResolvedValue({ data: makeVoucher({ status: 'PENDING_APPROVAL' }) } as never)

    renderPage()

    const row = await screen.findByTestId('voucher-row-voucher-1')
    expect(within(row).getByRole('button', { name: /^hủy$/i })).toBeDefined()

    fireEvent.click(within(row).getByRole('button', { name: /gửi duyệt/i }))

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith('/partner/vouchers/voucher-1/submit')
    })
  })

  it('pauses an APPROVED voucher via PATCH (Req 10.1)', async () => {
    mockList([makeVoucher({ status: 'APPROVED' })])
    const patchSpy = vi.spyOn(api, 'patch').mockResolvedValue({ data: makeVoucher({ status: 'PAUSED' }) } as never)

    renderPage()

    const row = await screen.findByTestId('voucher-row-voucher-1')
    fireEvent.click(within(row).getByRole('button', { name: /^tạm dừng$/i }))

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledWith('/partner/vouchers/voucher-1/pause')
    })
  })

  it('resumes a PAUSED voucher via PATCH (Req 10.2)', async () => {
    mockList([makeVoucher({ status: 'PAUSED' })])
    const patchSpy = vi.spyOn(api, 'patch').mockResolvedValue({ data: makeVoucher({ status: 'APPROVED' }) } as never)

    renderPage()

    const row = await screen.findByTestId('voucher-row-voucher-1')
    fireEvent.click(within(row).getByRole('button', { name: /^mở bán lại$/i }))

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledWith('/partner/vouchers/voucher-1/resume')
    })
  })

  it('confirms before cancelling a voucher (Req 10.3)', async () => {
    mockList([makeVoucher({ status: 'APPROVED' })])
    const patchSpy = vi.spyOn(api, 'patch').mockResolvedValue({ data: makeVoucher({ status: 'CANCELLED' }) } as never)

    renderPage()

    const row = await screen.findByTestId('voucher-row-voucher-1')
    fireEvent.click(within(row).getByRole('button', { name: /^hủy$/i }))

    // The PATCH must not fire until the modal is confirmed.
    expect(patchSpy).not.toHaveBeenCalled()

    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /hủy voucher/i }))

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledWith('/partner/vouchers/voucher-1/cancel')
    })
  })

  it('shows the rejection reason and a re-submit action for a REJECTED voucher', async () => {
    mockList([makeVoucher({ status: 'REJECTED', rejectionReason: 'Price too high' })])

    renderPage()

    expect(await screen.findByText(/Lý do từ chối: Price too high/i)).toBeDefined()
    const row = screen.getByTestId('voucher-row-voucher-1')
    expect(within(row).getByRole('button', { name: /gửi duyệt/i })).toBeDefined()
  })

  it('shows "No actions" for a terminal (CANCELLED) voucher', async () => {
    mockList([makeVoucher({ status: 'CANCELLED' })])

    renderPage()

    const row = await screen.findByTestId('voucher-row-voucher-1')
    expect(within(row).getByText(/không có thao tác/i)).toBeDefined()
  })
})

describe('availableActions (voucher state machine)', () => {
  it('maps each status to the valid lifecycle actions', () => {
    expect(availableActions('DRAFT')).toEqual(['submit', 'cancel'])
    expect(availableActions('REJECTED')).toEqual(['submit'])
    expect(availableActions('PENDING_APPROVAL')).toEqual(['cancel'])
    expect(availableActions('APPROVED')).toEqual(['pause', 'cancel'])
    expect(availableActions('PAUSED')).toEqual(['resume', 'cancel'])
    expect(availableActions('CANCELLED')).toEqual([])
  })
})
