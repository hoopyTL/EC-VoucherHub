import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { AxiosAdapter } from 'axios'
import { api, getAccessToken, setAccessToken, clearAccessToken, USER_STORAGE_KEY } from './api'

describe('api in-memory access token', () => {
  beforeEach(() => {
    clearAccessToken()
  })

  it('returns null when no token is set', () => {
    expect(getAccessToken()).toBeNull()
  })

  it('uses the backend contract base path', () => {
    expect(api.defaults.baseURL).toBe('/api')
  })

  it('stores and reads back the access token in memory (not localStorage)', () => {
    setAccessToken('abc.def.ghi')
    expect(getAccessToken()).toBe('abc.def.ghi')
    // The token is never persisted to localStorage.
    expect(localStorage.getItem('voucher_system_auth_token')).toBeNull()
  })

  it('clears the access token', () => {
    setAccessToken('to-be-removed')
    clearAccessToken()
    expect(getAccessToken()).toBeNull()
  })
})

describe('api request interceptor', () => {
  beforeEach(() => {
    clearAccessToken()
  })

  afterEach(() => {
    delete (api.defaults as { adapter?: AxiosAdapter }).adapter
  })

  it('attaches the bearer token to outgoing requests when present', async () => {
    setAccessToken('my-token')
    let seenAuth: unknown

    api.defaults.adapter = async (config) => {
      seenAuth = config.headers.get('Authorization')
      return {
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
        config
      }
    }

    await api.get('/anything')
    expect(seenAuth).toBe('Bearer my-token')
  })

  it('does not attach an Authorization header when no token is set', async () => {
    let seenAuth: unknown = 'sentinel'

    api.defaults.adapter = async (config) => {
      seenAuth = config.headers.get('Authorization')
      return {
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
        config
      }
    }

    await api.get('/public')
    expect(seenAuth == null).toBe(true)
  })
})

describe('api 401 session interceptor', () => {
  const originalLocation = window.location

  beforeEach(() => {
    clearAccessToken()
    localStorage.clear()
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { ...originalLocation, pathname: '/account', href: '/account' }
    })
  })

  afterEach(() => {
    delete (api.defaults as { adapter?: AxiosAdapter }).adapter
    clearAccessToken()
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation
    })
  })

  it('clears the session and redirects without retrying a protected request', async () => {
    setAccessToken('expired-token')
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ id: 'u1', name: 'A', role: 'CUSTOMER' }))
    let calls = 0

    api.defaults.adapter = async (config) => {
      calls += 1
      return Promise.reject({ response: { status: 401 }, config })
    }

    await expect(api.get('/protected')).rejects.toBeDefined()
    expect(calls).toBe(1)
    expect(getAccessToken()).toBeNull()
    expect(localStorage.getItem(USER_STORAGE_KEY)).toBeNull()
    expect(window.location.href).toBe('/login')
  })

  it('does not refresh-retry a failed login call (surfaces the 401 inline)', async () => {
    api.defaults.adapter = async (config) => Promise.reject({ response: { status: 401 }, config })

    await expect(api.post('/auth/login', {})).rejects.toBeDefined()
    // No redirect: the login page handles its own error.
    expect(window.location.href).toBe('/account')
  })
})
