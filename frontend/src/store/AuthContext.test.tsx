import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, render, renderHook, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { UserRole } from '@ui-contracts'
import { AuthProvider } from './AuthContext'
import { useAuth } from '../hooks/useAuth'
import { api, clearAccessToken, getAccessToken, USER_STORAGE_KEY } from '../services/api'

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>

const sampleAuthResponse = {
  token: 'jwt-token-123',
  user: { id: 'u1', name: 'Alice', role: UserRole.CUSTOMER }
}

describe('useAuth outside provider', () => {
  it('throws a descriptive error when used without AuthProvider', () => {
    // Suppress the expected React error boundary console output.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useAuth())).toThrowError(/must be used within an <AuthProvider>/)
    spy.mockRestore()
  })
})

describe('AuthProvider initial state', () => {
  beforeEach(() => {
    localStorage.clear()
    clearAccessToken()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts unauthenticated when no session is persisted', () => {
    const postSpy = vi.spyOn(api, 'post')
    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
    expect(result.current.token).toBeNull()
    expect(postSpy).not.toHaveBeenCalled()
  })

  it('clears a stale profile without calling an unsupported refresh endpoint', () => {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ id: 'u9', name: 'Bob', role: UserRole.PARTNER }))
    const postSpy = vi.spyOn(api, 'post')

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
    expect(localStorage.getItem(USER_STORAGE_KEY)).toBeNull()
    expect(postSpy).not.toHaveBeenCalled()
  })
})

describe('AuthProvider login', () => {
  beforeEach(() => {
    localStorage.clear()
    clearAccessToken()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('authenticates, stores the token in memory, persists the profile, and updates state', async () => {
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({
      data: {
        success: true,
        data: { token: sampleAuthResponse.token, user: { id: 'u1', role: UserRole.CUSTOMER } }
      }
    } as never)
    vi.spyOn(api, 'get').mockResolvedValue({
      data: {
        success: true,
        data: { id: 'u1', fullName: 'Alice', role: { name: UserRole.CUSTOMER } }
      }
    } as never)

    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.login({
        emailOrPhone: 'alice@example.com',
        password: 'password123'
      })
    })

    expect(postSpy).toHaveBeenCalledWith('/auth/login', {
      identifier: 'alice@example.com',
      password: 'password123'
    })
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user).toEqual(sampleAuthResponse.user)
    expect(result.current.token).toBe('jwt-token-123')
    // Access token lives in memory, NOT localStorage; only the profile is persisted.
    expect(getAccessToken()).toBe('jwt-token-123')
    expect(localStorage.getItem('voucher_system_auth_token')).toBeNull()
    expect(localStorage.getItem(USER_STORAGE_KEY)).toContain('Alice')
  })

  it('clears the partial session when loading the post-login profile fails', async () => {
    vi.spyOn(api, 'post').mockResolvedValue({
      data: {
        success: true,
        data: { token: sampleAuthResponse.token, user: { id: 'u1', role: UserRole.CUSTOMER } }
      }
    } as never)
    vi.spyOn(api, 'get').mockRejectedValue(new Error('profile unavailable'))

    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await expect(
        result.current.login({ emailOrPhone: 'alice@example.com', password: 'password123' })
      ).rejects.toThrow('profile unavailable')
    })

    expect(result.current.isAuthenticated).toBe(false)
    expect(getAccessToken()).toBeNull()
    expect(localStorage.getItem(USER_STORAGE_KEY)).toBeNull()
  })
})

describe('AuthProvider logout', () => {
  beforeEach(() => {
    localStorage.clear()
    clearAccessToken()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('clears the session, calls the server, and drops persisted credentials', async () => {
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({
      data: {
        success: true,
        data: { token: sampleAuthResponse.token, user: { id: 'u1', role: UserRole.CUSTOMER } }
      }
    } as never)
    vi.spyOn(api, 'get').mockResolvedValue({
      data: {
        success: true,
        data: { id: 'u1', fullName: 'Alice', role: { name: UserRole.CUSTOMER } }
      }
    } as never)

    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.login({
        emailOrPhone: 'alice@example.com',
        password: 'password123'
      })
    })
    expect(result.current.isAuthenticated).toBe(true)

    act(() => {
      result.current.logout()
    })

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
    expect(result.current.token).toBeNull()
    expect(getAccessToken()).toBeNull()
    expect(localStorage.getItem(USER_STORAGE_KEY)).toBeNull()
    // Logout revokes the session server-side.
    expect(postSpy).toHaveBeenCalledWith('/auth/logout')
  })
})

describe('useAuth inside provider via component', () => {
  beforeEach(() => {
    localStorage.clear()
    clearAccessToken()
  })

  it('exposes auth state to a consuming component', () => {
    function Consumer() {
      const { isAuthenticated } = useAuth()
      return <span>{isAuthenticated ? 'in' : 'out'}</span>
    }
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    )
    expect(screen.getByText('out')).toBeDefined()
  })
})
