import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AxiosError, AxiosHeaders } from 'axios'
import { UserRole } from '@ui-contracts'
import { AccountPage } from './AccountPage'
import { AuthProvider } from '../../store/AuthContext'
import { ToastProvider } from '../../components/ui'
import { api, setAccessToken, getAccessToken, clearAccessToken, USER_STORAGE_KEY } from '../../services/api'
import * as authApi from '../../services/auth'

vi.mock('../../services/auth', async () => {
  const actual = await vi.importActual<typeof import('../../services/auth')>('../../services/auth')
  return { ...actual, changePassword: vi.fn(), getProfile: vi.fn(), updateProfile: vi.fn() }
})

const changePasswordMock = vi.mocked(authApi.changePassword)
const getProfileMock = vi.mocked(authApi.getProfile)
const updateProfileMock = vi.mocked(authApi.updateProfile)

const profile = {
  id: 'u1',
  email: 'alice@example.com',
  phone: '0901234567',
  fullName: 'Alice Customer',
  address: '1 Demo Street',
  status: 'ACTIVE',
  role: { name: UserRole.CUSTOMER },
  createdAt: '2026-08-16T00:00:00.000Z',
  updatedAt: '2026-08-16T00:00:00.000Z'
}

/** Seed a session so {@link AuthProvider} restores an authed user. */
function seedSession(user = { id: 'u1', name: 'Alice Customer', role: UserRole.CUSTOMER }) {
  setAccessToken('jwt-token-123')
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
}

function renderPage() {
  return render(
    <AuthProvider>
      <ToastProvider>
        <MemoryRouter initialEntries={['/account']}>
          <AccountPage />
        </MemoryRouter>
      </ToastProvider>
    </AuthProvider>
  )
}

/** Build an AxiosError carrying the API's `{ error: { code, message } }` body. */
function unauthorizedError(message: string): AxiosError {
  const err = new AxiosError(message, 'ERR_BAD_REQUEST')
  err.response = {
    status: 401,
    statusText: 'Unauthorized',
    data: { error: { code: 'UNAUTHORIZED', message } },
    headers: {},
    config: { headers: new AxiosHeaders() }
  }
  return err
}

function fillForm(current: string, next: string, confirm: string) {
  fireEvent.click(screen.getAllByRole('button', { name: /đổi mật khẩu/i })[0])
  fireEvent.change(screen.getByLabelText(/mật khẩu hiện tại/i), {
    target: { value: current }
  })
  fireEvent.change(screen.getByLabelText(/^mật khẩu mới/i), {
    target: { value: next }
  })
  fireEvent.change(screen.getByLabelText(/xác nhận mật khẩu mới/i), {
    target: { value: confirm }
  })
}

function submit() {
  fireEvent.click(screen.getAllByRole('button', { name: /đổi mật khẩu/i }).at(-1)!)
}

describe('AccountPage', () => {
  beforeEach(() => {
    localStorage.clear()
    clearAccessToken()
    changePasswordMock.mockReset()
    getProfileMock.mockReset()
    updateProfileMock.mockReset()
    getProfileMock.mockReturnValue(new Promise(() => {}))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("shows the current user's name and role", () => {
    seedSession({ id: 'u1', name: 'Alice Customer', role: UserRole.CUSTOMER })
    renderPage()

    expect(screen.getByRole('heading', { name: /alice customer/i })).toBeDefined()
    expect(screen.getByText(/^khách hàng$/i)).toBeDefined()
  })

  it('renders the profile form only in account view and keeps security in a dedicated section', async () => {
    getProfileMock.mockResolvedValue(profile)
    seedSession()
    renderPage()

    expect(screen.queryByRole('tab', { name: /thông tin hồ sơ khách hàng/i })).toBeNull()
    expect(screen.queryByRole('tab', { name: /bảo mật và mật khẩu/i })).toBeNull()
    expect(await screen.findByRole('button', { name: /lưu hồ sơ/i })).toBeDefined()

    fireEvent.click(screen.getAllByRole('button', { name: /đổi mật khẩu/i })[0])
    expect(screen.getByLabelText(/mật khẩu hiện tại/i)).toBeDefined()
    expect(screen.getByLabelText(/^mật khẩu mới/i)).toBeDefined()
    expect(screen.getByLabelText(/xác nhận mật khẩu mới/i)).toBeDefined()
    expect(screen.getByRole('button', { name: /đăng xuất/i })).toBeDefined()
  })

  it('loads, updates, and synchronizes the profile name', async () => {
    getProfileMock.mockResolvedValue(profile)
    updateProfileMock.mockResolvedValue({ ...profile, fullName: 'Alice Updated' })
    seedSession()
    renderPage()

    const fullName = await screen.findByLabelText(/họ và tên/i)
    expect((fullName as HTMLInputElement).value).toBe('Alice Customer')
    fireEvent.change(fullName, { target: { value: 'Alice Updated' } })
    fireEvent.click(screen.getByRole('button', { name: /lưu hồ sơ/i }))

    await waitFor(() => {
      expect(updateProfileMock).toHaveBeenCalledWith({
        fullName: 'Alice Updated',
        email: 'alice@example.com',
        phone: '0901234567',
        address: '1 Demo Street'
      })
    })
    expect(await screen.findByRole('heading', { name: 'Alice Updated' })).toBeDefined()
    expect(await screen.findByText(/cập nhật hồ sơ thành công/i)).toBeDefined()
    expect(localStorage.getItem(USER_STORAGE_KEY)).toContain('Alice Updated')
  })

  it('does not submit a profile without a full name', async () => {
    getProfileMock.mockResolvedValue(profile)
    seedSession()
    renderPage()

    const fullName = await screen.findByLabelText(/họ và tên/i)
    fireEvent.change(fullName, { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: /lưu hồ sơ/i }))

    expect(await screen.findByText(/họ và tên không được để trống/i)).toBeDefined()
    expect(updateProfileMock).not.toHaveBeenCalled()
  })

  it('rejects a new password shorter than 8 characters without calling the API', async () => {
    seedSession()
    renderPage()

    fillForm('current123', 'short', 'short')
    submit()

    expect(await screen.findByText(/ít nhất 8 ký tự/i)).toBeDefined()
    expect(changePasswordMock).not.toHaveBeenCalled()
  })

  it('rejects mismatched new passwords without calling the API', async () => {
    seedSession()
    renderPage()

    fillForm('current123', 'password123', 'password999')
    submit()

    expect(await screen.findByText(/mật khẩu xác nhận không khớp/i)).toBeDefined()
    expect(changePasswordMock).not.toHaveBeenCalled()
  })

  it('calls the API and shows a success toast on a valid change (Req 2.6)', async () => {
    changePasswordMock.mockResolvedValue({
      message: 'Password changed successfully.'
    })
    seedSession()
    renderPage()

    fillForm('current123', 'password123', 'password123')
    submit()

    await waitFor(() => {
      expect(changePasswordMock).toHaveBeenCalledWith('current123', 'password123')
    })
    expect(await screen.findByText(/đổi mật khẩu thành công/i)).toBeDefined()
  })

  it('shows an error toast when the current password is incorrect', async () => {
    changePasswordMock.mockRejectedValue(unauthorizedError('Current password is incorrect'))
    seedSession()
    renderPage()

    fillForm('wrongpass', 'password123', 'password123')
    submit()

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toMatch(/mật khẩu hiện tại không chính xác/i)
  })

  it('logs the user out when the log out button is clicked', () => {
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ data: {} } as never)
    seedSession()
    renderPage()

    vi.spyOn(window, 'confirm').mockReturnValue(true)
    fireEvent.click(screen.getAllByRole('button', { name: /đổi mật khẩu/i })[0])
    fireEvent.click(screen.getByRole('button', { name: /đăng xuất/i }))
    const confirmations = screen.getAllByRole('button', { name: 'Đăng xuất' })
    fireEvent.click(confirmations[confirmations.length - 1])

    expect(getAccessToken()).toBeNull()
    expect(localStorage.getItem(USER_STORAGE_KEY)).toBeNull()
    expect(postSpy).toHaveBeenCalledWith('/auth/logout')
  })
})
