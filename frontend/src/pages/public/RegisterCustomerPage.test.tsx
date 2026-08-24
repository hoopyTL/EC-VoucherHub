import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AxiosError, AxiosHeaders } from 'axios'
import { RegisterCustomerPage } from './RegisterCustomerPage'
import { api } from '../../services/api'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/register/customer']}>
      <RegisterCustomerPage />
    </MemoryRouter>
  )
}

/** Build an AxiosError carrying the API's `{ error: { code, message } }` body. */
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

describe('RegisterCustomerPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the name, email, phone, and password fields', () => {
    renderPage()
    expect(screen.getByLabelText(/họ và tên/i)).toBeDefined()
    expect(screen.getByLabelText(/email/i)).toBeDefined()
    expect(screen.getByLabelText(/số điện thoại/i)).toBeDefined()
    expect(screen.getByLabelText(/mật khẩu/i)).toBeDefined()
  })

  it('rejects a password shorter than 8 characters (Req 1.3)', async () => {
    const postSpy = vi.spyOn(api, 'post')
    renderPage()

    fireEvent.change(screen.getByLabelText(/họ và tên/i), {
      target: { value: 'Jane Doe' }
    })
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'jane@example.com' }
    })
    fireEvent.change(screen.getByLabelText(/mật khẩu/i), {
      target: { value: 'short' }
    })
    fireEvent.click(screen.getByRole('button', { name: /tạo tài khoản/i }))

    expect(await screen.findByText(/ít nhất 8 ký tự/i)).toBeDefined()
    expect(postSpy).not.toHaveBeenCalled()
  })

  it('requires either an email or a phone number', async () => {
    const postSpy = vi.spyOn(api, 'post')
    renderPage()

    fireEvent.change(screen.getByLabelText(/họ và tên/i), {
      target: { value: 'Jane Doe' }
    })
    fireEvent.change(screen.getByLabelText(/mật khẩu/i), {
      target: { value: 'password123' }
    })
    fireEvent.click(screen.getByRole('button', { name: /tạo tài khoản/i }))

    expect(await screen.findByText(/nhập email hoặc số điện thoại/i)).toBeDefined()
    expect(postSpy).not.toHaveBeenCalled()
  })

  it('submits a valid form and navigates to login', async () => {
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ data: {} } as never)
    renderPage()

    fireEvent.change(screen.getByLabelText(/họ và tên/i), {
      target: { value: 'Jane Doe' }
    })
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'jane@example.com' }
    })
    fireEvent.change(screen.getByLabelText(/mật khẩu/i), {
      target: { value: 'password123' }
    })
    fireEvent.click(screen.getByRole('button', { name: /tạo tài khoản/i }))

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith('/auth/register', {
        fullName: 'Jane Doe',
        password: 'password123',
        email: 'jane@example.com'
      })
    })
    expect(mockNavigate).toHaveBeenCalledWith('/login', expect.objectContaining({ replace: true }))
  })

  it('surfaces a duplicate-account error on HTTP 409 (Req 1.2)', async () => {
    vi.spyOn(api, 'post').mockRejectedValue(conflictError('An account with this email or phone number already exists'))
    renderPage()

    fireEvent.change(screen.getByLabelText(/họ và tên/i), {
      target: { value: 'Jane Doe' }
    })
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'dupe@example.com' }
    })
    fireEvent.change(screen.getByLabelText(/mật khẩu/i), {
      target: { value: 'password123' }
    })
    fireEvent.click(screen.getByRole('button', { name: /tạo tài khoản/i }))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toMatch(/already exists/i)
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
