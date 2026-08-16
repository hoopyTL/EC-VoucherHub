/**
 * Client-side response DTOs for the admin console endpoints (task 14.1).
 *
 * These mirror the JSON shapes returned by the backend admin service:
 *   - `DashboardStats` → GET /admin/dashboard/stats
 *   - `ListUsersResult` → GET /admin/users
 *   - `AccountStatusChange` → PATCH /admin/users/:id/{lock,unlock}
 *
 * The backend converts all Prisma `Decimal` money values to plain numbers
 * before serialising the dashboard stats, so revenue/price fields are typed as
 * `number` here. `Date` columns on the user/partner lists are serialised to ISO
 * strings. Status/role enums reuse the temporary UI-only unions from `@ui-contracts`
 * so the client and server stay in lockstep.
 */
import type { AccountStatus, OrderStatus, UserRole, VoucherStatus } from '@ui-contracts'

// ---------------------------------------------------------------------------
// Dashboard statistics (GET /admin/dashboard/stats)
// ---------------------------------------------------------------------------

/** Platform revenue broken down by time window (PAID orders only). */
export interface DashboardRevenue {
  total: number
  today: number
  thisWeek: number
  thisMonth: number
}

/** A best-selling voucher entry in the dashboard top-5 list. */
export interface TopVoucherStat {
  voucherId: string
  title: string
  soldQuantity: number
  salePrice: number
  partnerName: string
}

/** A per-partner performance row in the dashboard table. */
export interface PartnerPerformanceStat {
  partnerId: string
  businessName: string
  voucherCount: number
  orderCount: number
  revenue: number
}

/** Aggregate statistics returned by GET /admin/dashboard/stats. */
export interface DashboardStats {
  revenue: DashboardRevenue
  /** Order counts keyed by every OrderStatus (always present). */
  ordersByStatus: Record<OrderStatus, number>
  topVouchers: TopVoucherStat[]
  partnerPerformance: PartnerPerformanceStat[]
}

// ---------------------------------------------------------------------------
// Analytics (GET /admin/analytics) — BI series + breakdowns (§3.6)
// ---------------------------------------------------------------------------

/** One point in the daily revenue series. */
export interface RevenuePoint {
  /** `YYYY-MM-DD`. */
  date: string
  revenue: number
  orders: number
}

/** One point in the daily signups series. */
export interface SignupPoint {
  /** `YYYY-MM-DD`. */
  date: string
  signups: number
}

/** Revenue + units sold for one voucher category. */
export interface CategoryStat {
  category: string
  revenue: number
  unitsSold: number
}

/** Orders created → paid → cancelled funnel with the paid-conversion rate. */
export interface ConversionFunnel {
  ordersCreated: number
  ordersPaid: number
  ordersCancelled: number
  /** Paid / created in [0, 1]. */
  paidConversionRate: number
}

/** Full analytics payload returned by GET /admin/analytics. */
export interface AnalyticsOverview {
  windowDays: number
  revenueSeries: RevenuePoint[]
  signupSeries: SignupPoint[]
  categoryBreakdown: CategoryStat[]
  funnel: ConversionFunnel
}

// ---------------------------------------------------------------------------
// User management (GET /admin/users)
// ---------------------------------------------------------------------------

/** A user account normalized for the admin table. */
export interface AdminAccount {
  accountType: 'USER' | 'PARTNER'
  id: string
  email: string | null
  phone: string | null
  name: string
  role: UserRole
  status: AccountStatus
}

/** Result shape returned by GET /admin/users. */
export interface ListUsersResult {
  items: AdminAccount[]
  nextCursor: string | null
}

/** Query params accepted by GET /admin/users. */
export interface ListUsersParams {
  /** Case-insensitive search across name, email, and phone. */
  search?: string
  cursor?: string
  limit?: number
}

/** Descriptor returned by the lock/unlock endpoints. */
export interface AccountStatusChange {
  id: string
  accountType: 'USER' | 'PARTNER'
  status: AccountStatus
}

// ---------------------------------------------------------------------------
// Partner approval (GET /admin/partners/pending, PATCH approve/reject)
// ---------------------------------------------------------------------------

/**
 * A Partner registration awaiting review, as surfaced to the admin during the
 * approval workflow (GET /admin/partners/pending). Mirrors the backend
 * `PartnerApprovalView` — every Partner column except the hashed password.
 *
 * The backend `select` does not include the partner's branches, so they are
 * intentionally absent here; the approval flow works off the registration
 * fields below.
 */
export interface PartnerApprovalView {
  id: string
  email: string
  phone: string | null
  businessName: string
  businessRegNumber: string
  taxId: string
  representativeName: string
  representativeContact: string
  status: AccountStatus
  rejectionReason: string | null
  /** ISO date string. */
  createdAt: string
  /** ISO date string. */
  updatedAt: string
}

/** Result shape returned by GET /admin/partners/pending. */
export interface ListPendingPartnersResult {
  partners: PartnerApprovalView[]
  pagination: {
    page: number
    limit: number
    total: number
  }
}

// ---------------------------------------------------------------------------
// Voucher approval (GET /admin/vouchers/pending, PATCH approve/reject)
// ---------------------------------------------------------------------------

/**
 * A voucher awaiting review, as surfaced to the admin during the approval
 * workflow (GET /admin/vouchers/pending). Mirrors the backend
 * `VoucherApprovalView`, with the owning partner's business name attached.
 *
 * The server models money as Prisma `Decimal` (serialised to a JSON string)
 * and dates as `DateTime` (serialised to an ISO string), so those fields are
 * typed as `string` here.
 */
export interface VoucherApprovalView {
  id: string
  title: string
  description: string
  category: string
  /** Decimal serialised as a string. */
  originalPrice: string
  /** Decimal serialised as a string. */
  salePrice: string
  totalQuantity: number
  soldQuantity: number
  /** ISO date string. */
  salePeriodStart: string
  /** ISO date string. */
  salePeriodEnd: string
  /** ISO date string. */
  usagePeriodStart: string
  /** ISO date string. */
  usagePeriodEnd: string
  terms: string | null
  status: VoucherStatus
  rejectionReason: string | null
  partnerId: string
  /** ISO date string. */
  createdAt: string
  /** ISO date string. */
  updatedAt: string
  partner: { businessName: string }
}

/** Result shape returned by GET /admin/vouchers/pending. */
export interface ListPendingVouchersResult {
  vouchers: VoucherApprovalView[]
  pagination: {
    page: number
    limit: number
    total: number
  }
}
