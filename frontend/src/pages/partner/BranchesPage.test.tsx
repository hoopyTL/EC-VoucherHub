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
      name: 'Name is required',
      address: 'Address is required',
      region: 'Region is required'
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
    expect(within(airportRow).getByRole('button', { name: 'Edit Airport' })).toBeDefined()
    expect(within(airportRow).getByRole('button', { name: 'Delete Airport' })).toBeDefined()
  })

  it('shows the empty state when there are no branches', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data: [] } } as never)
    renderPage()

    expect(await screen.findByText(/haven't added any branches yet/i)).toBeDefined()
  })

  it('validates the add form before submitting (Req 7.1)', async () => {
    const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data: [] } } as never)
    const postSpy = vi.spyOn(api, 'post')
    renderPage()
    await screen.findByText(/haven't added any branches yet/i)

    fireEvent.click(screen.getByRole('button', { name: /add your first branch/i }))
    // Submit with empty fields -> validation errors, no network call.
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add branch' }))

    expect(await screen.findByText('Name is required')).toBeDefined()
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
    await screen.findByText(/haven't added any branches yet/i)

    fireEvent.click(screen.getByRole('button', { name: /add your first branch/i }))
    fireEvent.change(screen.getByLabelText(/branch name/i), {
      target: { value: 'New Branch' }
    })
    fireEvent.change(screen.getByLabelText(/address/i), {
      target: { value: '99 New St' }
    })
    fireEvent.change(screen.getByLabelText(/region/i), {
      target: { value: 'Đà Nẵng' }
    })
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Add branch' }))

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith('/partner/branches', {
        name: 'New Branch',
        address: '99 New St',
        region: 'Đà Nẵng'
      })
    })
    // List refetched after the mutation.
    await waitFor(() => expect(getSpy).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('Branch added.')).toBeDefined()
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

    fireEvent.click(screen.getByRole('button', { name: /edit downtown/i }))
    const nameInput = screen.getByLabelText(/branch name/i) as HTMLInputElement
    expect(nameInput.value).toBe('Downtown')
    fireEvent.change(nameInput, { target: { value: 'Uptown' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

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

    fireEvent.click(screen.getByRole('button', { name: /delete downtown/i }))
    // Confirm in the modal (the modal's primary action button).
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith('/partner/branches/1')
    })
    expect(await screen.findByText('Branch deleted.')).toBeDefined()
  })

  it('surfaces a server error when saving fails', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data: [] } } as never)
    vi.spyOn(api, 'post').mockRejectedValue({
      response: { status: 400, data: { error: { message: 'Branch name taken' } } }
    })

    renderPage()
    await screen.findByText(/haven't added any branches yet/i)

    fireEvent.click(screen.getByRole('button', { name: /add your first branch/i }))
    fireEvent.change(screen.getByLabelText(/branch name/i), {
      target: { value: 'Dup' }
    })
    fireEvent.change(screen.getByLabelText(/address/i), {
      target: { value: 'Addr' }
    })
    fireEvent.change(screen.getByLabelText(/region/i), {
      target: { value: 'Hà Nội' }
    })
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Add branch' }))

    expect(await screen.findByText('Branch name taken')).toBeDefined()
  })
})
