import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BranchesPage, validateBranchForm } from './BranchesPage'
import { api } from '../../services/api'
import type { Branch } from '../../types/partner'

function makeBranch(overrides: Partial<Branch> = {}): Branch {
  return {
    id: 1,
    name: 'Downtown',
    address: '1 Main St',
    region: 'Hà Nội',
    partnerId: 'p-1',
    ...overrides
  }
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <BranchesPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('validateBranchForm', () => {
  it('flags every empty field', () => {
    expect(validateBranchForm({ name: '', address: '', region: '' })).toEqual({
      name: 'Tên chi nhánh là bắt buộc',
      address: 'Địa chỉ là bắt buộc',
      region: 'Khu vực là bắt buộc'
    })
  })

  it('passes a complete form', () => {
    expect(
      validateBranchForm({
        name: 'A',
        address: 'B',
        region: 'Hà Nội'
      })
    ).toEqual({})
  })
})

describe('BranchesPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('lists the partner branches (Req 7.4)', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { success: true, data: [makeBranch({ id: 1, name: 'Downtown' }), makeBranch({ id: 2, name: 'Airport' })] }
    } as never)

    renderPage()

    expect(await screen.findByText('Downtown')).toBeDefined()
    const airportRow = screen.getByTestId('branch-2')
    expect(within(airportRow).getByText('Airport')).toBeDefined()
    expect(within(airportRow).getByText('1 Main St')).toBeDefined()
    expect(within(airportRow).getByRole('button', { name: 'Chỉnh sửa Airport' })).toBeDefined()
    expect(within(airportRow).getByRole('button', { name: 'Xóa Airport' })).toBeDefined()
  })

  it('shows the empty state when there are no branches', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data: [] } } as never)
    renderPage()

    expect(await screen.findByText(/bạn chưa thêm chi nhánh nào/i)).toBeDefined()
  })

  it('validates the add form before submitting (Req 7.1)', async () => {
    const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data: [] } } as never)
    const postSpy = vi.spyOn(api, 'post')
    renderPage()
    await screen.findByText(/bạn chưa thêm chi nhánh nào/i)

    fireEvent.click(screen.getByRole('button', { name: /thêm chi nhánh đầu tiên/i }))
    // Submit with empty fields -> validation errors, no network call.
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Thêm chi nhánh' }))

    expect(await screen.findByText('Tên chi nhánh là bắt buộc')).toBeDefined()
    expect(postSpy).not.toHaveBeenCalled()
    expect(getSpy).toHaveBeenCalled()
  })

  it('creates a branch and refetches the list (Req 7.1)', async () => {
    const getSpy = vi
      .spyOn(api, 'get')
      .mockResolvedValueOnce({ data: { success: true, data: [] } } as never)
      .mockResolvedValueOnce({ data: { success: true, data: [makeBranch({ name: 'New Branch' })] } } as never)
    const postSpy = vi
      .spyOn(api, 'post')
      .mockResolvedValue({ data: { success: true, data: makeBranch({ name: 'New Branch' }) } } as never)

    renderPage()
    await screen.findByText(/bạn chưa thêm chi nhánh nào/i)

    fireEvent.click(screen.getByRole('button', { name: /thêm chi nhánh đầu tiên/i }))
    fireEvent.change(screen.getByLabelText(/tên chi nhánh/i), {
      target: { value: 'New Branch' }
    })
    fireEvent.change(screen.getByLabelText(/địa chỉ/i), {
      target: { value: '99 New St' }
    })
    fireEvent.change(screen.getByLabelText(/khu vực/i), {
      target: { value: 'Đà Nẵng' }
    })
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Thêm chi nhánh' }))

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith('/partner/branches', {
        name: 'New Branch',
        address: '99 New St',
        region: 'Đà Nẵng'
      })
    })
    // List refetched after the mutation.
    await waitFor(() => expect(getSpy).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('Đã thêm chi nhánh.')).toBeDefined()
  })

  it('edits an existing branch (Req 7.2)', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { success: true, data: [makeBranch({ id: 1, name: 'Downtown' })] }
    } as never)
    const patchSpy = vi
      .spyOn(api, 'patch')
      .mockResolvedValue({ data: { success: true, data: makeBranch({ id: 1, name: 'Uptown' }) } } as never)

    renderPage()
    await screen.findByText('Downtown')

    fireEvent.click(screen.getByRole('button', { name: /chỉnh sửa downtown/i }))
    const nameInput = screen.getByLabelText(/tên chi nhánh/i) as HTMLInputElement
    expect(nameInput.value).toBe('Downtown')
    fireEvent.change(nameInput, { target: { value: 'Uptown' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledWith('/partner/branches/1', {
        name: 'Uptown',
        address: '1 Main St',
        region: 'Hà Nội'
      })
    })
  })

  it('deletes a branch after confirmation (Req 7.3)', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { success: true, data: [makeBranch({ id: 1, name: 'Downtown' })] }
    } as never)
    const deleteSpy = vi.spyOn(api, 'delete').mockResolvedValue({ status: 204 } as never)

    renderPage()
    await screen.findByText('Downtown')

    fireEvent.click(screen.getByRole('button', { name: /xóa downtown/i }))
    // Confirm in the modal (the modal's primary action button).
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Xóa' }))

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith('/partner/branches/1')
    })
    expect(await screen.findByText('Đã xóa chi nhánh.')).toBeDefined()
  })

  it('surfaces a server error when saving fails', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data: [] } } as never)
    vi.spyOn(api, 'post').mockRejectedValue({
      response: { status: 400, data: { error: { message: 'Branch name taken' } } }
    })

    renderPage()
    await screen.findByText(/bạn chưa thêm chi nhánh nào/i)

    fireEvent.click(screen.getByRole('button', { name: /thêm chi nhánh đầu tiên/i }))
    fireEvent.change(screen.getByLabelText(/tên chi nhánh/i), {
      target: { value: 'Dup' }
    })
    fireEvent.change(screen.getByLabelText(/địa chỉ/i), {
      target: { value: 'Addr' }
    })
    fireEvent.change(screen.getByLabelText(/khu vực/i), {
      target: { value: 'Hà Nội' }
    })
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Thêm chi nhánh' }))

    expect(await screen.findByText('Branch name taken')).toBeDefined()
  })
})
