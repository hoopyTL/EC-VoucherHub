/**
 * useAuth — access the authentication context.
 *
 * NOTE: Minimal scaffolding from task 10.1 so the routing layer and
 * `ProtectedRoute` can compile. Task 10.2 may expand the underlying
 * `AuthContext`, but the hook contract (returning `AuthContextValue`) is
 * stable and consumed by the layout/routing code.
 */
import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from '../store/AuthContext'

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>.')
  }
  return ctx
}

export default useAuth
