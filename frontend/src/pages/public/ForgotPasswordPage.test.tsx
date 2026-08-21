import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ForgotPasswordPage } from './ForgotPasswordPage'
import * as authApi from '../../services/auth'

vi.mock('../../services/auth', async () => {
  const actual = await vi.importActual<typeof import('../../services/auth')>('../../services/auth')
  return { ...actual, forgotPassword: vi.fn() }
})

const forgotPasswordMock = vi.mocked(authApi.forgotPassword)

/** Generic message returned by the backend regardless of account existence. */
const GENERIC_MESSAGE = 'If an account exists for the provided email or phone, a password reset link has been sent.'

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/forgot-password']}>
      <ForgotPasswordPage />
    </MemoryRouter>
  )
}

function submitWith(value: string) {
  fireEvent.change(screen.getByLabelText(/email hoặc số điện thoại/i), {
    target: { value }
  })
  fireEvent.click(screen.getByRole('button', { name: /gửi yêu cầu khôi phục/i }))
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    forgotPasswordMock.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the email/phone field and a submit button', () => {
    renderPage()
    expect(screen.getByLabelText(/email hoặc số điện thoại/i)).toBeDefined()
    expect(screen.getByRole('button', { name: /gửi yêu cầu khôi phục/i })).toBeDefined()
  })

  it('calls the API and shows the generic message on submit (Req 2.4)', async () => {
    forgotPasswordMock.mockResolvedValue({ message: GENERIC_MESSAGE })
    renderPage()

    submitWith('user@example.com')

    await waitFor(() => {
      expect(forgotPasswordMock).toHaveBeenCalledWith('user@example.com')
    })
    expect(await screen.findByText(GENERIC_MESSAGE)).toBeDefined()
  })

  it('shows the same generic message for an unknown account (no enumeration)', async () => {
    forgotPasswordMock.mockResolvedValue({ message: GENERIC_MESSAGE })
    renderPage()

    submitWith('does-not-exist@example.com')

    expect(await screen.findByText(GENERIC_MESSAGE)).toBeDefined()
    // The success copy must not reveal whether the account exists.
    expect(screen.queryByText(/no account|not found|doesn't exist/i)).toBeNull()
  })

  it('validates a required identifier without calling the API', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /gửi yêu cầu khôi phục/i }))

    expect(await screen.findByRole('alert')).toBeDefined()
    expect(forgotPasswordMock).not.toHaveBeenCalled()
  })

  it('does not expose an unsupported reset-completion link', async () => {
    forgotPasswordMock.mockResolvedValue({ message: GENERIC_MESSAGE })
    renderPage()

    submitWith('user@example.com')

    expect(await screen.findByText(GENERIC_MESSAGE)).toBeDefined()
    expect(screen.queryByRole('link', { name: /continue to reset password/i })).toBeNull()
  })
})
