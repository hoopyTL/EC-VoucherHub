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
  fireEvent.change(screen.getByLabelText(/current password/i), {
    target: { value: current }
  })
  fireEvent.change(screen.getByLabelText(/^new password/i), {
    target: { value: next }
  })
  fireEvent.change(screen.getByLabelText(/confirm new password/i), {
    target: { value: confirm }
  })
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: /change password/i }))
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
    expect(screen.getByText(/^customer$/i)).toBeDefined()
  })

  it('renders the change-password fields and a log out button', () => {
    seedSession()
    renderPage()

    expect(screen.getByLabelText(/current password/i)).toBeDefined()
    expect(screen.getByLabelText(/^new password/i)).toBeDefined()
    expect(screen.getByLabelText(/confirm new password/i)).toBeDefined()
    expect(screen.getByRole('button', { name: /log out/i })).toBeDefined()
  })

  it('loads, updates, and synchronizes the profile name', async () => {
    getProfileMock.mockResolvedValue(profile)
    updateProfileMock.mockResolvedValue({ ...profile, fullName: 'Alice Updated' })
    seedSession()
    renderPage()

    const fullName = await screen.findByLabelText(/full name/i)
    expect((fullName as HTMLInputElement).value).toBe('Alice Customer')
    fireEvent.change(fullName, { target: { value: 'Alice Updated' } })
    fireEvent.click(screen.getByRole('button', { name: /save profile/i }))

    await waitFor(() => {
      expect(updateProfileMock).toHaveBeenCalledWith({
        fullName: 'Alice Updated',
        email: 'alice@example.com',
        phone: '0901234567',
        address: '1 Demo Street'
      })
    })
    expect(await screen.findByRole('heading', { name: 'Alice Updated' })).toBeDefined()
    expect(await screen.findByText(/profile updated successfully/i)).toBeDefined()
    expect(localStorage.getItem(USER_STORAGE_KEY)).toContain('Alice Updated')
  })

  it('does not submit a profile without a full name', async () => {
    getProfileMock.mockResolvedValue(profile)
    seedSession()
    renderPage()

    const fullName = await screen.findByLabelText(/full name/i)
    fireEvent.change(fullName, { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: /save profile/i }))

    expect(await screen.findByText(/full name is required/i)).toBeDefined()
    expect(updateProfileMock).not.toHaveBeenCalled()
  })

  it('rejects a new password shorter than 8 characters without calling the API', async () => {
    seedSession()
    renderPage()

    fillForm('current123', 'short', 'short')
    submit()

    expect(await screen.findByText(/at least 8 characters/i)).toBeDefined()
    expect(changePasswordMock).not.toHaveBeenCalled()
  })

  it('rejects mismatched new passwords without calling the API', async () => {
    seedSession()
    renderPage()

    fillForm('current123', 'password123', 'password999')
    submit()

    expect(await screen.findByText(/passwords do not match/i)).toBeDefined()
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
    expect(await screen.findByText(/password changed successfully/i)).toBeDefined()
  })

  it('shows an error toast when the current password is incorrect', async () => {
    changePasswordMock.mockRejectedValue(unauthorizedError('Current password is incorrect'))
    seedSession()
    renderPage()

    fillForm('wrongpass', 'password123', 'password123')
    submit()

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toMatch(/current password is incorrect/i)
  })

  it('logs the user out when the log out button is clicked', () => {
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ data: {} } as never)
    seedSession()
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /log out/i }))

    expect(getAccessToken()).toBeNull()
    expect(localStorage.getItem(USER_STORAGE_KEY)).toBeNull()
    expect(postSpy).toHaveBeenCalledWith('/auth/logout')
  })
})
