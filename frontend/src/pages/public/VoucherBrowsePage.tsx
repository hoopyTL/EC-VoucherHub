/**
 * VoucherBrowsePage — public voucher search & browse (task 12.1).
 *
 * Combines the {@link SearchFilters} controls, the {@link VoucherGrid} listing,
 * and {@link Pagination}. Data is fetched with TanStack Query, keyed on the
 * active search params so that every distinct filter/page combination is cached
 * and refetched only when it changes (per the design's "Voucher browsing uses
 * React Query with search params as query keys").
 *
 * Filters map directly to the public `GET /vouchers` query params (Req 11):
 * keyword, category, region, price range and partner. Only APPROVED, in-period,
 * in-stock vouchers are returned by the backend (Req 11.1).
 *
 * Partner filter options are derived from the loaded catalogue, since there is
 * no public partner-listing endpoint; the union of seen partners is accumulated
 * so the dropdown stays populated across pages and filters.
 *
 * _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 12.1_
 */
import { useMemo, useRef, useState, type CSSProperties } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { VoucherSearchParams } from '@ui-contracts'
import {
  SearchFilters,
  EMPTY_FILTERS,
  type PartnerOption,
  type VoucherFilterValues
} from '../../components/voucher/SearchFilters'
import { VoucherGrid } from '../../components/voucher/VoucherGrid'
import { Pagination } from '../../components/ui/Pagination'
import { searchVouchers, type SearchVouchersResponse } from '../../services/voucher.service'
import { colors, fonts, radius } from '../../theme/tokens'

/** Page size for the catalogue listing (matches the backend default). */
const PAGE_LIMIT = 12

/**
 * Converts the string-based filter form values into the typed API params,
 * dropping blank fields and parsing the price bounds to numbers.
 */
function toSearchParams(filters: VoucherFilterValues, page: number): VoucherSearchParams {
  const params: VoucherSearchParams = { page, limit: PAGE_LIMIT }
  if (filters.keyword) params.keyword = filters.keyword
  if (filters.category) params.category = filters.category
  if (filters.region) params.region = filters.region
  if (filters.partnerId) params.partnerId = filters.partnerId

  const min = Number(filters.minPrice)
  if (filters.minPrice !== '' && Number.isFinite(min)) params.minPrice = min

  const max = Number(filters.maxPrice)
  if (filters.maxPrice !== '' && Number.isFinite(max)) params.maxPrice = max

  const minDiscount = Number(filters.minDiscount)
  if (filters.minDiscount !== '' && Number.isFinite(minDiscount)) {
    params.minDiscount = minDiscount
  }

  return params
}

export function VoucherBrowsePage() {
  const [filters, setFilters] = useState<VoucherFilterValues>(EMPTY_FILTERS)
  const [page, setPage] = useState(1)

  const searchParams = useMemo(() => toSearchParams(filters, page), [filters, page])

  const query = useQuery<SearchVouchersResponse>({
    // Search params as the query key → cached per distinct filter/page combo.
    queryKey: ['vouchers', 'search', searchParams],
    queryFn: () => searchVouchers(searchParams),
    placeholderData: keepPreviousData
  })

  // Accumulate partner options across loaded pages so the dropdown persists
  // even when the current page contains a subset of partners.
  const partnerOptionsRef = useRef<Map<string, PartnerOption>>(new Map())
  const vouchers = query.data?.vouchers ?? []
  for (const voucher of vouchers) {
    if (!partnerOptionsRef.current.has(voucher.partnerId)) {
      partnerOptionsRef.current.set(voucher.partnerId, {
        id: voucher.partnerId,
        name: voucher.partner.businessName
      })
    }
  }
  const partnerOptions = useMemo(
    () => [...partnerOptionsRef.current.values()].sort((a, b) => a.name.localeCompare(b.name)),
    // Recompute when the loaded data changes (map mutated above).
    [query.data]
  )

  const total = query.data?.pagination.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT))

  function handleFilterChange(next: VoucherFilterValues) {
    setFilters(next)
    setPage(1) // Reset to the first page whenever the filter set changes.
  }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ paddingTop: 16 }}>
        <p
          style={{
            margin: '0 0 12px',
            fontFamily: fonts.display,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: colors.slate
          }}
        >
          ● Chợ voucher
        </p>
        <h1
          style={{
            margin: 0,
            fontFamily: fonts.display,
            fontSize: 'clamp(40px, 7vw, 72px)',
            fontWeight: 800,
            letterSpacing: '-0.04em',
            lineHeight: 1.02,
            color: colors.ink
          }}
        >
          Ưu đãi đáng để sẻ chia.
        </h1>
        <p
          style={{
            margin: '16px 0 0',
            maxWidth: 520,
            fontFamily: fonts.body,
            color: colors.slate,
            fontSize: 17,
            lineHeight: 1.6
          }}
        >
          Khám phá voucher ẩm thực, làm đẹp, du lịch và trải nghiệm từ các đối tác được tuyển chọn.
        </p>
      </header>

      <SearchFilters value={filters} onChange={handleFilterChange} partnerOptions={partnerOptions} />

      {query.isError ? (
        <p role='alert' style={errorStyle}>
          Chưa thể tải danh sách voucher. Vui lòng thử lại.
        </p>
      ) : (
        <>
          {!query.isLoading && (
            <p
              style={{
                margin: 0,
                fontFamily: fonts.display,
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: colors.slate
              }}
            >
              Tìm thấy {total} voucher
            </p>
          )}

          <VoucherGrid vouchers={vouchers} isLoading={query.isLoading} />

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </>
      )}
    </section>
  )
}

const errorStyle: CSSProperties = {
  padding: '14px 18px',
  borderRadius: radius.lg,
  background: colors.dangerSurface,
  border: `1px solid ${colors.dangerSurface}`,
  color: colors.onDangerSurface,
  fontSize: 14,
  fontFamily: fonts.body
}

export default VoucherBrowsePage
