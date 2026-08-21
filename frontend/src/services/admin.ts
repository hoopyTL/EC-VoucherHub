/**
 * Admin console API client (task 14.1).
 *
 * Thin typed wrappers over the shared Axios {@link api} client for the admin
 * dashboard, user-management, and approval flows:
 *   - GET   /admin/dashboard/stats       → {@link getDashboardStats}  (Req 5.1–5.4 overview)
 *   - GET   /admin/users                 → {@link listUsers}          (Req 5.1, 5.2)
 *   - PATCH /admin/users/:id/lock        → {@link lockUser}           (Req 5.3)
 *   - PATCH /admin/users/:id/unlock      → {@link unlockUser}         (Req 5.4)
 *   - PATCH /admin/users/:id/role        → {@link changeUserRole}     (TASK-004 RBAC)
 *   - GET   /admin/partners/pending      → {@link listPendingPartners} (Req 6.1; FR-ADM-02)
 *   - PATCH /admin/partners/:id/approval → approve/reject Partner     (Req 6.2–6.3; FR-ADM-02)
 *   - GET   /admin/vouchers/pending      → {@link listPendingVouchers} (Req 9.2; FR-ADM-03)
 *   - PATCH /admin/vouchers/:id/approve  → {@link approveVoucher}     (Req 9.3; FR-ADM-03)
 *   - PATCH /admin/vouchers/:id/reject   → {@link rejectVoucher}      (Req 9.4; FR-ADM-03)
 *
 * _Requirements: 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 9.2, 9.3, 9.4_
 */
import type { AccountStatus, UserRole } from '@ui-contracts'
import type { ListVouchersDto, VoucherDto } from '@voucher/shared'

import { api } from './api'
import type {
  AdminAccount,
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

interface ApiEnvelope<T> {
  success: true
  data: T
}

interface BackendUserView {
  id: string
  email: string | null
  phone: string | null
  fullName: string
  role: { name: UserRole }
  status: AccountStatus
}

interface BackendListUsersResult {
  items: BackendUserView[]
  nextCursor: string | null
}

function toAdminAccount(user: BackendUserView): AdminAccount {
  const role = user.role.name
  return {
    accountType: role === 'PARTNER' ? 'PARTNER' : 'USER',
    id: user.id,
    email: user.email,
    phone: user.phone,
    name: user.fullName,
    role,
    status: user.status
  }
}

/** Fetch platform-wide dashboard statistics for the admin overview. */
export async function getDashboardStats(): Promise<DashboardStats> {
  const { data } = await api.get<ApiEnvelope<DashboardStats> | DashboardStats>('/admin/dashboard/stats')
  return 'data' in data ? data.data : data
}

/**
 * Fetch richer BI analytics (revenue/signup series, category mix, conversion
 * funnel) for the admin dashboard. `days` sets the trailing window for the time
 * series (clamped server-side; defaults to 30).
 */
export async function getAnalytics(days?: number): Promise<AnalyticsOverview> {
  const { data } = await api.get<ApiEnvelope<AnalyticsOverview> | AnalyticsOverview>('/admin/analytics', {
    params: { days }
  })
  return 'data' in data ? data.data : data
}

/**
 * List Customer/Admin and Partner accounts with optional search and pagination
 * (Req 5.1, 5.2). The backend searches name, email, and phone case-insensitively.
 */
export async function listUsers(params: ListUsersParams = {}): Promise<ListUsersResult> {
  const { data: response } = await api.get<ApiEnvelope<BackendListUsersResult>>('/admin/users', {
    params: {
      q: params.search || undefined,
      cursor: params.cursor,
      limit: params.limit
    }
  })
  return {
    items: response.data.items.map(toAdminAccount),
    nextCursor: response.data.nextCursor
  }
}

/** Lock an account so the holder can no longer log in (Req 5.3). */
export async function lockUser(id: string): Promise<AccountStatusChange> {
  const { data: response } = await api.patch<ApiEnvelope<BackendUserView>>(`/admin/users/${id}/lock`)
  const user = toAdminAccount(response.data)
  return { id: user.id, accountType: user.accountType, status: user.status }
}

/** Unlock an account so the holder can log in again (Req 5.4). */
export async function unlockUser(id: string): Promise<AccountStatusChange> {
  const { data: response } = await api.patch<ApiEnvelope<BackendUserView>>(`/admin/users/${id}/unlock`)
  const user = toAdminAccount(response.data)
  return { id: user.id, accountType: user.accountType, status: user.status }
}

/** Change an account's canonical RBAC role. */
export async function changeUserRole(id: string, role: UserRole): Promise<AdminAccount> {
  const { data: response } = await api.patch<ApiEnvelope<BackendUserView>>(`/admin/users/${id}/role`, { role })
  return toAdminAccount(response.data)
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
  const { data } = await api.get<ApiEnvelope<ListPendingPartnersResult> | ListPendingPartnersResult>(
    '/admin/partners/pending',
    {
      params: { page: params.page, limit: params.limit }
    }
  )
  return 'data' in data ? data.data : data
}

/** Approve a pending Partner registration (Req 6.2). */
export async function approvePartner(id: string): Promise<PartnerApprovalView> {
  const { data } = await api.patch<ApiEnvelope<PartnerApprovalView>>(`/admin/partners/${id}/approval`, {
    action: 'approve'
  })
  return data.data
}

/**
 * Reject a pending Partner registration with a required reason (Req 6.3). The
 * backend rejects an empty reason with a 400.
 */
export async function rejectPartner(id: string, reason: string): Promise<PartnerApprovalView> {
  const { data } = await api.patch<ApiEnvelope<PartnerApprovalView>>(`/admin/partners/${id}/approval`, {
    action: 'reject',
    reason
  })
  return data.data
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
  const { data } = await api.get<ApiEnvelope<ListVouchersDto>>('/admin/vouchers', {
    params: { page: params.page, limit: params.limit, status: 'PENDING_REVIEW' }
  })
  return { ...data.data, vouchers: data.data.vouchers.map(toVoucherApprovalView) }
}

/** Approve a pending voucher submission (Req 9.3). */
export async function approveVoucher(id: string): Promise<VoucherApprovalView> {
  const { data } = await api.patch<ApiEnvelope<VoucherDto>>(`/admin/vouchers/${id}/approval`, { action: 'approve' })
  return toVoucherApprovalView(data.data)
}

/**
 * Reject a pending voucher submission with a required reason (Req 9.4). The
 * backend rejects an empty reason with a 400.
 */
export async function rejectVoucher(id: string, reason: string): Promise<VoucherApprovalView> {
  const { data } = await api.patch<ApiEnvelope<VoucherDto>>(`/admin/vouchers/${id}/approval`, {
    action: 'reject',
    reason
  })
  return toVoucherApprovalView(data.data)
}

function toVoucherApprovalView(voucher: VoucherDto): VoucherApprovalView {
  return {
    id: voucher.id,
    title: voucher.name,
    description: voucher.description,
    category: voucher.category?.name ?? 'Chưa phân loại',
    originalPrice: voucher.originalPrice,
    salePrice: voucher.salePrice,
    totalQuantity: voucher.totalQuantity,
    soldQuantity: voucher.soldQuantity,
    salePeriodStart: voucher.saleStart,
    salePeriodEnd: voucher.saleEnd,
    usagePeriodStart: voucher.usageStart,
    usagePeriodEnd: voucher.usageEnd,
    terms: null,
    status: voucher.status,
    rejectionReason: voucher.rejectReason,
    partnerId: voucher.partnerId,
    createdAt: voucher.createdAt,
    updatedAt: voucher.updatedAt,
    partner: { businessName: voucher.partner.legalName }
  }
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
    return 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối và thử lại.'
  }

  return response.data?.error?.message ?? fallback
}
