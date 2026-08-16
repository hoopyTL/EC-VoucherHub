/**
 * Client-side response DTOs for the partner workspace endpoints.
 *
 * These mirror the JSON shapes returned by the backend partner services:
 *   - `Branch`        → GET/POST/PATCH /partner/branches
 *   - `PartnerVoucher` → GET /partner/vouchers (envelope: {@link PartnerVouchersResponse})
 *
 * The server models money as Prisma `Decimal` (serialised to a JSON string) and
 * dates as `DateTime` (serialised to an ISO string), so those fields are typed
 * as `string` here. Status enums reuse the canonical unions from
 * The UI preview imports these temporary contracts from `@ui-contracts`.
 */
import type { BranchDto, CreateBranchDto, VoucherStatus } from '@voucher/shared'

/** A partner branch, as returned by the `/partner/branches` endpoints. */
export type Branch = BranchDto

/** Editable branch fields, used for both create and update forms. */
export type BranchFormValues = CreateBranchDto

/** A voucher owned by the partner (GET /partner/vouchers), money as strings. */
export interface PartnerVoucher {
  id: string
  title: string
  category: string
  /** Decimal serialised as a string. */
  originalPrice: string
  /** Decimal serialised as a string. */
  salePrice: string
  totalQuantity: number
  soldQuantity: number
  status: VoucherStatus
  /** ISO date string. */
  createdAt: string
}

/** Paginated envelope returned by GET /partner/vouchers. */
export interface PartnerVouchersResponse {
  vouchers: PartnerVoucher[]
  pagination: {
    page: number
    limit: number
    total: number
  }
}
