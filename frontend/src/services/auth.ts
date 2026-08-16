/**
 * Authentication password-management API client (tasks 11.x — Req 2.4–2.6).
 *
 * Thin typed wrappers over the shared Axios {@link api} client for the
 * self-service password lifecycle. The shared client attaches the bearer token
 * automatically, so `changePassword` requires an authenticated session while
 * `forgotPassword` is public.
 *
 *   - POST  /auth/password-reset → {@link forgotPassword}  (Req 2.4)
 *   - PATCH /auth/password       → {@link changePassword}  (Req 2.6, authenticated)
 *
 * _Requirements: 2.4, 2.5, 2.6_
 */
import { api } from './api'

interface ApiEnvelope<T> {
  success: true
  data: T
}

/** Result of a forgot-password request (Req 2.4). */
export interface ForgotPasswordResult {
  /**
   * Deliberately generic confirmation message. It is identical regardless of
   * whether an account exists, so the response never reveals which identifiers
   * are registered.
   */
  message: string
}

/** Result of a change-password call. */
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
  await api.post<ApiEnvelope<{ requested: true; resetCode: string }>>('/auth/password-reset', {
    identifier: emailOrPhone
  })
  return {
    message: 'If the account exists, password reset instructions have been created.'
  }
}

/**
 * Change the authenticated user's password (Req 2.6). Requires the correct
 * current password; the backend returns a 401 ("Current password is incorrect")
 * when it does not match.
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<MessageResult> {
  const { data: response } = await api.patch<ApiEnvelope<{ changed: true }>>('/auth/password', {
    currentPassword,
    newPassword
  })
  return { message: response.data.changed ? 'Password changed successfully.' : 'Unable to change password.' }
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
