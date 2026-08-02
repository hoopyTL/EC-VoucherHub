/**
 * GuestRoute — guard for guest-only (unauthenticated) pages.
 *
 * The inverse of {@link ProtectedRoute}: login, registration, and password-reset
 * pages only make sense for signed-out visitors. An already-authenticated user
 * who navigates to one of these is redirected to their role's home instead of
 * being shown a sign-up / login form again.
 *
 * Consumes the auth context via `useAuth` (provided by `AuthProvider`).
 */
import type { ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { roleHomePath } from './ProtectedRoute'
import { LoadingSpinner } from '../ui/LoadingSpinner'

export interface GuestRouteProps {
  /** Optional explicit children; otherwise renders an `<Outlet />`. */
  children?: ReactNode
}

export function GuestRoute({ children }: GuestRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth()

  // Wait for the initial session restore before deciding to redirect.
  if (isLoading) {
    return <LoadingSpinner label='Đang kiểm tra phiên đăng nhập' />
  }

  // Already signed in → send to the role's home rather than an auth form.
  if (isAuthenticated && user) {
    return <Navigate to={roleHomePath(user.role)} replace />
  }

  return <>{children ?? <Outlet />}</>
}

export default GuestRoute
