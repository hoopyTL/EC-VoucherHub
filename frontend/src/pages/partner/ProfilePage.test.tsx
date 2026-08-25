import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../services/api'
import { ProfilePage } from './ProfilePage'

const profile = {
  id: 'partner-1',
  ownerUserId: 'owner-1',
  legalName: 'Lotus Wellness & Spa',
  taxCode: '0312345678',
  representative: 'Nguyễn An',
  approvalStatus: 'APPROVED',
  rejectReason: null,
  operatingStatus: 'SUSPENDED',
  branches: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  owner: { email: 'owner@example.com', phone: '0901234567', fullName: 'Nguyễn An' }
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ProfilePage />
    </QueryClientProvider>
  )
}

describe('ProfilePage', () => {
  afterEach(() => vi.restoreAllMocks())

  it('renders localized approval and operating statuses', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data: profile } } as never)

    renderPage()

    expect(await screen.findByRole('heading', { name: profile.legalName })).toBeDefined()
    expect(screen.getByText('Đã duyệt')).toBeDefined()
    expect(screen.getByText('Tạm khóa')).toBeDefined()
    expect(screen.queryByText('APPROVED')).toBeNull()
    expect(screen.queryByText('SUSPENDED')).toBeNull()
  })

  it('updates editable legal profile fields', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data: profile } } as never)
    const patch = vi.spyOn(api, 'patch').mockResolvedValue({
      data: { success: true, data: { ...profile, legalName: 'Lotus Việt Nam' } }
    } as never)

    renderPage()
    await screen.findByDisplayValue(profile.legalName)

    fireEvent.change(screen.getByLabelText(/tên doanh nghiệp/i), { target: { value: 'Lotus Việt Nam' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))

    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith('/partner', {
        legalName: 'Lotus Việt Nam',
        taxCode: profile.taxCode,
        representative: profile.representative
      })
    )
  })
})
