import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { UserRole } from '@ui-contracts'
import { GuestRoute } from './GuestRoute'
import { AuthProvider } from '../../store/AuthContext'
import { setAccessToken, clearAccessToken, USER_STORAGE_KEY } from '../../services/api'

function seedSession(role: UserRole) {
  setAccessToken('test-token')
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ id: 'u1', name: 'Test User', role }))
}

function renderAt(path = '/login') {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<GuestRoute />}>
            <Route path='/login' element={<div>Login Form</div>} />
            <Route path='/register' element={<div>Register Form</div>} />
          </Route>
          <Route path='/' element={<div>Customer Home</div>} />
          <Route path='/partner' element={<div>Partner Home</div>} />
          <Route path='/admin' element={<div>Admin Home</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  )
}

describe('GuestRoute', () => {
  beforeEach(() => {
    localStorage.clear()
    clearAccessToken()
  })

  it('renders the guest page for an unauthenticated visitor', () => {
    renderAt('/login')
    expect(screen.getByText('Login Form')).toBeDefined()
  })

  it('redirects an authenticated customer away from /login to their home', () => {
    seedSession(UserRole.CUSTOMER)
    renderAt('/login')
    expect(screen.getByText('Customer Home')).toBeDefined()
    expect(screen.queryByText('Login Form')).toBeNull()
  })

  it('redirects an authenticated partner away from /register to the partner home', () => {
    seedSession(UserRole.PARTNER)
    renderAt('/register')
    expect(screen.getByText('Partner Home')).toBeDefined()
    expect(screen.queryByText('Register Form')).toBeNull()
  })
})
