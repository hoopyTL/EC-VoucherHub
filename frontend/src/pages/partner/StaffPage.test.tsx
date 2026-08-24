import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../services/api'
import { StaffPage } from './StaffPage'

const branch = {
  id: 1,
  partnerId: 'partner-1',
  name: 'Lotus Spa Quận 1',
  address: '1 Nguyễn Huệ',
  region: 'TP. Hồ Chí Minh'
}

const staff = {
  id: '7d9110b2-27a5-47dd-af68-e407cf86a15b',
  status: 'ACTIVE',
  user: {
    id: '53efdc0c-dbb6-449f-980d-7b2c63f8621c',
    fullName: 'Gia Huy',
    email: 'giahuy@example.com',
    phone: '0901234567',
    status: 'ACTIVE'
  },
  assignments: [{ branchId: branch.id, branch }]
}

function mockQueries(branches = [branch], staffItems = [staff]) {
  return vi.spyOn(api, 'get').mockImplementation((url) => {
    if (url === '/partner/branches') return Promise.resolve({ data: { success: true, data: branches } } as never)
    if (url === '/partner/staff') return Promise.resolve({ data: { success: true, data: staffItems } } as never)
    return Promise.reject(new Error(`Unexpected URL: ${url}`))
  })
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <StaffPage />
    </QueryClientProvider>
  )
}

describe('StaffPage', () => {
  afterEach(() => vi.restoreAllMocks())

  it('keeps the creation form hidden until the partner requests it', async () => {
    mockQueries()
    renderPage()

    expect(await screen.findByText('Gia Huy')).toBeDefined()
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Thêm nhân viên' }))

    expect(screen.getByRole('dialog', { name: 'Thêm nhân viên' })).toBeDefined()
    expect(screen.getByLabelText('Họ tên')).toBeDefined()
  })

  it('creates a staff account from the modal and assigns selected branches', async () => {
    mockQueries()
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { success: true, data: staff } } as never)
    renderPage()
    await screen.findByText('Gia Huy')

    fireEvent.click(screen.getByRole('button', { name: 'Thêm nhân viên' }))
    fireEvent.change(screen.getByLabelText('Họ tên'), { target: { value: 'Nguyễn An' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'an@example.com' } })
    fireEvent.change(screen.getByLabelText('Số điện thoại'), { target: { value: '0912345678' } })
    fireEvent.change(screen.getByLabelText('Mật khẩu ban đầu'), { target: { value: 'Password123' } })
    fireEvent.click(screen.getByLabelText(/Lotus Spa Quận 1/))
    fireEvent.click(screen.getByRole('button', { name: 'Tạo nhân viên' }))

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/partner/staff', {
        fullName: 'Nguyễn An',
        email: 'an@example.com',
        phone: '0912345678',
        password: 'Password123',
        branchIds: [1]
      })
    )
  })

  it('explains why creation is unavailable when the partner has no branch', async () => {
    mockQueries([], [])
    renderPage()
    await screen.findByText('Bạn chưa có nhân viên nào.')

    fireEvent.click(screen.getByRole('button', { name: 'Thêm nhân viên' }))

    expect(screen.getByText('Bạn cần tạo chi nhánh trước khi phân công nhân viên.')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Tạo nhân viên' }).hasAttribute('disabled')).toBe(true)
  })
})
