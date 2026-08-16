import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UsersPage, combineAccounts, isLocked } from './UsersPage'
import { api } from '../../services/api'
import type { AdminAccount, ListUsersResult } from '../../types/admin'

function makeUser(overrides: Partial<AdminAccount> = {}): AdminAccount {
  return {
    accountType: 'USER',
    id: 'u-1',
    email: 'alice@example.com',
    phone: '0123456789',
    name: 'Alice',
    role: 'CUSTOMER',
    status: 'ACTIVE',
    ...overrides
  }
}

function makePartner(overrides: Partial<AdminAccount> = {}): AdminAccount {
  return {
    accountType: 'PARTNER',
    id: 'p-1',
    email: 'biz@example.com',
    phone: '0987654321',
    name: 'Zen Spa',
    role: 'PARTNER',
    status: 'ACTIVE',
    ...overrides
  }
}

function makeResult(overrides: Partial<ListUsersResult> = {}): ListUsersResult {
  return {
    items: [makeUser(), makePartner()],
    nextCursor: null,
    ...overrides
  }
}

function backendEnvelope(result = makeResult()) {
  return {
    success: true,
    data: {
      items: result.items.map((account) => ({
        id: account.id,
        email: account.email,
        phone: account.phone,
        fullName: account.name,
        role: { name: account.role },
        status: account.status
      })),
      nextCursor: result.nextCursor
    }
  }
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('combineAccounts / isLocked', () => {
  it('merges users then partners into one list', () => {
    const result = makeResult({
      items: [makeUser({ id: 'u-1' }), makePartner({ id: 'p-1' })]
    })
    const combined = combineAccounts(result)
    expect(combined.map((a) => a.id)).toEqual(['u-1', 'p-1'])
    expect(combined[0].accountType).toBe('USER')
    expect(combined[1].accountType).toBe('PARTNER')
  })

  it('treats only LOCKED accounts as locked', () => {
    expect(isLocked(makeUser({ status: 'ACTIVE' }))).toBe(false)
    expect(isLocked(makeUser({ status: 'LOCKED' }))).toBe(true)
    expect(isLocked(makePartner({ status: 'LOCKED' }))).toBe(true)
  })
})

describe('UsersPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('lists customer and partner accounts with status badges (Req 5.1)', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: backendEnvelope() } as never)
    renderPage()

    expect(await screen.findByText('Alice')).toBeDefined()
    expect(screen.getByText('Zen Spa')).toBeDefined()
    // Account type column.
    expect(screen.getByText('Đối tác')).toBeDefined()
  })

  it('submits a search query to the backend (Req 5.2)', async () => {
    const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ data: backendEnvelope() } as never)
    renderPage()
    await screen.findByText('Alice')

    fireEvent.change(screen.getByLabelText(/tìm kiếm tài khoản/i), {
      target: { value: 'alice' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Tìm kiếm' }))

    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledWith('/admin/users', {
        params: { q: 'alice', cursor: undefined, limit: 20 }
      })
    })
  })

  it('shows an empty state when no accounts match the search', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: backendEnvelope(makeResult({ items: [] }))
    } as never)
    renderPage()

    expect(await screen.findByText(/không tìm thấy tài khoản/i)).toBeDefined()
  })

  it('uses the backend cursor when loading the next page', async () => {
    const nextCursor = '477eb37b-0f41-4e0b-bfc0-42348335ccec'
    const getSpy = vi
      .spyOn(api, 'get')
      .mockResolvedValueOnce({ data: backendEnvelope(makeResult({ nextCursor })) } as never)
      .mockResolvedValueOnce({
        data: backendEnvelope(makeResult({ items: [makeUser({ id: 'u-2', name: 'Next User' })] }))
      } as never)

    renderPage()
    await screen.findByText('Alice')
    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }))

    expect(await screen.findByText('Next User')).toBeDefined()
    expect(getSpy).toHaveBeenLastCalledWith('/admin/users', {
      params: { q: undefined, cursor: nextCursor, limit: 20 }
    })
  })

  it('locks an active account after confirmation and refreshes (Req 5.3)', async () => {
    const getSpy = vi
      .spyOn(api, 'get')
      .mockResolvedValueOnce({
        data: backendEnvelope(makeResult({ items: [makeUser({ status: 'ACTIVE' })] }))
      } as never)
      .mockResolvedValueOnce({
        data: backendEnvelope(makeResult({ items: [makeUser({ status: 'LOCKED' })] }))
      } as never)
    const patchSpy = vi.spyOn(api, 'patch').mockResolvedValue({
      data: {
        success: true,
        data: backendEnvelope(makeResult({ items: [makeUser({ status: 'LOCKED' })] })).data.items[0]
      }
    } as never)

    renderPage()
    await screen.findByText('Alice')

    fireEvent.click(screen.getByRole('button', { name: /khóa alice/i }))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Khóa' }))

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledWith('/admin/users/u-1/lock')
    })
    await waitFor(() => expect(getSpy).toHaveBeenCalledTimes(2))
    expect(await screen.findByText(/đã khóa alice/i)).toBeDefined()
  })

  it('unlocks a locked account (Req 5.4)', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: backendEnvelope(makeResult({ items: [makeUser({ status: 'LOCKED' })] }))
    } as never)
    const patchSpy = vi.spyOn(api, 'patch').mockResolvedValue({
      data: {
        success: true,
        data: backendEnvelope(makeResult({ items: [makeUser({ status: 'ACTIVE' })] })).data.items[0]
      }
    } as never)

    renderPage()
    await screen.findByText('Alice')

    fireEvent.click(screen.getByRole('button', { name: /mở khóa alice/i }))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Mở khóa' }))

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledWith('/admin/users/u-1/unlock')
    })
    expect(await screen.findByText(/đã mở khóa alice/i)).toBeDefined()
  })

  it('changes a user role after confirmation and refreshes the list', async () => {
    const customer = makeUser({ role: 'CUSTOMER' })
    const partner = makeUser({ role: 'PARTNER' })
    const getSpy = vi
      .spyOn(api, 'get')
      .mockResolvedValueOnce({ data: backendEnvelope(makeResult({ items: [customer] })) } as never)
      .mockResolvedValueOnce({ data: backendEnvelope(makeResult({ items: [partner] })) } as never)
    const patchSpy = vi.spyOn(api, 'patch').mockResolvedValue({
      data: { success: true, data: backendEnvelope(makeResult({ items: [partner] })).data.items[0] }
    } as never)

    renderPage()
    await screen.findByText('Alice')
    fireEvent.click(screen.getByRole('button', { name: /đổi vai trò alice/i }))

    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Vai trò mới'), { target: { value: 'PARTNER' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận đổi' }))

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledWith('/admin/users/u-1/role', { role: 'PARTNER' })
    })
    await waitFor(() => expect(getSpy).toHaveBeenCalledTimes(2))
    expect(await screen.findByText(/đã đổi vai trò alice thành đối tác/i)).toBeDefined()
  })

  it('does not change role when the confirmation is cancelled', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: backendEnvelope(makeResult({ items: [makeUser()] })) } as never)
    const patchSpy = vi.spyOn(api, 'patch')

    renderPage()
    await screen.findByText('Alice')
    fireEvent.click(screen.getByRole('button', { name: /đổi vai trò alice/i }))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Vai trò mới'), { target: { value: 'ADMIN' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Hủy' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(patchSpy).not.toHaveBeenCalled()
  })

  it('surfaces a server error when a lock action fails', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: backendEnvelope(makeResult({ items: [makeUser({ status: 'ACTIVE' })] }))
    } as never)
    vi.spyOn(api, 'patch').mockRejectedValue({
      response: { status: 409, data: { error: { message: 'Cannot lock this account' } } }
    })

    renderPage()
    await screen.findByText('Alice')

    fireEvent.click(screen.getByRole('button', { name: /khóa alice/i }))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Khóa' }))

    expect(await screen.findByText('Cannot lock this account')).toBeDefined()
  })

  it('shows an error alert when the list request fails', async () => {
    vi.spyOn(api, 'get').mockRejectedValue(new Error('boom'))
    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined()
    })
  })
})
