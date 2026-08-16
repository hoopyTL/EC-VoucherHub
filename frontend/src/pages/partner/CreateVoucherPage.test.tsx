import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { api } from '../../services/api'
import { CreateVoucherPage, validateVoucherForm } from './CreateVoucherPage'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const branch = { id: 1, partnerId: 'partner-1', name: 'Downtown', address: '1 Main St', region: 'Hà Nội' }
const category = { id: 7, name: 'Ẩm thực', parentId: null }

function mockReferenceData() {
  return vi.spyOn(api, 'get').mockImplementation((url) => {
    if (url === '/categories') return Promise.resolve({ data: { success: true, data: [category] } }) as never
    return Promise.resolve({ data: { success: true, data: [branch] } }) as never
  })
}

function wireVoucher(overrides: Record<string, unknown> = {}) {
  return {
    id: 'voucher-1',
    partnerId: 'partner-1',
    categoryId: category.id,
    name: 'Spa Day',
    description: 'A relaxing spa package',
    imageUrl: null,
    originalPrice: '500000',
    salePrice: '350000',
    saleStart: '2027-01-01T02:00:00.000Z',
    saleEnd: '2027-02-01T02:00:00.000Z',
    usageStart: '2027-01-01T02:00:00.000Z',
    usageEnd: '2027-03-01T02:00:00.000Z',
    totalQuantity: 100,
    remainingQuantity: 100,
    isMultiUse: false,
    usesPerCode: null,
    status: 'DRAFT',
    rejectReason: null,
    partner: { id: 'partner-1', legalName: 'Demo Partner' },
    category,
    branches: [branch],
    soldQuantity: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  }
}

function renderPage(initialEntry = '/partner/vouchers/new') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path='/partner/vouchers/new' element={<CreateVoucherPage />} />
          <Route path='/partner/vouchers/:id/edit' element={<CreateVoucherPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

function fillValidForm() {
  fireEvent.change(screen.getByLabelText(/^tiêu đề/i), { target: { value: 'Spa Day' } })
  fireEvent.change(screen.getByLabelText(/^mô tả/i), { target: { value: 'A relaxing spa package' } })
  fireEvent.change(screen.getByLabelText(/giá gốc/i), { target: { value: '500000' } })
  fireEvent.change(screen.getByLabelText(/giá bán/i), { target: { value: '350000' } })
  fireEvent.change(screen.getByLabelText(/tổng số lượng/i), { target: { value: '100' } })
  fireEvent.change(screen.getByLabelText(/bắt đầu mở bán/i), { target: { value: '2027-01-01T09:00' } })
  fireEvent.change(screen.getByLabelText(/kết thúc mở bán/i), { target: { value: '2027-02-01T09:00' } })
  fireEvent.change(screen.getByLabelText(/bắt đầu sử dụng/i), { target: { value: '2027-01-01T09:00' } })
  fireEvent.change(screen.getByLabelText(/kết thúc sử dụng/i), { target: { value: '2027-03-01T09:00' } })
}

describe('CreateVoucherPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    mockNavigate.mockReset()
  })

  it('loads canonical categories and partner branches', async () => {
    mockReferenceData()
    renderPage()

    expect(await screen.findByText('Downtown')).toBeDefined()
    expect(screen.getByRole('option', { name: 'Ẩm thực' })).toBeDefined()
  })

  it('rejects invalid price and missing branch before calling the API', async () => {
    mockReferenceData()
    const postSpy = vi.spyOn(api, 'post')
    renderPage()
    await screen.findByText('Downtown')
    fillValidForm()
    fireEvent.change(screen.getByLabelText(/giá bán/i), { target: { value: '600000' } })
    fireEvent.click(screen.getByRole('button', { name: /lưu bản nháp/i }))

    expect(await screen.findByText(/giá bán phải thấp hơn giá gốc/i)).toBeDefined()
    expect(screen.getByText(/chọn ít nhất một chi nhánh/i)).toBeDefined()
    expect(postSpy).not.toHaveBeenCalled()
  })

  it('maps the UI form to the canonical create contract', async () => {
    mockReferenceData()
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ data: { success: true, data: wireVoucher() } } as never)
    renderPage()
    await screen.findByText('Downtown')
    fillValidForm()
    fireEvent.click(screen.getByLabelText(/cho phép một mã sử dụng nhiều lượt/i))
    fireEvent.change(screen.getByLabelText(/số lượt mỗi mã/i), { target: { value: '3' } })
    fireEvent.click(screen.getByLabelText(/Downtown/))
    fireEvent.click(screen.getByRole('button', { name: /lưu bản nháp/i }))

    await waitFor(() => expect(postSpy).toHaveBeenCalledTimes(1))
    expect(postSpy).toHaveBeenCalledWith(
      '/vouchers',
      expect.objectContaining({
        categoryId: 7,
        name: 'Spa Day',
        branchIds: [1],
        isMultiUse: true,
        usesPerCode: 3,
        saleStart: expect.any(String)
      })
    )
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/partner/vouchers'))
  })

  it('clears uses per code when editing a multi-use voucher to single-use', async () => {
    vi.spyOn(api, 'get').mockImplementation((url) => {
      if (url === '/partner/vouchers/voucher-1') {
        return Promise.resolve({
          data: { success: true, data: wireVoucher({ isMultiUse: true, usesPerCode: 3 }) }
        }) as never
      }
      if (url === '/categories') return Promise.resolve({ data: { success: true, data: [category] } }) as never
      return Promise.resolve({ data: { success: true, data: [branch] } }) as never
    })
    const patchSpy = vi.spyOn(api, 'patch').mockResolvedValue({ data: { success: true, data: wireVoucher() } } as never)
    renderPage('/partner/vouchers/voucher-1/edit')

    const toggle = await screen.findByLabelText(/cho phép một mã sử dụng nhiều lượt/i)
    await waitFor(() => expect((toggle as HTMLInputElement).checked).toBe(true))
    fireEvent.click(toggle)
    fireEvent.click(screen.getByRole('button', { name: /lưu thay đổi/i }))

    await waitFor(() =>
      expect(patchSpy).toHaveBeenCalledWith(
        '/vouchers/voucher-1',
        expect.objectContaining({ isMultiUse: false, usesPerCode: null })
      )
    )
  })
})

describe('validateVoucherForm', () => {
  const base = {
    title: 'Spa Day',
    description: 'desc',
    category: '7',
    originalPrice: '500000',
    salePrice: '350000',
    totalQuantity: '100',
    isMultiUse: false,
    usesPerCode: '',
    salePeriodStart: '2027-01-01T09:00',
    salePeriodEnd: '2027-02-01T09:00',
    usagePeriodStart: '2027-01-01T09:00',
    usagePeriodEnd: '2027-03-01T09:00',
    imageUrl: ''
  }

  it('accepts a complete canonical form and rejects invalid date ranges', () => {
    expect(validateVoucherForm(base, ['1'])).toEqual({})
    expect(validateVoucherForm({ ...base, salePeriodEnd: base.salePeriodStart }, ['1']).salePeriodEnd).toBeDefined()
    expect(validateVoucherForm({ ...base, usagePeriodEnd: base.usagePeriodStart }, ['1']).usagePeriodEnd).toBeDefined()
  })
})
