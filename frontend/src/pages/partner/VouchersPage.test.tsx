import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { api } from '../../services/api'
import { availableActions, type PartnerVoucher } from '../../services/partnerVoucher'
import { VouchersPage } from './VouchersPage'

function makeVoucher(overrides: Partial<PartnerVoucher> = {}): PartnerVoucher {
  return {
    id: 'voucher-1',
    title: 'Spa Day',
    description: 'Relaxing spa package',
    category: 'Spa & Beauty',
    categoryId: 1,
    originalPrice: '500000',
    salePrice: '350000',
    totalQuantity: 100,
    soldQuantity: 20,
    isMultiUse: false,
    usesPerCode: null,
    salePeriodStart: '2027-01-01T00:00:00.000Z',
    salePeriodEnd: '2027-02-01T00:00:00.000Z',
    usagePeriodStart: '2027-01-01T00:00:00.000Z',
    usagePeriodEnd: '2027-03-01T00:00:00.000Z',
    terms: null,
    imageUrl: null,
    status: 'DRAFT',
    rejectionReason: null,
    partnerId: 'partner-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    voucherBranches: [],
    ...overrides
  }
}

function toWire(voucher: PartnerVoucher) {
  return {
    id: voucher.id,
    partnerId: voucher.partnerId,
    categoryId: voucher.categoryId,
    name: voucher.title,
    description: voucher.description,
    imageUrl: voucher.imageUrl,
    originalPrice: voucher.originalPrice,
    salePrice: voucher.salePrice,
    saleStart: voucher.salePeriodStart,
    saleEnd: voucher.salePeriodEnd,
    usageStart: voucher.usagePeriodStart,
    usageEnd: voucher.usagePeriodEnd,
    totalQuantity: voucher.totalQuantity,
    remainingQuantity: voucher.totalQuantity - voucher.soldQuantity,
    isMultiUse: false,
    usesPerCode: null,
    status: voucher.status,
    rejectReason: voucher.rejectionReason,
    partner: { id: voucher.partnerId, legalName: 'Demo Partner' },
    category: { id: voucher.categoryId ?? 1, name: voucher.category, parentId: null },
    branches: [],
    soldQuantity: voucher.soldQuantity,
    createdAt: voucher.createdAt,
    updatedAt: voucher.updatedAt
  }
}

function mockList(vouchers: PartnerVoucher[]) {
  return vi.spyOn(api, 'get').mockResolvedValue({
    data: {
      success: true,
      data: { vouchers: vouchers.map(toWire), pagination: { page: 1, limit: 20, total: vouchers.length } }
    }
  } as never)
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/partner/vouchers']}>
        <VouchersPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('VouchersPage', () => {
  afterEach(() => vi.restoreAllMocks())

  it('renders canonical voucher data and the empty state', async () => {
    mockList([makeVoucher()])
    renderPage()
    expect(await screen.findByText('Spa Day')).toBeDefined()
    expect(screen.getByText('Bản nháp')).toBeDefined()
  })

  it('submits a draft through the canonical submission endpoint', async () => {
    const voucher = makeVoucher({ status: 'DRAFT' })
    mockList([voucher])
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({
      data: { success: true, data: toWire({ ...voucher, status: 'PENDING_REVIEW' }) }
    } as never)
    renderPage()

    const row = await screen.findByTestId('voucher-row-voucher-1')
    expect(within(row).queryByRole('button', { name: /^hủy$/i })).toBeNull()
    fireEvent.click(within(row).getByRole('button', { name: /gửi duyệt/i }))
    await waitFor(() => expect(postSpy).toHaveBeenCalledWith('/vouchers/voucher-1/submission'))
  })

  it('pauses and resumes only sale-state vouchers', async () => {
    const voucher = makeVoucher({ status: 'ON_SALE' })
    mockList([voucher])
    const patchSpy = vi.spyOn(api, 'patch').mockResolvedValue({
      data: { success: true, data: toWire({ ...voucher, status: 'PAUSED' }) }
    } as never)
    renderPage()

    fireEvent.click(
      within(await screen.findByTestId('voucher-row-voucher-1')).getByRole('button', { name: /tạm dừng/i })
    )
    await waitFor(() => expect(patchSpy).toHaveBeenCalledWith('/vouchers/voucher-1/status', { action: 'pause' }))
  })

  it('returns a rejected voucher to draft before editing or resubmitting', async () => {
    const voucher = makeVoucher({ status: 'REJECTED', rejectionReason: 'Price too high' })
    mockList([voucher])
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({
      data: { success: true, data: toWire({ ...voucher, status: 'DRAFT' }) }
    } as never)
    renderPage()

    expect(await screen.findByText(/Lý do từ chối: Price too high/i)).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: /đưa về nháp/i }))
    await waitFor(() => expect(postSpy).toHaveBeenCalledWith('/vouchers/voucher-1/draft'))
  })

  it('shows no action for admin-controlled or terminal states', async () => {
    mockList([makeVoucher({ status: 'PENDING_REVIEW' })])
    renderPage()
    expect(within(await screen.findByTestId('voucher-row-voucher-1')).getByText(/không có thao tác/i)).toBeDefined()
  })

  it('keeps vouchers beyond the first page reachable', async () => {
    const voucher = makeVoucher()
    const getSpy = vi.spyOn(api, 'get').mockResolvedValue({
      data: {
        success: true,
        data: { vouchers: [toWire(voucher)], pagination: { page: 1, limit: 20, total: 21 } }
      }
    } as never)
    renderPage()
    await screen.findByText('Spa Day')
    fireEvent.click(screen.getByRole('button', { name: '2' }))

    await waitFor(() => expect(getSpy).toHaveBeenCalledWith('/partner/vouchers', { params: { page: 2, limit: 20 } }))
  })
})

describe('availableActions', () => {
  it('matches the canonical voucher state machine', () => {
    expect(availableActions('DRAFT')).toEqual(['submit'])
    expect(availableActions('REJECTED')).toEqual(['revise'])
    expect(availableActions('PENDING_REVIEW')).toEqual([])
    expect(availableActions('APPROVED')).toEqual([])
    expect(availableActions('ON_SALE')).toEqual(['pause'])
    expect(availableActions('PAUSED')).toEqual(['resume'])
    expect(availableActions('DISCONTINUED')).toEqual([])
  })
})
