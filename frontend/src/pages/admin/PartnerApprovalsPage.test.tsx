import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PartnerApprovalsPage } from './PartnerApprovalsPage'
import { ToastProvider } from '../../components/ui'
import { api } from '../../services/api'
import type { ListPendingPartnersResult, PartnerApprovalView } from '../../types/admin'

function makePartner(overrides: Partial<PartnerApprovalView> = {}): PartnerApprovalView {
  return {
    id: 'p-1',
    ownerUserId: 'u-1',
    legalName: 'Saigon Food',
    taxCode: 'TAX-456',
    representative: 'Dang Quoc Huy',
    approvalStatus: 'PENDING',
    rejectReason: null,
    operatingStatus: 'ACTIVE',
    branches: [{ id: 1, partnerId: 'p-1', name: 'District 1', address: '1 Main St', region: 'Hồ Chí Minh' }],
    owner: {
      email: 'biz@example.com',
      phone: '0987654321',
      fullName: 'Dang Quoc Huy'
    },
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides
  }
}

function makeResult(overrides: Partial<ListPendingPartnersResult> = {}): ListPendingPartnersResult {
  const partners = overrides.partners ?? [makePartner()]
  return {
    partners,
    pagination: {
      page: 1,
      limit: 20,
      total: partners.length,
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
          <PartnerApprovalsPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}

describe('PartnerApprovalsPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('lists pending partners with their details (Req 6.1)', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data: makeResult() } } as never)
    renderPage()

    expect(await screen.findByText('Saigon Food')).toBeDefined()
    expect(screen.getByText('TAX-456')).toBeDefined()
    expect(screen.getByText('Dang Quoc Huy')).toBeDefined()
  })

  it('requests the pending-partners endpoint', async () => {
    const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data: makeResult() } } as never)
    renderPage()
    await screen.findByText('Saigon Food')

    expect(getSpy).toHaveBeenCalledWith('/admin/partners/pending', {
      params: { page: 1, limit: 20 }
    })
  })

  it('shows an empty state when there are no pending partners', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { success: true, data: makeResult({ partners: [] }) }
    } as never)
    renderPage()

    expect(await screen.findByText(/không có đối tác đang chờ duyệt/i)).toBeDefined()
  })

  it('approves a partner and refreshes the list (Req 6.2)', async () => {
    let pendingRequestCount = 0
    vi.spyOn(api, 'get').mockImplementation(async (url) => {
      if (url === '/admin/partners/pending') {
        pendingRequestCount += 1
        return {
          data: { success: true, data: makeResult(pendingRequestCount > 1 ? { partners: [] } : {}) }
        } as never
      }
      return { data: { success: true, data: makeResult() } } as never
    })
    const patchSpy = vi.spyOn(api, 'patch').mockResolvedValue({
      data: { success: true, data: makePartner({ approvalStatus: 'APPROVED' }) }
    } as never)

    renderPage()
    await screen.findByText('Saigon Food')

    fireEvent.click(screen.getByRole('button', { name: /duyệt saigon food/i }))

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledWith('/admin/partners/p-1/approval', { action: 'approve' })
    })
    await waitFor(() => expect(pendingRequestCount).toBe(2))
    expect(await screen.findByText(/đã duyệt saigon food/i)).toBeDefined()
  })

  it('requires a reason before rejecting (Req 6.3)', async () => {
    const patchSpy = vi.spyOn(api, 'patch')
    vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data: makeResult() } } as never)

    renderPage()
    await screen.findByText('Saigon Food')

    fireEvent.click(screen.getByRole('button', { name: /từ chối saigon food/i }))
    const dialog = screen.getByRole('dialog')
    // Submit without a reason → validation blocks the API call.
    fireEvent.click(within(dialog).getByRole('button', { name: /từ chối đối tác/i }))

    expect(await within(dialog).findByText(/a rejection reason is required/i)).toBeDefined()
    expect(patchSpy).not.toHaveBeenCalled()
  })

  it('rejects a partner with a reason (Req 6.3)', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data: makeResult() } } as never)
    const patchSpy = vi.spyOn(api, 'patch').mockResolvedValue({
      data: { success: true, data: makePartner({ approvalStatus: 'REJECTED', rejectReason: 'Invalid tax id' }) }
    } as never)

    renderPage()
    await screen.findByText('Saigon Food')

    fireEvent.click(screen.getByRole('button', { name: /từ chối saigon food/i }))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(/lý do từ chối/i), {
      target: { value: 'Invalid tax id' }
    })
    fireEvent.click(within(dialog).getByRole('button', { name: /từ chối đối tác/i }))

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledWith('/admin/partners/p-1/approval', {
        action: 'reject',
        reason: 'Invalid tax id'
      })
    })
    expect(await screen.findByText(/đã từ chối saigon food/i)).toBeDefined()
  })

  it('shows an error alert when the list request fails', async () => {
    vi.spyOn(api, 'get').mockRejectedValue(new Error('boom'))
    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined()
    })
  })
})
