/**
 * Voucher catalogue API client (task 12.1).
 *
 * Thin wrappers over the public browse/detail endpoints:
 *   - GET `/vouchers`      → search/browse the live catalogue (Req 11)
 *   - GET `/vouchers/:id`  → full voucher detail (Req 12)
 *
 * These endpoints are public (no auth required). The functions here build the
 * query string from the search params and return the parsed response body. The
 * response types mirror the server payloads, but with `Decimal` and `DateTime`
 * fields represented as the JSON-serialized `string` form they arrive as over
 * the wire (Prisma serializes both to strings).
 *
 * _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 12.1, 12.2_
 */
import type { VoucherSearchParams, VoucherStatus } from '@ui-contracts'
import { api } from './api'

/** A partner branch as returned inside a voucher payload. */
export interface VoucherBranchSummary {
  id: string
  name: string
  address: string
  region: string
  contact: string
  isActive: boolean
}

/** The `voucherBranches` join row, with its branch attached. */
export interface VoucherBranchLink {
  id: string
  voucherId: string
  branchId: string
  branch: VoucherBranchSummary
}

/**
 * A voucher catalogue item as serialized by the API. `originalPrice` /
 * `salePrice` are `Decimal` columns serialized to strings; the date fields are
 * ISO-8601 strings.
 */
export interface VoucherListItem {
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
  /** Optional display image URL; `null` when the partner did not set one. */
  imageUrl: string | null
  status: VoucherStatus
  partnerId: string
  createdAt: string
  updatedAt: string
  partner: { businessName: string }
  voucherBranches: VoucherBranchLink[]
  /** Aggregate rating (Phase 3). Optional for backward-compat with older payloads. */
  rating?: { average: number; count: number }
  /** Flash-sale status + effective price (Phase 3). Optional for backward-compat. */
  flashSale?: FlashSaleInfo
}

/** Flash-sale status for a voucher (Phase 3). Money values are JSON numbers. */
export interface FlashSaleInfo {
  active: boolean
  flashSalePrice: number | null
  flashSaleStart: string | null
  flashSaleEnd: string | null
  /** The price the customer actually pays right now (flash price while active). */
  effectivePrice: number
}

/** Voucher detail augments the list item with derived fields from the server. */
export interface VoucherDetailResponse extends VoucherListItem {
  remainingQuantity: number
  discountPercentage: number
}

/** Paginated search result envelope returned by GET `/vouchers`. */
export interface SearchVouchersResponse {
  vouchers: VoucherListItem[]
  pagination: {
    page: number
    limit: number
    total: number
  }
}

/**
 * Builds the query params object for the search request, omitting empty /
 * undefined values so the backend only applies the filters the customer set.
 */
function buildSearchQuery(params: VoucherSearchParams): Record<string, string | number> {
  const query: Record<string, string | number> = {}
  if (params.keyword) query.keyword = params.keyword
  if (params.category) query.category = params.category
  if (params.region) query.region = params.region
  if (params.minPrice !== undefined) query.minPrice = params.minPrice
  if (params.maxPrice !== undefined) query.maxPrice = params.maxPrice
  if (params.minDiscount !== undefined) query.minDiscount = params.minDiscount
  if (params.partnerId) query.partnerId = params.partnerId
  if (params.page !== undefined) query.page = params.page
  if (params.limit !== undefined) query.limit = params.limit
  return query
}

/** Search/browse the public voucher catalogue (Requirement 11). */
export async function searchVouchers(params: VoucherSearchParams = {}): Promise<SearchVouchersResponse> {
  const { data } = await api.get<SearchVouchersResponse>('/vouchers', {
    params: buildSearchQuery(params)
  })
  return data
}

/** Fetch a single voucher's detail view (Requirement 12). */
export async function getVoucherDetail(id: string): Promise<VoucherDetailResponse> {
  const { data } = await api.get<VoucherDetailResponse>(`/vouchers/${id}`)
  return data
}
