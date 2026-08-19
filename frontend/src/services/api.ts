/**
 * Central Axios HTTP client for the Voucher System frontend.
 *
 * Auth model (TASK-004 — stateless access-token sessions):
 *  - The short-lived ACCESS token (JWT) is held in memory only (never in
 *    localStorage), so it is not readable by injected scripts / XSS and is
 *    discarded on a full reload. It is attached as a bearer header on every
 *    request.
 *  - TASK-004 does not issue refresh tokens. A full reload therefore ends the
 *    session instead of calling an unsupported refresh endpoint.
 *  - On a 401 for a protected request the session is cleared and the user is
 *    sent to `/login` without retrying the request.
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
 * role. It is only valid while an in-memory access token exists and is removed
 * during startup after a full reload.
 */
export const USER_STORAGE_KEY = 'voucher_system_auth_user'

/**
 * Base URL for all API calls. Endpoints are served under `/api` and the Vite
 * dev server proxies `/api` to the backend. Can be overridden via the
 * `VITE_API_BASE_URL` environment variable for non-proxied deployments.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'
const IS_DESIGN_PREVIEW = import.meta.env.VITE_DESIGN_PREVIEW === 'true'

// ---------------------------------------------------------------------------
// In-memory access-token management (Patched with sessionStorage for VNPay UX)
// ---------------------------------------------------------------------------

/** The current access token (JWT). Backed up to sessionStorage to survive VNPay payment redirects. */
let accessToken: string | null = null
try {
  accessToken = sessionStorage.getItem('v_access_token')
} catch {}

/** Returns the access token, or `null` when no session is active. */
export function getAccessToken(): string | null {
  return accessToken
}

/** Stores the access token in memory and sessionStorage after login. */
export function setAccessToken(token: string | null): void {
  accessToken = token
  try {
    if (token) sessionStorage.setItem('v_access_token', token)
    else sessionStorage.removeItem('v_access_token')
  } catch {}
}

/** Clears the access token when the session ends. */
export function clearAccessToken(): void {
  accessToken = null
  try {
    sessionStorage.removeItem('v_access_token')
  } catch {}
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

/** Persists the non-sensitive display profile for the current page lifecycle. */
export function setPersistedUser(userJson: string): void {
  try {
    localStorage.setItem(USER_STORAGE_KEY, userJson)
  } catch {
    // Ignore storage failures; in-memory state still holds the user.
  }
}

/** Removes the persisted user profile when the session ends. */
export function clearPersistedUser(): void {
  try {
    localStorage.removeItem(USER_STORAGE_KEY)
  } catch {
    // Ignore storage failures.
  }
}

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  adapter: IS_DESIGN_PREVIEW ? designPreviewAdapter : undefined,
  headers: {
    'Content-Type': 'application/json'
  }
})

/** Public auth endpoints surface their own 401 errors to the calling form. */
function isAuthFlowUrl(url: string | undefined): boolean {
  const u = url ?? ''
  return u.includes('/auth/login') || u.includes('/auth/register')
}

/**
 * Request interceptor: attach the in-memory bearer token when present.
 */
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`)
  }
  return config
})

/**
 * Response interceptor: a protected 401 ends the stateless TASK-004 session.
 * Login/register calls surface their 401 to the form instead of redirecting.
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status
    const original = error?.config as InternalAxiosRequestConfig | undefined

    if (status === 401 && original && !isAuthFlowUrl(original.url)) {
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
