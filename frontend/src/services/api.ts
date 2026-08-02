/**
 * Central Axios HTTP client for the Voucher System frontend.
 *
 * Auth model (future-development.md §2.5 — httpOnly-cookie sessions):
 *  - The short-lived ACCESS token (JWT) is held in memory only (never in
 *    localStorage), so it is not readable by injected scripts / XSS and is
 *    discarded on a full reload. It is attached as a bearer header on every
 *    request.
 *  - The long-lived REFRESH token lives in an httpOnly cookie the browser sends
 *    automatically (hence `withCredentials`). It is never visible to JS.
 *  - A readable `csrf_token` cookie is echoed back in the `X-CSRF-Token` header
 *    on the cookie-authenticated `/auth/refresh` + `/auth/logout` calls
 *    (double-submit CSRF defence).
 *  - On a 401 for an ordinary request the client transparently calls
 *    `/auth/refresh` once to mint a fresh access token and retries; if refresh
 *    fails the session is cleared and the user is sent to `/login`.
 *
 * The in-memory token and the persisted (non-sensitive) user profile are
 * managed here so the response interceptor can clear credentials without a
 * circular import with `AuthContext`; the context reads/writes through these
 * helpers.
 */
import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { designPreviewAdapter } from '../design-preview/apiAdapter'

/**
 * Storage key for the persisted (non-sensitive) user profile — display name +
 * role, used to restore the UI instantly on reload. The access token is NOT
 * persisted; it is refreshed on demand from the httpOnly cookie.
 */
export const USER_STORAGE_KEY = 'voucher_system_auth_user'

/** Name of the readable CSRF cookie set by the server (double-submit pattern). */
const CSRF_COOKIE = 'csrf_token'

/**
 * Base URL for all API calls. Endpoints are served under `/api/v1` and the Vite
 * dev server proxies `/api` to the backend. Can be overridden via the
 * `VITE_API_BASE_URL` environment variable for non-proxied deployments.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'
const IS_DESIGN_PREVIEW = import.meta.env.VITE_DESIGN_PREVIEW === 'true'

// ---------------------------------------------------------------------------
// In-memory access-token management
// ---------------------------------------------------------------------------

/** The current access token (JWT), held only in memory. */
let accessToken: string | null = null

/** Returns the in-memory access token, or `null` when no session is active. */
export function getAccessToken(): string | null {
  return accessToken
}

/** Stores the access token in memory (set on login / refresh). */
export function setAccessToken(token: string | null): void {
  accessToken = token
}

/** Clears the in-memory access token (logout / failed refresh). */
export function clearAccessToken(): void {
  accessToken = null
}

// ---------------------------------------------------------------------------
// Persisted user profile (non-sensitive)
// ---------------------------------------------------------------------------

/** Reads the raw persisted user JSON, or `null`. */
export function getPersistedUser(): string | null {
  try {
    return localStorage.getItem(USER_STORAGE_KEY)
  } catch {
    return null
  }
}

/** Persists the (non-sensitive) user profile so the UI restores on reload. */
export function setPersistedUser(userJson: string): void {
  try {
    localStorage.setItem(USER_STORAGE_KEY, userJson)
  } catch {
    // Ignore storage failures; in-memory state still holds the user.
  }
}

/** Removes the persisted user profile (logout / failed refresh). */
export function clearPersistedUser(): void {
  try {
    localStorage.removeItem(USER_STORAGE_KEY)
  } catch {
    // Ignore storage failures.
  }
}

/** Read a cookie value by name from `document.cookie`. */
function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  adapter: IS_DESIGN_PREVIEW ? designPreviewAdapter : undefined,
  // Send the httpOnly refresh cookie + CSRF cookie with every request.
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})

/** Endpoints that must NOT trigger a refresh-retry (they are the auth flow itself). */
function isAuthFlowUrl(url: string | undefined): boolean {
  const u = url ?? ''
  return u.includes('/auth/login') || u.includes('/auth/refresh') || u.includes('/auth/register')
}

/**
 * Request interceptor: attach the in-memory bearer token when present, and
 * echo the CSRF cookie on the cookie-authenticated auth endpoints.
 */
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`)
  }
  const url = config.url ?? ''
  if (url.includes('/auth/refresh') || url.includes('/auth/logout')) {
    const csrf = readCookie(CSRF_COOKIE)
    if (csrf) {
      config.headers.set('X-CSRF-Token', csrf)
    }
  }
  return config
})

/**
 * Deduplicated refresh: concurrent 401s share a single in-flight `/auth/refresh`
 * call so we never fire a storm of refreshes. Resolves with the new access
 * token, or `null` when refresh failed (session truly gone).
 */
let refreshPromise: Promise<string | null> | null = null

interface RefreshResponse {
  token: string
  user: { id: string; name: string; role: string }
}

/** Perform (or join) a single refresh attempt. */
export function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = api
      .post<RefreshResponse>('/auth/refresh')
      .then(({ data }) => {
        setAccessToken(data.token)
        // Keep the persisted profile in sync (it may have changed server-side).
        if (data.user) setPersistedUser(JSON.stringify(data.user))
        return data.token
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

/**
 * Response interceptor: on a 401 for an ordinary request, transparently attempt
 * ONE refresh and retry. If refresh fails (or the failing request was itself an
 * auth-flow call), clear the session and send the user to `/login`. Auth-flow
 * calls (login/refresh/register) surface their 401 to the caller so it can show
 * an inline error instead of triggering a redirect loop.
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status
    const original = error?.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined

    if (status === 401 && original && !original._retried && !isAuthFlowUrl(original.url)) {
      const newToken = await refreshAccessToken()
      if (newToken) {
        original._retried = true
        original.headers.set('Authorization', `Bearer ${newToken}`)
        return api(original)
      }
      // Refresh failed → the session is over.
      clearAccessToken()
      clearPersistedUser()
      redirectToLogin()
    }

    return Promise.reject(error)
  }
)

/**
 * Navigates to the login page using a full document navigation. A hard redirect
 * also resets in-memory React state, ensuring no stale authenticated UI remains
 * after the session is invalidated. Guards against redundant redirects when the
 * user is already on the login page.
 */
function redirectToLogin(): void {
  if (typeof window === 'undefined') return
  if (window.location.pathname === '/login') return
  window.location.href = '/login'
}

export default api
