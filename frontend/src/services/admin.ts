/**
 * Admin console API client (task 14.1).
 *
 * Thin typed wrappers over the shared Axios {@link api} client for the admin
 * dashboard, user-management, and approval flows:
 *   - GET   /admin/dashboard/stats       → {@link getDashboardStats}  (Req 5.1–5.4 overview)
 *   - GET   /admin/users                 → {@link listUsers}          (Req 5.1, 5.2)
 *   - PATCH /admin/users/:id/lock        → {@link lockUser}           (Req 5.3)
 *   - PATCH /admin/users/:id/unlock      → {@link unlockUser}         (Req 5.4)
 *   - GET   /admin/partners/pending      → {@link listPendingPartners} (Req 6.1; FR-ADM-02)
 *   - PATCH /admin/partners/:id/approve  → {@link approvePartner}     (Req 6.2; FR-ADM-02)
 *   - PATCH /admin/partners/:id/reject   → {@link rejectPartner}      (Req 6.3; FR-ADM-02)
 *   - GET   /admin/vouchers/pending      → {@link listPendingVouchers} (Req 9.2; FR-ADM-03)
 *   - PATCH /admin/vouchers/:id/approve  → {@link approveVoucher}     (Req 9.3; FR-ADM-03)
 *   - PATCH /admin/vouchers/:id/reject   → {@link rejectVoucher}      (Req 9.4; FR-ADM-03)
 *
 * _Requirements: 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 9.2, 9.3, 9.4_
 */
import { api } from './api'
import type {
  AccountStatusChange,
  AnalyticsOverview,
  DashboardStats,
  ListPendingPartnersResult,
  ListPendingVouchersResult,
  ListUsersParams,
  ListUsersResult,
  PartnerApprovalView,
  VoucherApprovalView
} from '../types/admin'

/** Fetch platform-wide dashboard statistics for the admin overview. */
export async function getDashboardStats(): Promise<DashboardStats> {
  const { data } = await api.get<DashboardStats>('/admin/dashboard/stats')
  return data
}

/**
 * Fetch richer BI analytics (revenue/signup series, category mix, conversion
 * funnel) for the admin dashboard. `days` sets the trailing window for the time
 * series (clamped server-side; defaults to 30).
 */
export async function getAnalytics(days?: number): Promise<AnalyticsOverview> {
  const { data } = await api.get<AnalyticsOverview>('/admin/analytics', {
    params: { days }
  })
  return data
}

/**
 * List Customer/Admin and Partner accounts with optional search and pagination
 * (Req 5.1, 5.2). The backend searches name, email, and phone case-insensitively.
 */
export async function listUsers(params: ListUsersParams = {}): Promise<ListUsersResult> {
  const { data } = await api.get<ListUsersResult>('/admin/users', {
    params: {
      search: params.search || undefined,
      page: params.page,
      limit: params.limit
    }
  })
  return data
}

/** Lock an account so the holder can no longer log in (Req 5.3). */
export async function lockUser(id: string): Promise<AccountStatusChange> {
  const { data } = await api.patch<AccountStatusChange>(`/admin/users/${id}/lock`)
  return data
}

/** Unlock an account so the holder can log in again (Req 5.4). */
export async function unlockUser(id: string): Promise<AccountStatusChange> {
  const { data } = await api.patch<AccountStatusChange>(`/admin/users/${id}/unlock`)
  return data
}

// ---------------------------------------------------------------------------
// Partner approval (FR-ADM-02)
// ---------------------------------------------------------------------------

/**
 * List Partner registrations awaiting review, i.e. with `PENDING_APPROVAL`
 * status (Req 6.1). Supports simple page/limit pagination.
 */
export async function listPendingPartners(
  params: { page?: number; limit?: number } = {}
): Promise<ListPendingPartnersResult> {
  const { data } = await api.get<ListPendingPartnersResult>('/admin/partners/pending', {
    params: { page: params.page, limit: params.limit }
  })
  return data
}

/** Approve a pending Partner registration (Req 6.2). */
export async function approvePartner(id: string): Promise<PartnerApprovalView> {
  const { data } = await api.patch<PartnerApprovalView>(`/admin/partners/${id}/approve`)
  return data
}

/**
 * Reject a pending Partner registration with a required reason (Req 6.3). The
 * backend rejects an empty reason with a 400.
 */
export async function rejectPartner(id: string, reason: string): Promise<PartnerApprovalView> {
  const { data } = await api.patch<PartnerApprovalView>(`/admin/partners/${id}/reject`, { reason })
  return data
}

// ---------------------------------------------------------------------------
// Voucher approval (FR-ADM-03)
// ---------------------------------------------------------------------------

/**
 * List vouchers awaiting review, i.e. with `PENDING_APPROVAL` status (Req 9.2).
 * Each voucher carries the owning partner's business name. Supports simple
 * page/limit pagination.
 */
export async function listPendingVouchers(
  params: { page?: number; limit?: number } = {}
): Promise<ListPendingVouchersResult> {
  const { data } = await api.get<ListPendingVouchersResult>('/admin/vouchers/pending', {
    params: { page: params.page, limit: params.limit }
  })
  return data
}

/** Approve a pending voucher submission (Req 9.3). */
export async function approveVoucher(id: string): Promise<VoucherApprovalView> {
  const { data } = await api.patch<VoucherApprovalView>(`/admin/vouchers/${id}/approve`)
  return data
}

/**
 * Reject a pending voucher submission with a required reason (Req 9.4). The
 * backend rejects an empty reason with a 400.
 */
export async function rejectVoucher(id: string, reason: string): Promise<VoucherApprovalView> {
  const { data } = await api.patch<VoucherApprovalView>(`/admin/vouchers/${id}/reject`, { reason })
  return data
}

/** Shape of the structured error body returned by the backend error handler. */
interface ApiErrorBody {
  error?: { code?: string; message?: string }
}

/**
 * Derive a user-facing message from a failed admin API call. Surfaces the
 * backend's structured `{ error: { message } }` when present, otherwise a
 * network/default fallback so internals are never leaked.
 */
export function getAdminApiError(err: unknown, fallback: string): string {
  const response = (err as { response?: { status?: number; data?: ApiErrorBody } })?.response

  if (!response) {
    return 'Unable to reach the server. Please check your connection and try again.'
  }

  return response.data?.error?.message ?? fallback
}
