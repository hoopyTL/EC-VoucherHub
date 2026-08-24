/**
 * Authentication context for the Voucher System frontend.
 *
 * Holds the global auth state (`user`, `token`, `isAuthenticated`) using
 * React Context + useReducer and exposes `login` / `logout` actions.
 *
 * Session model (TASK-004 — stateless access-token sessions):
 *  - The ACCESS token (JWT) is kept in memory only (via the API client's
 *    `setAccessToken`), never in localStorage, so XSS cannot exfiltrate it and
 *    it is dropped on a full reload.
 *  - TASK-004 has no refresh-token endpoint. A full reload clears any stale
 *    persisted profile and requires a new login.
 *
 * The public contract provides session state plus login, profile update and
 * logout actions to the routing and account layers.
 *
 * _Requirements: 2.1, 2.3, 20.2; future-development.md §2.5_
 */
import { createContext, useCallback, useMemo, useReducer, type ReactNode } from 'react'
import type { LoginRequest, UserRole } from '@ui-contracts'
import {
  api,
  clearAccessToken,
  clearPersistedUser,
  getAccessToken,
  getPersistedUser,
  setAccessToken,
  setPersistedUser
} from '../services/api'
import { updateProfile as updateProfileRequest, type AuthProfile, type UpdateProfileInput } from '../services/auth'

const IS_DESIGN_PREVIEW = import.meta.env.VITE_DESIGN_PREVIEW === 'true'
const DESIGN_GUEST_PATHS = ['/login', '/register', '/forgot-password', '/partner/register'] as const

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
  /** Kept for route-guard compatibility; TASK-004 initialization is synchronous. */
  isRestoring: boolean
}

/** Actions and derived flags available to consumers of the auth context. */
export interface AuthContextValue extends Omit<AuthState, 'isRestoring'> {
  /** Kept for route compatibility; always false for TASK-004 sessions. */
  isLoading: boolean
  /** Authenticates with the backend, stores the token in memory, updates state. */
  login: (credentials: LoginRequest) => Promise<AuthUser>
  /** Updates the backend profile and synchronizes global display state. */
  updateProfile: (input: UpdateProfileInput) => Promise<AuthProfile>
  /** Clears the session (token + user) locally and revokes it server-side. */
  logout: () => void
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

type AuthAction =
  | { type: 'LOGIN'; payload: { user: AuthUser; token: string } }
  | { type: 'UPDATE_USER'; payload: AuthUser }
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
    case 'UPDATE_USER':
      return { ...state, user: action.payload }
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
  if (normalized.includes('staff')) return 'STAFF'
  if (normalized.includes('partner')) return 'PARTNER'
  return 'CUSTOMER'
}

/**
 * A session is valid only when both the in-memory token and its display profile
 * exist. A full reload loses the token, so stale profile storage is cleared.
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
  const token = getAccessToken()
  if (user && token) {
    return { user, token, isAuthenticated: true, isRestoring: false }
  }
  if (user) clearPersistedUser()
  return { user: null, token: null, isAuthenticated: false, isRestoring: false }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export interface AuthProviderProps {
  children: ReactNode
}

interface ApiEnvelope<T> {
  success: true
  data: T
}

interface BackendLoginResponse {
  token: string
  user: { id: string; role: UserRole }
}

interface BackendProfileResponse {
  id: string
  fullName: string
  role: { name: UserRole }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, undefined, initAuthState)

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
    const loginResponse = await api.post<ApiEnvelope<BackendLoginResponse>>('/auth/login', {
      identifier: credentials.emailOrPhone,
      password: credentials.password
    })
    const { token } = loginResponse.data.data
    setAccessToken(token)

    try {
      const profileResponse = await api.get<ApiEnvelope<BackendProfileResponse>>('/me')
      const profile = profileResponse.data.data
      const user: AuthUser = { id: profile.id, name: profile.fullName, role: profile.role.name }
      persistUser(user)
      dispatch({
        type: 'LOGIN',
        payload: { user, token }
      })
      return user
    } catch (error) {
      clearAccessToken()
      clearPersistedUser()
      throw error
    }
  }, [])

  const updateProfile = useCallback(
    async (input: UpdateProfileInput): Promise<AuthProfile> => {
      if (IS_DESIGN_PREVIEW) {
        const current = state.user ?? { id: 'customer-preview', name: input.fullName, role: 'CUSTOMER' as const }
        const user = { ...current, name: input.fullName }
        dispatch({ type: 'UPDATE_USER', payload: user })
        return {
          id: user.id,
          email: input.email ?? null,
          phone: input.phone ?? null,
          fullName: user.name,
          address: input.address ?? null,
          status: 'ACTIVE',
          role: { name: user.role },
          createdAt: '',
          updatedAt: ''
        }
      }
      const profile = await updateProfileRequest(input)
      const user: AuthUser = { id: profile.id, name: profile.fullName, role: profile.role.name }
      persistUser(user)
      dispatch({ type: 'UPDATE_USER', payload: user })
      return profile
    },
    [state.user]
  )

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
      updateProfile,
      logout
    }),
    [state, login, updateProfile, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthContext
