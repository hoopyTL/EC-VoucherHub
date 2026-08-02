import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UsersPage, combineAccounts, isLocked, totalPagesFor } from './UsersPage'
import { api } from '../../services/api'
import type { AdminPartnerView, AdminUserView, ListUsersResult } from '../../types/admin'

function makeUser(overrides: Partial<AdminUserView> = {}): AdminUserView {
  return {
    accountType: 'USER',
    id: 'u-1',
    email: 'alice@example.com',
    phone: '0123456789',
    name: 'Alice',
    role: 'CUSTOMER',
    status: 'ACTIVE',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides
  }
}

function makePartner(overrides: Partial<AdminPartnerView> = {}): AdminPartnerView {
  return {
    accountType: 'PARTNER',
    id: 'p-1',
    email: 'biz@example.com',
    phone: '0987654321',
    name: 'Zen Spa',
    representativeName: 'Bob',
    status: 'APPROVED',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides
  }
}

function makeResult(overrides: Partial<ListUsersResult> = {}): ListUsersResult {
  const users = overrides.users ?? [makeUser()]
  const partners = overrides.partners ?? [makePartner()]
  return {
    users,
    partners,
    pagination: {
      page: 1,
      limit: 20,
      userTotal: users.length,
      partnerTotal: partners.length,
      total: users.length + partners.length,
      ...overrides.pagination
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

describe('combineAccounts / isLocked / totalPagesFor', () => {
  it('merges users then partners into one list', () => {
    const result = makeResult({
      users: [makeUser({ id: 'u-1' })],
      partners: [makePartner({ id: 'p-1' })]
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

  it('computes total pages from the larger subtotal', () => {
    const result = makeResult({
      pagination: { page: 1, limit: 20, userTotal: 45, partnerTotal: 10, total: 55 }
    })
    // ceil(45 / 20) = 3
    expect(totalPagesFor(result, 20)).toBe(3)
  })
})

describe('UsersPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('lists customer and partner accounts with status badges (Req 5.1)', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: makeResult() } as never)
    renderPage()

    expect(await screen.findByText('Alice')).toBeDefined()
    expect(screen.getByText('Zen Spa')).toBeDefined()
    // Account type column.
    expect(screen.getByText('Đối tác')).toBeDefined()
  })

  it('submits a search query to the backend (Req 5.2)', async () => {
    const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ data: makeResult() } as never)
    renderPage()
    await screen.findByText('Alice')

    fireEvent.change(screen.getByLabelText(/tìm kiếm tài khoản/i), {
      target: { value: 'alice' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Tìm kiếm' }))

    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledWith('/admin/users', {
        params: { search: 'alice', page: 1, limit: 20 }
      })
    })
  })

  it('shows an empty state when no accounts match the search', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: makeResult({ users: [], partners: [] })
    } as never)
    renderPage()

    expect(await screen.findByText(/không tìm thấy tài khoản/i)).toBeDefined()
  })

  it('locks an active account after confirmation and refreshes (Req 5.3)', async () => {
    const getSpy = vi
      .spyOn(api, 'get')
      .mockResolvedValueOnce({
        data: makeResult({ users: [makeUser({ status: 'ACTIVE' })], partners: [] })
      } as never)
      .mockResolvedValueOnce({
        data: makeResult({ users: [makeUser({ status: 'LOCKED' })], partners: [] })
      } as never)
    const patchSpy = vi.spyOn(api, 'patch').mockResolvedValue({
      data: { id: 'u-1', accountType: 'USER', status: 'LOCKED' }
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
      data: makeResult({ users: [makeUser({ status: 'LOCKED' })], partners: [] })
    } as never)
    const patchSpy = vi.spyOn(api, 'patch').mockResolvedValue({
      data: { id: 'u-1', accountType: 'USER', status: 'ACTIVE' }
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

  it('surfaces a server error when a lock action fails', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: makeResult({ users: [makeUser({ status: 'ACTIVE' })], partners: [] })
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
