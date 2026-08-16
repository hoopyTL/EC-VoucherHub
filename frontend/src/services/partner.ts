/**
 * Partner workspace API client (task 13.1).
 *
 * Thin typed wrappers over the shared Axios {@link api} client for the partner
 * branch-management and dashboard-overview flows:
 *   - GET    /partner/branches      → {@link listBranches}      (Req 7.4)
 *   - POST   /partner/branches      → {@link createBranch}      (Req 7.1)
 *   - PATCH  /partner/branches/:id  → {@link updateBranch}      (Req 7.2)
 *   - DELETE /partner/branches/:id  → {@link deleteBranch}      (Req 7.3)
 *   - GET    /partner/vouchers      → {@link listPartnerVouchers} (dashboard stats)
 *
 * There is no dedicated partner stats endpoint, so the dashboard derives its
 * overview from the branches and vouchers lists (see {@link deriveDashboardStats}).
 *
 * _Requirements: 7.1, 7.2, 7.3, 7.4_
 */
import { api } from './api'
import type { Branch, BranchFormValues, PartnerVouchersResponse } from '../types/partner'

interface ApiEnvelope<T> {
  success: true
  data: T
}

/** List the authenticated partner's branches (active and inactive). */
export async function listBranches(): Promise<Branch[]> {
  const { data } = await api.get<ApiEnvelope<Branch[]> | Branch[]>('/partner/branches')
  return Array.isArray(data) ? data : data.data
}

/** Create a new branch for the authenticated partner (Req 7.1). */
export async function createBranch(body: BranchFormValues): Promise<Branch> {
  const { data } = await api.post<ApiEnvelope<Branch>>('/partner/branches', body)
  return data.data
}

/** Update an existing branch's details (Req 7.2). */
export async function updateBranch(id: number, body: BranchFormValues): Promise<Branch> {
  const { data } = await api.patch<ApiEnvelope<Branch>>(`/partner/branches/${id}`, body)
  return data.data
}

/** Permanently delete an unreferenced branch (Req 7.3). */
export async function deleteBranch(id: number): Promise<void> {
  await api.delete(`/partner/branches/${id}`)
}

/**
 * Fetch a page of the partner's vouchers. The dashboard requests a large limit
 * so the derived counts cover the full catalogue rather than a single page.
 */
export async function listPartnerVouchers(limit = 100): Promise<PartnerVouchersResponse> {
  const { data } = await api.get<PartnerVouchersResponse>('/partner/vouchers', {
    params: { limit }
  })
  return data
}

/** Shape of the structured error body returned by the backend error handler. */
interface ApiErrorBody {
  error?: { code?: string; message?: string }
}

/**
 * Derive a user-facing message from a failed partner API call. Surfaces the
 * backend's structured `{ error: { message } }` when present, otherwise a
 * network/default fallback so internals are never leaked.
 */
export function getPartnerApiError(err: unknown, fallback: string): string {
  const response = (err as { response?: { status?: number; data?: ApiErrorBody } })?.response

  if (!response) {
    return 'Unable to reach the server. Please check your connection and try again.'
  }

  return response.data?.error?.message ?? fallback
}
