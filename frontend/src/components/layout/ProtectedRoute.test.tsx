import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProtectedRoute, roleHomePath } from './ProtectedRoute'
import { AuthContext, type AuthContextValue, type AuthUser } from '../../store/AuthContext'

function makeAuth(overrides: Partial<AuthContextValue>): AuthContextValue {
  return {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    login: async () => ({ id: '', name: '', role: 'CUSTOMER' }),
    updateProfile: async () => ({
      id: '',
      email: null,
      phone: null,
      fullName: '',
      address: null,
      status: 'ACTIVE',
      role: { name: 'CUSTOMER' },
      createdAt: '',
      updatedAt: ''
    }),
    logout: () => {},
    ...overrides
  }
}

function renderGuarded(auth: AuthContextValue, allowedRoles?: AuthUser['role'][], startPath = '/secret') {
  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[startPath]}>
        <Routes>
          <Route path='/login' element={<div>Login Page</div>} />
          <Route path='/' element={<div>Customer Home</div>} />
          <Route path='/admin' element={<div>Admin Home</div>} />
          <Route
            path='/secret'
            element={
              <ProtectedRoute allowedRoles={allowedRoles}>
                <div>Secret Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

const customer: AuthUser = { id: 'u1', name: 'Cust', role: 'CUSTOMER' }
const admin: AuthUser = { id: 'a1', name: 'Admin', role: 'ADMIN' }

describe('ProtectedRoute', () => {
  it('redirects unauthenticated users to the login page', () => {
    renderGuarded(makeAuth({ isAuthenticated: false }))
    expect(screen.getByText('Login Page')).toBeDefined()
  })

  it('shows a loading indicator while auth state is restoring', () => {
    renderGuarded(makeAuth({ isLoading: true }))
    expect(screen.getByRole('status')).toBeDefined()
  })

  it('renders content for an authenticated user with an allowed role', () => {
    renderGuarded(makeAuth({ isAuthenticated: true, user: customer, token: 't' }), ['CUSTOMER'])
    expect(screen.getByText('Secret Content')).toBeDefined()
  })

  it('redirects an authenticated user lacking the required role to their home', () => {
    renderGuarded(makeAuth({ isAuthenticated: true, user: admin, token: 't' }), ['CUSTOMER'])
    expect(screen.getByText('Admin Home')).toBeDefined()
  })

  it('allows any authenticated user when no roles are specified', () => {
    renderGuarded(makeAuth({ isAuthenticated: true, user: customer, token: 't' }))
    expect(screen.getByText('Secret Content')).toBeDefined()
  })
})

describe('roleHomePath', () => {
  it('maps each role to its workspace home', () => {
    expect(roleHomePath('ADMIN')).toBe('/admin')
    expect(roleHomePath('PARTNER')).toBe('/partner')
    expect(roleHomePath('STAFF')).toBe('/partner/redeem')
    expect(roleHomePath('CUSTOMER')).toBe('/')
  })
})
