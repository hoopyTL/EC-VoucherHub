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
  fireEvent.change(screen.getByLabelText(/email or phone/i), {
    target: { value }
  })
  fireEvent.click(screen.getByRole('button', { name: /send reset link/i }))
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
    expect(screen.getByLabelText(/email or phone/i)).toBeDefined()
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeDefined()
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

    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }))

    expect(await screen.findByRole('alert')).toBeDefined()
    expect(forgotPasswordMock).not.toHaveBeenCalled()
  })

  it('shows a "Demo only" reset link when the response includes a resetToken', async () => {
    forgotPasswordMock.mockResolvedValue({
      message: GENERIC_MESSAGE,
      resetToken: 'demo-token-123'
    })
    renderPage()

    submitWith('user@example.com')

    expect(await screen.findByText(/demo only/i)).toBeDefined()
    const link = screen.getByRole('link', { name: /continue to reset password/i })
    expect(link.getAttribute('href')).toBe('/reset-password?token=demo-token-123')
  })
})
