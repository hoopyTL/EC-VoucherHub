/**
 * Authentication password-management API client (tasks 11.x — Req 2.4–2.6).
 *
 * Thin typed wrappers over the shared Axios {@link api} client for the
 * self-service password lifecycle. The shared client attaches the bearer token
 * automatically, so `changePassword` requires an authenticated session while
 * `forgotPassword` / `resetPassword` are public.
 *
 *   - POST /auth/forgot-password  → {@link forgotPassword}  (Req 2.4)
 *   - POST /auth/reset-password   → {@link resetPassword}   (Req 2.5)
 *   - PUT  /auth/change-password  → {@link changePassword}  (Req 2.6, authenticated)
 *
 * _Requirements: 2.4, 2.5, 2.6_
 */
import { api } from './api'

/** Result of a forgot-password request (Req 2.4). */
export interface ForgotPasswordResult {
  /**
   * Deliberately generic confirmation message. It is identical regardless of
   * whether an account exists, so the response never reveals which identifiers
   * are registered.
   */
  message: string
  /**
   * The reset token. The backend only includes this outside production so the
   * flow can be exercised without real email/SMS delivery — it is surfaced in a
   * clearly-labelled "Demo only" helper, never in production.
   */
  resetToken?: string
}

/** Result of a reset-password or change-password call. */
export interface MessageResult {
  message: string
}

/**
 * Request a password reset for the given email or phone (Req 2.4).
 *
 * Always resolves with a generic message; the caller must surface that message
 * verbatim (never branching on whether the account exists).
 */
export async function forgotPassword(emailOrPhone: string): Promise<ForgotPasswordResult> {
  const { data } = await api.post<ForgotPasswordResult>('/auth/forgot-password', { emailOrPhone })
  return data
}

/**
 * Reset a password using a token from the reset link (Req 2.5). The backend
 * enforces the same minimum length as registration (8 characters) and rejects
 * invalid/expired tokens with a 400.
 */
export async function resetPassword(token: string, newPassword: string): Promise<MessageResult> {
  const { data } = await api.post<MessageResult>('/auth/reset-password', {
    token,
    newPassword
  })
  return data
}

/**
 * Change the authenticated user's password (Req 2.6). Requires the correct
 * current password; the backend returns a 401 ("Current password is incorrect")
 * when it does not match.
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<MessageResult> {
  const { data } = await api.put<MessageResult>('/auth/change-password', {
    currentPassword,
    newPassword
  })
  return data
}

/** Shape of the structured error body returned by the backend error handler. */
interface ApiErrorBody {
  error?: { code?: string; message?: string }
}

/**
 * Derive a user-facing message from a failed auth API call. Surfaces the
 * backend's structured `{ error: { message } }` when present, otherwise a
 * network/default fallback so internals are never leaked. Mirrors
 * {@link getAdminApiError} in `services/admin.ts`.
 */
export function getAuthApiError(err: unknown, fallback: string): string {
  const response = (err as { response?: { status?: number; data?: ApiErrorBody } })?.response

  if (!response) {
    return 'Unable to reach the server. Please check your connection and try again.'
  }

  return response.data?.error?.message ?? fallback
}
