import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AxiosError, AxiosHeaders } from 'axios'
import { RegisterPartnerPage } from './RegisterPartnerPage'
import { api } from '../../services/api'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/register/partner']}>
      <RegisterPartnerPage />
    </MemoryRouter>
  )
}

function conflictError(message: string): AxiosError {
  const err = new AxiosError(message, 'ERR_BAD_REQUEST')
  err.response = {
    status: 409,
    statusText: 'Conflict',
    data: { error: { code: 'CONFLICT', message } },
    headers: {},
    config: { headers: new AxiosHeaders() }
  }
  return err
}

/** Fill all required business + representative + first branch fields. */
function fillValidForm() {
  fireEvent.change(screen.getByLabelText(/^email/i), {
    target: { value: 'biz@example.com' }
  })
  fireEvent.change(screen.getByLabelText(/^mật khẩu/i), {
    target: { value: 'password123' }
  })
  fireEvent.change(screen.getByLabelText(/tên pháp lý/i), {
    target: { value: 'Acme Co' }
  })
  fireEvent.change(screen.getByLabelText(/mã số thuế/i), {
    target: { value: 'TAX-999' }
  })
  fireEvent.change(screen.getByLabelText(/người đại diện/i), {
    target: { value: 'Jane Rep' }
  })
  fireEvent.change(screen.getByLabelText(/tên chi nhánh/i), {
    target: { value: 'Downtown' }
  })
  fireEvent.change(screen.getByLabelText(/^địa chỉ/i), {
    target: { value: '123 Main St' }
  })
  fireEvent.change(screen.getByLabelText(/^khu vực/i), {
    target: { value: 'Hà Nội' }
  })
}

describe('RegisterPartnerPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders business, representative, and branch fields', () => {
    renderPage()
    expect(screen.getByLabelText(/tên pháp lý/i)).toBeDefined()
    expect(screen.getByLabelText(/mã số thuế/i)).toBeDefined()
    expect(screen.getByLabelText(/người đại diện/i)).toBeDefined()
    expect(screen.getByLabelText(/tên chi nhánh/i)).toBeDefined()
  })

  it('accepts a phone number without requiring an email', async () => {
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ data: { success: true, data: {} } } as never)
    renderPage()

    fireEvent.change(screen.getByLabelText(/số điện thoại/i), { target: { value: '0912345678' } })
    fireEvent.change(screen.getByLabelText(/^mật khẩu/i), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText(/tên pháp lý/i), { target: { value: 'Công ty Điện thoại' } })
    fireEvent.change(screen.getByLabelText(/mã số thuế/i), { target: { value: 'PHONE-TAX-01' } })
    fireEvent.change(screen.getByLabelText(/họ tên người đại diện/i), { target: { value: 'Nguyễn Đại Diện' } })
    fireEvent.change(screen.getByLabelText(/tên chi nhánh/i), { target: { value: 'Chi nhánh chính' } })
    fireEvent.change(screen.getByLabelText(/địa chỉ/i), { target: { value: '1 Nguyễn Huệ' } })
    fireEvent.change(screen.getByLabelText(/khu vực/i), { target: { value: 'Hồ Chí Minh' } })
    fireEvent.click(screen.getByRole('button', { name: /gửi hồ sơ/i }))

    await waitFor(() => expect(postSpy).toHaveBeenCalled())
    expect(postSpy.mock.calls[0]?.[1]).toMatchObject({ phone: '0912345678' })
    expect(postSpy.mock.calls[0]?.[1]).not.toHaveProperty('email')
  })

  it('starts with one branch and can add and remove branches', () => {
    renderPage()
    expect(screen.getByText(/chi nhánh 1/i)).toBeDefined()
    expect(screen.queryByText(/chi nhánh 2/i)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /thêm chi nhánh/i }))
    expect(screen.getByText(/chi nhánh 2/i)).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: /xóa chi nhánh 2/i }))
    expect(screen.queryByText(/chi nhánh 2/i)).toBeNull()
  })

  it('rejects a password shorter than 8 characters (Req 1.3)', async () => {
    const postSpy = vi.spyOn(api, 'post')
    renderPage()
    fillValidForm()
    fireEvent.change(screen.getByLabelText(/^mật khẩu/i), {
      target: { value: 'short' }
    })
    fireEvent.click(screen.getByRole('button', { name: /gửi hồ sơ đăng ký/i }))

    expect(await screen.findByText(/ít nhất 8 ký tự/i)).toBeDefined()
    expect(postSpy).not.toHaveBeenCalled()
  })

  it('requires at least one fully-filled branch (Req 3.1)', async () => {
    const postSpy = vi.spyOn(api, 'post')
    renderPage()
    fillValidForm()
    // Clear the branch name to make the branch incomplete.
    fireEvent.change(screen.getByLabelText(/tên chi nhánh/i), {
      target: { value: '' }
    })
    fireEvent.click(screen.getByRole('button', { name: /gửi hồ sơ đăng ký/i }))

    expect(await screen.findByText(/vui lòng nhập tên chi nhánh/i)).toBeDefined()
    expect(postSpy).not.toHaveBeenCalled()
  })

  it('submits a valid form with branches and navigates to login (Req 3.1, 3.2)', async () => {
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ data: {} } as never)
    renderPage()
    fillValidForm()
    fireEvent.click(screen.getByRole('button', { name: /gửi hồ sơ đăng ký/i }))

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledTimes(1)
    })
    const [, body] = postSpy.mock.calls[0]
    expect(postSpy.mock.calls[0][0]).toBe('/partners')
    expect(body).toMatchObject({
      email: 'biz@example.com',
      legalName: 'Acme Co',
      taxCode: 'TAX-999',
      representative: 'Jane Rep',
      branches: [
        {
          name: 'Downtown',
          address: '123 Main St',
          region: 'Hà Nội'
        }
      ]
    })
    expect(mockNavigate).toHaveBeenCalledWith('/login', expect.objectContaining({ replace: true }))
  })

  it('surfaces a duplicate-account error on HTTP 409 (Req 3.3)', async () => {
    vi.spyOn(api, 'post').mockRejectedValue(conflictError('An account with this email or phone number already exists'))
    renderPage()
    fillValidForm()
    fireEvent.click(screen.getByRole('button', { name: /gửi hồ sơ đăng ký/i }))

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText(/already exists/i)).toBeDefined()
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
