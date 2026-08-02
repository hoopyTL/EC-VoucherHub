import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RedeemCodePage, resolveRedeemError, type PartnerBranch, type RedemptionResult } from './RedeemCodePage'
import { api } from '../../services/api'

function makeBranch(overrides: Partial<PartnerBranch> = {}): PartnerBranch {
  return {
    id: 'b-1',
    name: 'Downtown Spa',
    address: '1 Main St',
    region: 'Hà Nội',
    contact: '0123456789',
    isActive: true,
    ...overrides
  }
}

function makeResult(overrides: Partial<RedemptionResult> = {}): RedemptionResult {
  return {
    id: 'code-1',
    code: 'SPA-AAAA-1111',
    status: 'USED',
    redeemedAt: '2025-06-01T10:30:00.000Z',
    redemptionBranchId: 'b-1',
    ...overrides
  }
}

function renderPage(initialEntry = '/partner/redeem') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <RedeemCodePage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

/** Build an Axios-like error carrying the backend's structured envelope. */
function apiError(status: number, message: string) {
  return { response: { status, data: { error: { code: 'ERR', message } } } }
}

describe('RedeemCodePage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('prefills the code from the query param and lists branches', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: [makeBranch()] } as never)

    renderPage('/partner/redeem?code=SPA-AAAA-1111')

    await waitFor(() => {
      expect(screen.getByTestId('branch-select')).toBeDefined()
    })
    expect(screen.getByTestId('redeem-code-input')).toHaveProperty('value', 'SPA-AAAA-1111')
    expect(screen.getByRole('option', { name: /Downtown Spa/ })).toBeDefined()
  })

  it('only lists active branches in the selector (Req 19.3)', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: [
        makeBranch({ id: 'b-1', name: 'Active Branch', isActive: true }),
        makeBranch({ id: 'b-2', name: 'Closed Branch', isActive: false })
      ]
    } as never)

    renderPage()

    await waitFor(() => expect(screen.getByTestId('branch-select')).toBeDefined())
    expect(screen.getByRole('option', { name: /Active Branch/ })).toBeDefined()
    expect(screen.queryByRole('option', { name: /Closed Branch/ })).toBeNull()
  })

  it('redeems a code at the selected branch and shows the result (Req 19.1)', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: [makeBranch()] } as never)
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: makeResult() } as never)

    renderPage('/partner/redeem?code=SPA-AAAA-1111')

    await waitFor(() => expect(screen.getByTestId('branch-select')).toBeDefined())
    fireEvent.change(screen.getByTestId('branch-select'), { target: { value: 'b-1' } })
    fireEvent.click(screen.getByRole('button', { name: /xác nhận sử dụng/i }))

    const success = await screen.findByTestId('redeem-success')
    expect(success.textContent).toMatch(/đã xác nhận sử dụng mã/i)
    expect(success.textContent).toMatch(/Downtown Spa/)
    expect(post).toHaveBeenCalledWith('/partner/redeem-code', {
      code: 'SPA-AAAA-1111',
      branchId: 'b-1'
    })
  })

  it('shows the already-redeemed message for a used code (Req 19.2)', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: [makeBranch()] } as never)
    vi.spyOn(api, 'post').mockRejectedValue(apiError(409, 'This voucher code has already been redeemed'))

    renderPage('/partner/redeem?code=USED-CODE')
    await waitFor(() => expect(screen.getByTestId('branch-select')).toBeDefined())
    fireEvent.change(screen.getByTestId('branch-select'), { target: { value: 'b-1' } })
    fireEvent.click(screen.getByRole('button', { name: /xác nhận sử dụng/i }))

    expect((await screen.findByTestId('redeem-error')).textContent).toMatch(/already been redeemed/i)
  })

  it('shows the branch-not-owned message (Req 19.3)', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: [makeBranch()] } as never)
    vi.spyOn(api, 'post').mockRejectedValue(apiError(403, 'The selected branch does not belong to your account'))

    renderPage('/partner/redeem?code=SPA-AAAA-1111')
    await waitFor(() => expect(screen.getByTestId('branch-select')).toBeDefined())
    fireEvent.change(screen.getByTestId('branch-select'), { target: { value: 'b-1' } })
    fireEvent.click(screen.getByRole('button', { name: /xác nhận sử dụng/i }))

    expect((await screen.findByTestId('redeem-error')).textContent).toMatch(/does not belong to your account/i)
  })

  it('keeps the confirm button disabled until a branch is selected', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: [makeBranch()] } as never)

    renderPage('/partner/redeem?code=SPA-AAAA-1111')
    await waitFor(() => expect(screen.getByTestId('branch-select')).toBeDefined())

    expect(screen.getByRole('button', { name: /xác nhận sử dụng/i })).toHaveProperty('disabled', true)

    fireEvent.change(screen.getByTestId('branch-select'), { target: { value: 'b-1' } })
    expect(screen.getByRole('button', { name: /xác nhận sử dụng/i })).toHaveProperty('disabled', false)
  })

  it('shows guidance when the partner has no active branches', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: [makeBranch({ isActive: false })]
    } as never)

    renderPage()
    expect(await screen.findByText(/chưa có chi nhánh đang hoạt động/i)).toBeDefined()
  })
})

describe('resolveRedeemError', () => {
  it('prefers the backend message when present', () => {
    expect(resolveRedeemError(apiError(409, 'This voucher code has been cancelled'))).toBe(
      'This voucher code has been cancelled'
    )
  })

  it('returns a network message when there is no response', () => {
    expect(resolveRedeemError(new Error('network'))).toMatch(/không thể kết nối máy chủ/i)
  })

  it('falls back to a generic message for a response without a message', () => {
    expect(resolveRedeemError({ response: { status: 500, data: {} } })).toMatch(/không thể xác nhận mã này/i)
  })
})
