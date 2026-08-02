/**
 * Authentication context for the Voucher System frontend.
 *
 * Holds the global auth state (`user`, `token`, `isAuthenticated`) using
 * React Context + useReducer and exposes `login` / `logout` actions.
 *
 * Session model (future-development.md §2.5 — httpOnly-cookie sessions):
 *  - The ACCESS token (JWT) is kept in memory only (via the API client's
 *    `setAccessToken`), never in localStorage, so XSS cannot exfiltrate it and
 *    it is dropped on a full reload.
 *  - The REFRESH token lives in an httpOnly cookie the browser sends
 *    automatically. On mount, when a (non-sensitive) user profile was persisted
 *    from a previous session, the provider silently calls `/auth/refresh` to
 *    mint a fresh access token — restoring the session across reloads without
 *    ever persisting a token. `isLoading` is `true` during that probe.
 *  - Only the user profile (id/name/role) is persisted, purely so the UI can
 *    render instantly while the refresh completes.
 *
 * The public contract consumed by the routing layer (`ProtectedRoute`,
 * `GuestRoute`, `Header`) is unchanged: `user`, `token`, `isAuthenticated`,
 * `isLoading`, `login`, `logout`, plus the `UserRole` type re-export.
 *
 * _Requirements: 2.1, 2.3, 20.2; future-development.md §2.5_
 */
import { createContext, useCallback, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react'
import type { AuthResponse, LoginRequest, UserRole } from '@ui-contracts'
import {
  api,
  clearAccessToken,
  clearPersistedUser,
  getAccessToken,
  getPersistedUser,
  refreshAccessToken,
  setAccessToken,
  setPersistedUser
} from '../services/api'

const IS_DESIGN_PREVIEW = import.meta.env.VITE_DESIGN_PREVIEW === 'true'
const DESIGN_GUEST_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/partner/register'] as const

/** Re-exported so existing consumers (`ProtectedRoute`) keep working while the
 * canonical definition lives in the shared types package. */
export type { UserRole } from '@ui-contracts'

/** The authenticated principal exposed to the UI. */
export interface AuthUser {
  id: string
  name: string
  role: UserRole
}

/** Global authentication state shape (matches the design document). */
export interface AuthState {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  /** True while the initial silent-refresh probe is in flight. */
  isRestoring: boolean
}

/** Actions and derived flags available to consumers of the auth context. */
export interface AuthContextValue extends Omit<AuthState, 'isRestoring'> {
  /**
   * True while the initial auth state is being restored via a silent
   * `/auth/refresh` probe (only when a previous session's profile was
   * persisted). Consumers like `ProtectedRoute` show a spinner until this
   * clears so a logged-in user is not bounced to `/login` on reload.
   */
  isLoading: boolean
  /** Authenticates with the backend, stores the token in memory, updates state. */
  login: (credentials: LoginRequest) => Promise<AuthUser>
  /** Clears the session (token + user) locally and revokes it server-side. */
  logout: () => void
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

type AuthAction =
  | { type: 'LOGIN'; payload: { user: AuthUser; token: string } }
  | { type: 'RESTORE_DONE'; payload: { user: AuthUser; token: string } | null }
  | { type: 'LOGOUT' }

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN':
      return {
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isRestoring: false
      }
    case 'RESTORE_DONE':
      if (action.payload) {
        return {
          user: action.payload.user,
          token: action.payload.token,
          isAuthenticated: true,
          isRestoring: false
        }
      }
      return { user: null, token: null, isAuthenticated: false, isRestoring: false }
    case 'LOGOUT':
      return { user: null, token: null, isAuthenticated: false, isRestoring: false }
    default:
      return state
  }
}

// ---------------------------------------------------------------------------
// Persisted user profile helpers (non-sensitive)
// ---------------------------------------------------------------------------

function readPersistedUser(): AuthUser | null {
  try {
    const raw = getPersistedUser()
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<AuthUser>
    if (parsed && typeof parsed.id === 'string' && typeof parsed.name === 'string' && typeof parsed.role === 'string') {
      return { id: parsed.id, name: parsed.name, role: parsed.role as UserRole }
    }
    return null
  } catch {
    return null
  }
}

function persistUser(user: AuthUser): void {
  setPersistedUser(JSON.stringify(user))
}

function previewUserForPath(pathname: string): AuthUser | null {
  if (DESIGN_GUEST_PATHS.some((path) => pathname.startsWith(path))) return null
  if (pathname.startsWith('/admin')) {
    return { id: 'admin-preview', name: 'Quản trị viên', role: 'ADMIN' }
  }
  if (pathname.startsWith('/partner')) {
    return { id: 'partner-preview', name: 'Saigon Select', role: 'PARTNER' }
  }
  return { id: 'customer-preview', name: 'Nguyễn Minh Anh', role: 'CUSTOMER' }
}

function previewRoleForIdentifier(identifier: string): UserRole {
  const normalized = identifier.toLowerCase()
  if (normalized.includes('admin')) return 'ADMIN'
  if (normalized.includes('partner')) return 'PARTNER'
  return 'CUSTOMER'
}

/**
 * Build the initial state. Three cases:
 *  1. An access token is already in memory AND a profile is persisted → the
 *     session is live (e.g. a fresh login earlier in the same page life, or a
 *     test that seeded the in-memory token). Start authenticated, no probe.
 *  2. A persisted profile but no in-memory token (the usual post-reload case)
 *     → a session *might* be restorable via the httpOnly refresh cookie, so we
 *     optimistically show the user and mark `isRestoring` until the silent
 *     `/auth/refresh` probe resolves.
 *  3. No persisted profile → start cleanly unauthenticated (no probe).
 */
function initAuthState(): AuthState {
  if (IS_DESIGN_PREVIEW && typeof window !== 'undefined') {
    const user = previewUserForPath(window.location.pathname)
    return {
      user,
      token: user ? 'design-preview-token' : null,
      isAuthenticated: Boolean(user),
      isRestoring: false
    }
  }
  const user = readPersistedUser()
  if (!user) {
    return { user: null, token: null, isAuthenticated: false, isRestoring: false }
  }
  const token = getAccessToken()
  if (token) {
    return { user, token, isAuthenticated: true, isRestoring: false }
  }
  return { user, token: null, isAuthenticated: false, isRestoring: true }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, undefined, initAuthState)
  // Guards the one-shot restore probe against React 18 StrictMode double-invoke.
  const didRestore = useRef(false)

  // On mount: if a profile was persisted, try to silently restore the session
  // by exchanging the httpOnly refresh cookie for a fresh access token.
  //
  // The `didRestore` ref guarantees the probe runs exactly once even under
  // React 18 StrictMode's intentional mount→unmount→mount double-invoke. We
  // deliberately do NOT use a cleanup-based `cancelled` flag here: StrictMode
  // would set it on the first (discarded) mount and, because the ref then
  // blocks the second mount from starting a new probe, the in-flight refresh
  // would resolve into a no-op — leaving `isRestoring` stuck true forever
  // (an endless loading spinner). The provider lives at the app root and never
  // genuinely unmounts, so dispatching after the async resolves is safe.
  useEffect(() => {
    if (didRestore.current) return
    didRestore.current = true

    if (!state.isRestoring) return

    void (async () => {
      const token = await refreshAccessToken()
      const user = readPersistedUser()
      if (token && user) {
        dispatch({ type: 'RESTORE_DONE', payload: { user, token } })
      } else {
        clearAccessToken()
        clearPersistedUser()
        dispatch({ type: 'RESTORE_DONE', payload: null })
      }
    })()
    // Run exactly once on mount.
  }, [])

  const login = useCallback(async (credentials: LoginRequest): Promise<AuthUser> => {
    if (IS_DESIGN_PREVIEW) {
      const role = previewRoleForIdentifier(credentials.emailOrPhone)
      const user = {
        id: `${role.toLowerCase()}-preview`,
        name: 'Tài khoản xem trước',
        role
      }
      dispatch({ type: 'LOGIN', payload: { user, token: 'design-preview-token' } })
      return user
    }
    const { data } = await api.post<AuthResponse>('/auth/login', credentials)
    setAccessToken(data.token)
    persistUser(data.user)
    dispatch({
      type: 'LOGIN',
      payload: { user: data.user, token: data.token }
    })
    return data.user
  }, [])

  const logout = useCallback(() => {
    if (IS_DESIGN_PREVIEW) {
      dispatch({ type: 'LOGOUT' })
      return
    }
    // Best-effort server-side revocation; clear locally regardless of outcome.
    void api.post('/auth/logout').catch(() => undefined)
    clearAccessToken()
    clearPersistedUser()
    dispatch({ type: 'LOGOUT' })
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: state.user,
      token: state.token,
      isAuthenticated: state.isAuthenticated,
      isLoading: state.isRestoring,
      login,
      logout
    }),
    [state, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthContext
