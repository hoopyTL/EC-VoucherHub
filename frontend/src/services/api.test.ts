import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { AxiosAdapter } from 'axios'
import { api, getAccessToken, setAccessToken, clearAccessToken } from './api'

describe('api in-memory access token', () => {
  beforeEach(() => {
    clearAccessToken()
  })

  it('returns null when no token is set', () => {
    expect(getAccessToken()).toBeNull()
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

describe('api 401 refresh-and-retry interceptor', () => {
  const originalLocation = window.location

  beforeEach(() => {
    clearAccessToken()
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

  it('transparently refreshes once and retries the original request on a 401', async () => {
    setAccessToken('expired-token')
    let calls = 0

    api.defaults.adapter = async (config) => {
      const url = config.url ?? ''
      // The refresh call succeeds with a new token.
      if (url.includes('/auth/refresh')) {
        return {
          data: { token: 'fresh-token', user: { id: 'u1', name: 'A', role: 'CUSTOMER' } },
          status: 200,
          statusText: 'OK',
          headers: {},
          config
        }
      }
      // The protected call 401s the first time, succeeds after refresh.
      calls += 1
      if (calls === 1) {
        return Promise.reject({ response: { status: 401 }, config })
      }
      return {
        data: { ok: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config
      }
    }

    const res = await api.get('/protected')
    expect(res.status).toBe(200)
    // The access token was replaced by the refreshed one.
    expect(getAccessToken()).toBe('fresh-token')
  })

  it('clears the session and redirects to /login when refresh also fails', async () => {
    setAccessToken('expired-token')

    api.defaults.adapter = async (config) => {
      // Both the protected call and the refresh call fail with 401.
      return Promise.reject({ response: { status: 401 }, config })
    }

    await expect(api.get('/protected')).rejects.toBeDefined()
    expect(getAccessToken()).toBeNull()
    expect(window.location.href).toBe('/login')
  })

  it('does not refresh-retry a failed login call (surfaces the 401 inline)', async () => {
    api.defaults.adapter = async (config) => Promise.reject({ response: { status: 401 }, config })

    await expect(api.post('/auth/login', {})).rejects.toBeDefined()
    // No redirect: the login page handles its own error.
    expect(window.location.href).toBe('/account')
  })
})
