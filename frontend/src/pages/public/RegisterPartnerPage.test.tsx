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
  fireEvent.change(screen.getByLabelText(/^password/i), {
    target: { value: 'password123' }
  })
  fireEvent.change(screen.getByLabelText(/business name/i), {
    target: { value: 'Acme Co' }
  })
  fireEvent.change(screen.getByLabelText(/business registration number/i), {
    target: { value: 'BRN-123' }
  })
  fireEvent.change(screen.getByLabelText(/tax id/i), {
    target: { value: 'TAX-999' }
  })
  fireEvent.change(screen.getByLabelText(/representative name/i), {
    target: { value: 'Jane Rep' }
  })
  fireEvent.change(screen.getByLabelText(/representative contact/i), {
    target: { value: 'jane@acme.com' }
  })
  fireEvent.change(screen.getByLabelText(/branch name/i), {
    target: { value: 'Downtown' }
  })
  fireEvent.change(screen.getByLabelText(/^address/i), {
    target: { value: '123 Main St' }
  })
  fireEvent.change(screen.getByLabelText(/^region/i), {
    target: { value: 'Hà Nội' }
  })
  fireEvent.change(screen.getByLabelText(/^contact/i), {
    target: { value: '0900000000' }
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
    expect(screen.getByLabelText(/business name/i)).toBeDefined()
    expect(screen.getByLabelText(/tax id/i)).toBeDefined()
    expect(screen.getByLabelText(/representative name/i)).toBeDefined()
    expect(screen.getByLabelText(/branch name/i)).toBeDefined()
  })

  it('starts with one branch and can add and remove branches', () => {
    renderPage()
    expect(screen.getByText(/branch 1/i)).toBeDefined()
    expect(screen.queryByText(/branch 2/i)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /add branch/i }))
    expect(screen.getByText(/branch 2/i)).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: /remove branch 2/i }))
    expect(screen.queryByText(/branch 2/i)).toBeNull()
  })

  it('rejects a password shorter than 8 characters (Req 1.3)', async () => {
    const postSpy = vi.spyOn(api, 'post')
    renderPage()
    fillValidForm()
    fireEvent.change(screen.getByLabelText(/^password/i), {
      target: { value: 'short' }
    })
    fireEvent.click(screen.getByRole('button', { name: /submit registration/i }))

    expect(await screen.findByText(/at least 8 characters/i)).toBeDefined()
    expect(postSpy).not.toHaveBeenCalled()
  })

  it('requires at least one fully-filled branch (Req 3.1)', async () => {
    const postSpy = vi.spyOn(api, 'post')
    renderPage()
    fillValidForm()
    // Clear the branch name to make the branch incomplete.
    fireEvent.change(screen.getByLabelText(/branch name/i), {
      target: { value: '' }
    })
    fireEvent.click(screen.getByRole('button', { name: /submit registration/i }))

    expect(await screen.findByText(/branch name is required/i)).toBeDefined()
    expect(postSpy).not.toHaveBeenCalled()
  })

  it('submits a valid form with branches and navigates to login (Req 3.1, 3.2)', async () => {
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ data: {} } as never)
    renderPage()
    fillValidForm()
    fireEvent.click(screen.getByRole('button', { name: /submit registration/i }))

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledTimes(1)
    })
    const [, body] = postSpy.mock.calls[0]
    expect(postSpy.mock.calls[0][0]).toBe('/auth/register/partner')
    expect(body).toMatchObject({
      email: 'biz@example.com',
      businessName: 'Acme Co',
      businessRegNumber: 'BRN-123',
      taxId: 'TAX-999',
      representativeName: 'Jane Rep',
      representativeContact: 'jane@acme.com',
      branches: [
        {
          name: 'Downtown',
          address: '123 Main St',
          region: 'Hà Nội',
          contact: '0900000000'
        }
      ]
    })
    expect(mockNavigate).toHaveBeenCalledWith('/login', expect.objectContaining({ replace: true }))
  })

  it('surfaces a duplicate-account error on HTTP 409 (Req 3.3)', async () => {
    vi.spyOn(api, 'post').mockRejectedValue(conflictError('An account with this email or phone number already exists'))
    renderPage()
    fillValidForm()
    fireEvent.click(screen.getByRole('button', { name: /submit registration/i }))

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText(/already exists/i)).toBeDefined()
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
