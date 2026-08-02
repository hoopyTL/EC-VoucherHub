/**
 * Partner voucher API client (task 13.2).
 *
 * Typed wrappers over the partner-scoped voucher and branch endpoints used by
 * the partner voucher-management pages:
 *   - GET   `/partner/vouchers`            → list the partner's vouchers
 *   - GET   `/partner/branches`            → list the partner's branches
 *   - POST  `/partner/vouchers`            → create a DRAFT voucher (Req 8.x)
 *   - POST  `/partner/vouchers/:id/submit` → submit for approval (Req 9.1)
 *   - PATCH `/partner/vouchers/:id/pause`  → pause an approved voucher (Req 10.1)
 *   - PATCH `/partner/vouchers/:id/resume` → resume a paused voucher (Req 10.2)
 *   - PATCH `/partner/vouchers/:id/cancel` → cancel a voucher (Req 10.3)
 *
 * All endpoints require an authenticated, APPROVED partner; the shared Axios
 * client attaches the bearer token automatically. Money columns (`Decimal`) and
 * dates (`DateTime`) are serialised to JSON `string`s over the wire, so they are
 * typed as `string` here.
 *
 * _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 10.1, 10.2, 10.3_
 */
import type { CreateVoucherRequest, VoucherStatus } from '@ui-contracts'
import { api } from './api'

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------

/** A partner branch as returned by `GET /partner/branches`. */
export interface PartnerBranch {
  id: string
  name: string
  address: string
  region: string
  contact: string
  isActive: boolean
  partnerId: string
  createdAt: string
  updatedAt: string
}

/** A `voucherBranches` join row with its branch attached. */
export interface PartnerVoucherBranchLink {
  id: string
  voucherId: string
  branchId: string
  branch: PartnerBranch
}

/**
 * A voucher owned by the partner, as serialised by `GET /partner/vouchers`.
 * `originalPrice`/`salePrice` are `Decimal` columns serialised to strings and
 * the period fields are ISO-8601 strings.
 */
export interface PartnerVoucher {
  id: string
  title: string
  description: string
  category: string
  originalPrice: string
  salePrice: string
  totalQuantity: number
  soldQuantity: number
  salePeriodStart: string
  salePeriodEnd: string
  usagePeriodStart: string
  usagePeriodEnd: string
  terms: string | null
  imageUrl: string | null
  status: VoucherStatus
  rejectionReason: string | null
  partnerId: string
  createdAt: string
  updatedAt: string
  voucherBranches: PartnerVoucherBranchLink[]
}

/** Paginated envelope returned by `GET /partner/vouchers`. */
export interface ListPartnerVouchersResponse {
  vouchers: PartnerVoucher[]
  pagination: {
    page: number
    limit: number
    total: number
  }
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

/** TanStack Query key for the partner's voucher list. */
export const PARTNER_VOUCHERS_QUERY_KEY = ['partner-vouchers'] as const

/** TanStack Query key for the partner's branch list. */
export const PARTNER_BRANCHES_QUERY_KEY = ['partner-branches'] as const

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

/** List the authenticated partner's vouchers (newest first). */
export async function listPartnerVouchers(): Promise<ListPartnerVouchersResponse> {
  const { data } = await api.get<ListPartnerVouchersResponse>('/partner/vouchers')
  return data
}

/** List the authenticated partner's branches (active + inactive). */
export async function listPartnerBranches(): Promise<PartnerBranch[]> {
  const { data } = await api.get<PartnerBranch[]>('/partner/branches')
  return data
}

/** Create a new DRAFT voucher (Req 8.1, 8.5). */
export async function createVoucher(body: CreateVoucherRequest): Promise<PartnerVoucher> {
  const { data } = await api.post<PartnerVoucher>('/partner/vouchers', body)
  return data
}

/** Load one partner-owned voucher for the edit form. */
export async function getPartnerVoucher(id: string): Promise<PartnerVoucher> {
  const { data } = await api.get<PartnerVoucher>(`/partner/vouchers/${id}`)
  return data
}

/** Update a partner-owned voucher draft from the shared editor. */
export async function updatePartnerVoucher(id: string, body: CreateVoucherRequest): Promise<PartnerVoucher> {
  const { data } = await api.patch<PartnerVoucher>(`/partner/vouchers/${id}`, body)
  return data
}

/**
 * Upload a voucher image (future-development.md §4.3). Sends the raw file bytes
 * with the file's content type; the server validates magic bytes + size, stores
 * it, and returns the public URL to use as the voucher's `imageUrl`.
 */
export async function uploadVoucherImage(file: File): Promise<string> {
  const { data } = await api.post<{ url: string }>('/partner/uploads/voucher-image', file, {
    headers: { 'Content-Type': file.type }
  })
  return data.url
}

/** Submit a draft/rejected voucher for admin approval (Req 9.1). */
export async function submitVoucher(id: string): Promise<PartnerVoucher> {
  const { data } = await api.post<PartnerVoucher>(`/partner/vouchers/${id}/submit`)
  return data
}

/** Pause an approved voucher, hiding it from customers (Req 10.1). */
export async function pauseVoucher(id: string): Promise<PartnerVoucher> {
  const { data } = await api.patch<PartnerVoucher>(`/partner/vouchers/${id}/pause`)
  return data
}

/** Resume a paused voucher (Req 10.2). */
export async function resumeVoucher(id: string): Promise<PartnerVoucher> {
  const { data } = await api.patch<PartnerVoucher>(`/partner/vouchers/${id}/resume`)
  return data
}

/** Cancel a voucher, preventing further sales (Req 10.3). */
export async function cancelVoucher(id: string): Promise<PartnerVoucher> {
  const { data } = await api.patch<PartnerVoucher>(`/partner/vouchers/${id}/cancel`)
  return data
}

// ---------------------------------------------------------------------------
// Lifecycle action helpers (single source of truth for the state machine)
// ---------------------------------------------------------------------------

/**
 * A partner-driven lifecycle action available on a voucher, contextual to its
 * current status (see the design "Voucher State Machine").
 */
export type VoucherAction = 'submit' | 'pause' | 'resume' | 'cancel'

/**
 * Compute the lifecycle actions available for a voucher in the given status.
 * Mirrors the server-side transition rules so the UI only offers valid moves:
 *   - submit: DRAFT or REJECTED → PENDING_APPROVAL
 *   - pause:  APPROVED → PAUSED
 *   - resume: PAUSED → APPROVED
 *   - cancel: DRAFT / PENDING_APPROVAL / APPROVED / PAUSED → CANCELLED
 */
export function availableActions(status: VoucherStatus): VoucherAction[] {
  const actions: VoucherAction[] = []
  if (status === 'DRAFT' || status === 'REJECTED') actions.push('submit')
  if (status === 'APPROVED') actions.push('pause')
  if (status === 'PAUSED') actions.push('resume')
  if (status === 'DRAFT' || status === 'PENDING_APPROVAL' || status === 'APPROVED' || status === 'PAUSED') {
    actions.push('cancel')
  }
  return actions
}

// ---------------------------------------------------------------------------
// Error helper
// ---------------------------------------------------------------------------

/** Shape of the structured error body returned by the backend error handler. */
interface ApiErrorBody {
  error?: { code?: string; message?: string }
}

/**
 * Derive a user-facing message from a failed API call. Surfaces the backend's
 * structured `{ error: { message } }` when present, otherwise a network/default
 * fallback so internals are never leaked.
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  const response = (err as { response?: { status?: number; data?: ApiErrorBody } })?.response

  if (!response) {
    return 'Unable to reach the server. Please check your connection and try again.'
  }

  return response.data?.error?.message ?? fallback
}
