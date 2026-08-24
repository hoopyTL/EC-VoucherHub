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
import { useMemo, useRef, type CSSProperties } from 'react'
import { useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { VoucherSearchParams } from '@ui-contracts'
import { SearchFilters, type PartnerOption, type VoucherFilterValues } from '../../components/voucher/SearchFilters'
import { VoucherGrid } from '../../components/voucher/VoucherGrid'
import { Pagination } from '../../components/ui/Pagination'
import { getVoucherFilterOptions, searchVouchers, type SearchVouchersResponse } from '../../services/voucher.service'
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
  const [urlParams, setUrlParams] = useSearchParams()
  const filters = useMemo<VoucherFilterValues>(
    () => ({
      keyword: urlParams.get('keyword') ?? '',
      category: urlParams.get('category') ?? '',
      region: urlParams.get('region') ?? '',
      minPrice: urlParams.get('minPrice') ?? '',
      maxPrice: urlParams.get('maxPrice') ?? '',
      minDiscount: urlParams.get('minDiscount') ?? '',
      partnerId: urlParams.get('partnerId') ?? ''
    }),
    [urlParams]
  )
  const page = Math.max(1, Number(urlParams.get('page')) || 1)

  const searchParams = useMemo(() => toSearchParams(filters, page), [filters, page])

  const query = useQuery<SearchVouchersResponse>({
    // Search params as the query key → cached per distinct filter/page combo.
    queryKey: ['vouchers', 'search', searchParams],
    queryFn: () => searchVouchers(searchParams),
    placeholderData: keepPreviousData
  })
  const filterOptionsQuery = useQuery({
    queryKey: ['vouchers', 'filter-options'],
    queryFn: getVoucherFilterOptions,
    staleTime: 5 * 60 * 1000
  })

  // Accumulate partner options across loaded pages so the dropdown persists
  // even when the current page contains a subset of partners.
  const partnerOptionsRef = useRef<Map<string, PartnerOption>>(new Map())
  const sort = urlParams.get('sort') ?? 'newest'
  const vouchers = useMemo(() => {
    const items = [...(query.data?.vouchers ?? [])]
    if (sort === 'price-asc') items.sort((a, b) => Number(a.salePrice) - Number(b.salePrice))
    if (sort === 'price-desc') items.sort((a, b) => Number(b.salePrice) - Number(a.salePrice))
    if (sort === 'discount')
      items.sort(
        (a, b) =>
          1 - Number(b.salePrice) / Number(b.originalPrice) - (1 - Number(a.salePrice) / Number(a.originalPrice))
      )
    return items
  }, [query.data, sort])
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
  const cataloguePartnerCount = filterOptionsQuery.data?.partners.length ?? partnerOptions.length
  const activeFilterLabels = [
    filters.keyword && `“${filters.keyword}”`,
    filters.category,
    filters.region,
    filters.partnerId &&
      (filterOptionsQuery.data?.partners.find((partner) => partner.id === filters.partnerId)?.name ??
        partnerOptions.find((partner) => partner.id === filters.partnerId)?.name),
    filters.minPrice && `Từ ${Number(filters.minPrice).toLocaleString('vi-VN')} đ`,
    filters.maxPrice && `Đến ${Number(filters.maxPrice).toLocaleString('vi-VN')} đ`,
    filters.minDiscount && `Giảm từ ${filters.minDiscount}%`
  ].filter(Boolean) as string[]

  function handleFilterChange(next: VoucherFilterValues) {
    const nextParams = new URLSearchParams()
    for (const [key, value] of Object.entries(next)) {
      if (value) nextParams.set(key, value)
    }
    if (sort !== 'newest') nextParams.set('sort', sort)
    setUrlParams(nextParams)
  }

  function handlePageChange(nextPage: number) {
    const nextParams = new URLSearchParams(urlParams)
    if (nextPage > 1) nextParams.set('page', String(nextPage))
    else nextParams.delete('page')
    setUrlParams(nextParams)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 1200, margin: '0 auto' }}>
      <header
        style={{
          marginTop: 16,
          padding: 'clamp(28px, 5vw, 56px)',
          borderRadius: radius.xl,
          background: colors.ink,
          color: colors.onInk,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 32,
          alignItems: 'end',
          overflow: 'hidden'
        }}
      >
        <div style={{ flex: '1 1 520px', minWidth: 0 }}>
          <p style={{ margin: '0 0 12px', ...eyebrowStyle, color: colors.onInkMuted }}>
            <span style={{ color: colors.accent }}>●</span> Chợ voucher
          </p>
          <h1
            style={{
              margin: 0,
              maxWidth: 760,
              fontFamily: fonts.display,
              fontSize: 'clamp(38px, 6vw, 68px)',
              fontWeight: 800,
              letterSpacing: '-0.04em',
              lineHeight: 1.02
            }}
          >
            Ưu đãi đáng để sẻ chia.
          </h1>
          <p style={{ margin: '16px 0 0', maxWidth: 600, color: colors.onInkMuted, fontSize: 16, lineHeight: 1.65 }}>
            Khám phá voucher ẩm thực, làm đẹp, du lịch và trải nghiệm từ các đối tác được tuyển chọn.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, flex: '0 1 auto', flexWrap: 'wrap' }}>
          <Stat
            value={filterOptionsQuery.isLoading ? '…' : String(filterOptionsQuery.data?.categories.length ?? 0)}
            label='Danh mục'
          />
          <Stat value={filterOptionsQuery.isLoading ? '…' : String(cataloguePartnerCount)} label='Đối tác' />
        </div>
      </header>

      <SearchFilters
        value={filters}
        onChange={handleFilterChange}
        partnerOptions={filterOptionsQuery.data?.partners ?? partnerOptions}
        categoryOptions={filterOptionsQuery.data?.categories ?? []}
        regionOptions={filterOptionsQuery.data?.regions ?? []}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
        <label htmlFor='catalogue-sort' style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 13 }}>
          Sắp xếp
        </label>
        <select
          id='catalogue-sort'
          value={sort}
          onChange={(event) => {
            const next = new URLSearchParams(urlParams)
            if (event.target.value === 'newest') next.delete('sort')
            else next.set('sort', event.target.value)
            setUrlParams(next)
          }}
          style={{
            padding: '10px 38px 10px 14px',
            borderRadius: 999,
            border: `1px solid ${colors.hairline}`,
            background: colors.surface,
            fontFamily: fonts.body
          }}
        >
          <option value='newest'>Mới nhất</option>
          <option value='price-asc'>Giá tăng dần</option>
          <option value='price-desc'>Giá giảm dần</option>
          <option value='discount'>Giảm giá nhiều nhất</option>
        </select>
      </div>

      {query.isError ? (
        <p role='alert' style={errorStyle}>
          Chưa thể tải danh sách voucher. Vui lòng thử lại.
        </p>
      ) : (
        <>
          {!query.isLoading && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                flexWrap: 'wrap'
              }}
            >
              <p style={{ margin: 0, ...eyebrowStyle, color: colors.slate }}>Tìm thấy {total} voucher</p>
              {activeFilterLabels.length > 0 && (
                <div aria-label='Bộ lọc đang áp dụng' style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {activeFilterLabels.map((label) => (
                    <span key={label} style={filterChipStyle}>
                      {label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <VoucherGrid vouchers={vouchers} isLoading={query.isLoading} />

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          )}
        </>
      )}
    </section>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div
      style={{ minWidth: 92, padding: '14px 16px', border: '1px solid rgba(255,255,255,.16)', borderRadius: radius.lg }}
    >
      <strong style={{ display: 'block', fontFamily: fonts.display, fontSize: 24 }}>{value}</strong>
      <span style={{ color: colors.onInkMuted, fontSize: 12 }}>{label}</span>
    </div>
  )
}

const eyebrowStyle: CSSProperties = {
  fontFamily: fonts.display,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase'
}

const filterChipStyle: CSSProperties = {
  padding: '7px 11px',
  borderRadius: radius.full,
  background: colors.accentSurface,
  color: colors.accentHover,
  fontFamily: fonts.display,
  fontSize: 12,
  fontWeight: 700
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
