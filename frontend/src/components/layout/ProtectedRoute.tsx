/**
 * ProtectedRoute — role-based route guard.
 *
 * Wraps protected route elements and enforces authentication plus optional
 * role-based access control:
 *
 *   - Unauthenticated users are redirected to `/login` (preserving the
 *     attempted location so the login page can return them afterwards).
 *   - Authenticated users whose role is not in `allowedRoles` are redirected
 *     to a safe destination (their role's home, or `/` by default).
 *
 * Consumes the auth context via `useAuth` (provided by `AuthProvider`).
 */
import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import type { UserRole } from '../../store/AuthContext'
import { LoadingSpinner } from '../ui/LoadingSpinner'

export interface ProtectedRouteProps {
  /**
   * Roles permitted to access the wrapped route(s). When omitted, any
   * authenticated user is allowed.
   */
  allowedRoles?: UserRole[]
  /** Path to redirect unauthenticated users to. Defaults to `/login`. */
  redirectTo?: string
  /**
   * Optional explicit children. When omitted, an `<Outlet />` is rendered so
   * the component can guard nested routes.
   */
  children?: ReactNode
}

/** Default landing path for an authenticated user based on their role. */
export function roleHomePath(role: UserRole): string {
  switch (role) {
    case 'ADMIN':
      return '/admin'
    case 'PARTNER':
      return '/partner'
    case 'STAFF':
      return '/partner/redeem'
    case 'CUSTOMER':
    default:
      return '/'
  }
}

export function ProtectedRoute({ allowedRoles, redirectTo = '/login', children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  // Wait for the initial auth restore before deciding to redirect.
  if (isLoading) {
    return <LoadingSpinner label='Đang kiểm tra phiên đăng nhập' />
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Authenticated but lacking the required role: send to their own home.
    return <Navigate to={roleHomePath(user.role)} replace />
  }

  return <>{children ?? <Outlet />}</>
}

export default ProtectedRoute
