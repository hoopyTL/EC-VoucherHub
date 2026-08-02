import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AxiosError, AxiosHeaders } from 'axios'
import { ResetPasswordPage } from './ResetPasswordPage'
import * as authApi from '../../services/auth'

vi.mock('../../services/auth', async () => {
  const actual = await vi.importActual<typeof import('../../services/auth')>('../../services/auth')
  return { ...actual, resetPassword: vi.fn() }
})

const resetPasswordMock = vi.mocked(authApi.resetPassword)

/** Probe that renders the current path so we can assert navigation to /login. */
function LocationProbe() {
  const location = useLocation()
  return <div data-testid='location'>{location.pathname}</div>
}

function renderPage(token: string | null = 'reset-token-abc') {
  const entry = token === null ? '/reset-password' : `/reset-password?token=${token}`
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path='/reset-password' element={<ResetPasswordPage />} />
        <Route path='*' element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  )
}

/** Build an AxiosError carrying the API's `{ error: { code, message } }` body. */
function badRequestError(message: string): AxiosError {
  const err = new AxiosError(message, 'ERR_BAD_REQUEST')
  err.response = {
    status: 400,
    statusText: 'Bad Request',
    data: { error: { code: 'VALIDATION_ERROR', message } },
    headers: {},
    config: { headers: new AxiosHeaders() }
  }
  return err
}

function fillPasswords(newPassword: string, confirmPassword: string) {
  fireEvent.change(screen.getByLabelText(/^new password/i), {
    target: { value: newPassword }
  })
  fireEvent.change(screen.getByLabelText(/confirm new password/i), {
    target: { value: confirmPassword }
  })
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: /reset password/i }))
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    resetPasswordMock.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the new + confirm password fields and a submit button', () => {
    renderPage()
    expect(screen.getByLabelText(/^new password/i)).toBeDefined()
    expect(screen.getByLabelText(/confirm new password/i)).toBeDefined()
    expect(screen.getByRole('button', { name: /reset password/i })).toBeDefined()
  })

  it('rejects a password shorter than 8 characters without calling the API', async () => {
    renderPage()

    fillPasswords('short', 'short')
    submit()

    expect(await screen.findByText(/at least 8 characters/i)).toBeDefined()
    expect(resetPasswordMock).not.toHaveBeenCalled()
  })

  it('rejects mismatched passwords without calling the API', async () => {
    renderPage()

    fillPasswords('password123', 'password999')
    submit()

    expect(await screen.findByText(/passwords do not match/i)).toBeDefined()
    expect(resetPasswordMock).not.toHaveBeenCalled()
  })

  it('calls the API with the token and shows a confirmation on success (Req 2.5)', async () => {
    resetPasswordMock.mockResolvedValue({
      message: 'Password has been reset successfully.'
    })
    renderPage('reset-token-abc')

    fillPasswords('password123', 'password123')
    submit()

    await waitFor(() => {
      expect(resetPasswordMock).toHaveBeenCalledWith('reset-token-abc', 'password123')
    })
    expect(await screen.findByText(/reset successfully/i)).toBeDefined()
    expect(screen.getByRole('link', { name: /continue to log in/i })).toBeDefined()
  })

  it('surfaces an invalid/expired token error from the backend', async () => {
    resetPasswordMock.mockRejectedValue(badRequestError('Invalid or expired reset token'))
    renderPage('expired-token')

    fillPasswords('password123', 'password123')
    submit()

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toMatch(/invalid or expired reset token/i)
  })

  it('errors when the link has no token, without calling the API', async () => {
    renderPage(null)

    fillPasswords('password123', 'password123')
    submit()

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toMatch(/missing its token/i)
    expect(resetPasswordMock).not.toHaveBeenCalled()
  })
})
