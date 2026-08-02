import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CreateVoucherPage, validateVoucherForm } from './CreateVoucherPage'
import { api } from '../../services/api'
import type { PartnerBranch } from '../../services/partnerVoucher'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function makeBranch(overrides: Partial<PartnerBranch> = {}): PartnerBranch {
  return {
    id: 'branch-1',
    name: 'Downtown',
    address: '1 Main St',
    region: 'Hà Nội',
    contact: '0900000000',
    isActive: true,
    partnerId: 'partner-1',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides
  }
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/partner/vouchers/new']}>
        <CreateVoucherPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

/** Fill every required field with a valid baseline so individual tests can
 * override one field to exercise a single validation rule. */
function fillValidForm() {
  fireEvent.change(screen.getByLabelText(/^tiêu đề/i), {
    target: { value: 'Spa Day' }
  })
  fireEvent.change(screen.getByLabelText(/^mô tả/i), {
    target: { value: 'A relaxing spa package' }
  })
  fireEvent.change(screen.getByLabelText(/giá gốc/i), {
    target: { value: '500000' }
  })
  fireEvent.change(screen.getByLabelText(/giá bán/i), {
    target: { value: '350000' }
  })
  fireEvent.change(screen.getByLabelText(/tổng số lượng/i), {
    target: { value: '100' }
  })
  fireEvent.change(screen.getByLabelText(/bắt đầu mở bán/i), {
    target: { value: '2025-01-01T09:00' }
  })
  fireEvent.change(screen.getByLabelText(/kết thúc mở bán/i), {
    target: { value: '2025-02-01T09:00' }
  })
  fireEvent.change(screen.getByLabelText(/bắt đầu sử dụng/i), {
    target: { value: '2025-01-01T09:00' }
  })
  fireEvent.change(screen.getByLabelText(/kết thúc sử dụng/i), {
    target: { value: '2025-03-01T09:00' }
  })
}

describe('CreateVoucherPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    mockNavigate.mockReset()
  })

  it('lists the partner active branches as checkboxes (Req 8.5)', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: [makeBranch(), makeBranch({ id: 'branch-2', name: 'Inactive', isActive: false })]
    } as never)

    renderPage()

    expect(await screen.findByText(/Downtown/)).toBeDefined()
    // The inactive branch must not be offered.
    expect(screen.queryByText(/Inactive/)).toBeNull()
  })

  it('rejects a sale price >= original price (Req 8.2/8.6)', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: [makeBranch()] } as never)
    const postSpy = vi.spyOn(api, 'post')

    renderPage()
    await screen.findByText(/Downtown/)

    fillValidForm()
    fireEvent.change(screen.getByLabelText(/giá bán/i), {
      target: { value: '600000' } // >= original (500000)
    })
    fireEvent.click(screen.getByLabelText(/Downtown/))
    fireEvent.click(screen.getByRole('button', { name: /lưu bản nháp/i }))

    expect(await screen.findByText(/giá bán phải thấp hơn giá gốc/i)).toBeDefined()
    expect(postSpy).not.toHaveBeenCalled()
  })

  it('requires at least one branch (Req 8.5)', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: [makeBranch()] } as never)
    const postSpy = vi.spyOn(api, 'post')

    renderPage()
    await screen.findByText(/Downtown/)

    fillValidForm()
    // Intentionally do NOT select a branch.
    fireEvent.click(screen.getByRole('button', { name: /lưu bản nháp/i }))

    expect(await screen.findByText(/chọn ít nhất một chi nhánh/i)).toBeDefined()
    expect(postSpy).not.toHaveBeenCalled()
  })

  it('submits a valid voucher as ISO dates and navigates back (Req 8.1)', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: [makeBranch()] } as never)
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ data: { id: 'new-voucher' } } as never)

    renderPage()
    await screen.findByText(/Downtown/)

    fillValidForm()
    fireEvent.click(screen.getByLabelText(/Downtown/))
    fireEvent.click(screen.getByRole('button', { name: /lưu bản nháp/i }))

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledTimes(1)
    })

    const [url, body] = postSpy.mock.calls[0]
    expect(url).toBe('/partner/vouchers')
    expect(body).toMatchObject({
      title: 'Spa Day',
      category: 'Food & Beverage',
      originalPrice: 500000,
      salePrice: 350000,
      totalQuantity: 100,
      branchIds: ['branch-1']
    })
    // datetime-local values are converted to ISO-8601 strings.
    expect((body as { salePeriodStart: string }).salePeriodStart).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/partner/vouchers')
    })
  })

  it('surfaces a server error inline when creation fails', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: [makeBranch()] } as never)
    vi.spyOn(api, 'post').mockRejectedValue({
      response: { status: 403, data: { error: { message: 'Branch not yours' } } }
    })

    renderPage()
    await screen.findByText(/Downtown/)

    fillValidForm()
    fireEvent.click(screen.getByLabelText(/Downtown/))
    fireEvent.click(screen.getByRole('button', { name: /lưu bản nháp/i }))

    expect(await screen.findByText(/Branch not yours/i)).toBeDefined()
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})

describe('validateVoucherForm', () => {
  const base = {
    title: 'Spa Day',
    description: 'desc',
    category: 'Food & Beverage',
    originalPrice: '500000',
    salePrice: '350000',
    totalQuantity: '100',
    salePeriodStart: '2025-01-01T09:00',
    salePeriodEnd: '2025-02-01T09:00',
    usagePeriodStart: '2025-01-01T09:00',
    usagePeriodEnd: '2025-03-01T09:00',
    terms: '',
    imageUrl: ''
  }

  it('passes for a fully valid form with a branch', () => {
    expect(validateVoucherForm(base, ['branch-1'])).toEqual({})
  })

  it('flags sale price not below original (Req 8.2)', () => {
    const errors = validateVoucherForm({ ...base, salePrice: '500000' }, ['branch-1'])
    expect(errors.salePrice).toBeDefined()
  })

  it('flags sale period end not after start (Req 8.3)', () => {
    const errors = validateVoucherForm({ ...base, salePeriodEnd: '2025-01-01T09:00' }, ['branch-1'])
    expect(errors.salePeriodEnd).toBeDefined()
  })

  it('flags usage period end not after start (Req 8.4)', () => {
    const errors = validateVoucherForm({ ...base, usagePeriodEnd: '2024-12-31T09:00' }, ['branch-1'])
    expect(errors.usagePeriodEnd).toBeDefined()
  })

  it('flags a missing branch selection (Req 8.5)', () => {
    expect(validateVoucherForm(base, []).branchIds).toBeDefined()
  })

  it('flags a non-positive quantity', () => {
    expect(validateVoucherForm({ ...base, totalQuantity: '0' }, ['b']).totalQuantity).toBeDefined()
  })
})
