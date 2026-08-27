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
  const [showAllBrandStrip, setShowAllBrandStrip] = useState(false)
  const filters = useMemo<VoucherFilterValues>(
    () => ({
      keyword: urlParams.get('keyword') ?? urlParams.get('q') ?? '',
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
  const isRefreshing = query.isFetching && !query.isLoading
  const cataloguePartnerCount = filterOptionsQuery.data?.partners.length ?? partnerOptions.length
  const activeFilterEntries = [
    filters.keyword ? { key: 'keyword', label: `“${filters.keyword}”` } : null,
    filters.category ? { key: 'category', label: filters.category } : null,
    filters.region ? { key: 'region', label: filters.region } : null,
    filters.partnerId
      ? {
          key: 'partnerId',
          label:
            filterOptionsQuery.data?.partners.find((partner) => partner.id === filters.partnerId)?.name ??
            partnerOptions.find((partner) => partner.id === filters.partnerId)?.name ??
            'Đối tác'
        }
      : null,
    Number(filters.minPrice) > 0
      ? { key: 'minPrice', label: `Từ ${Number(filters.minPrice).toLocaleString('vi-VN')} ₫` }
      : null,
    Number(filters.maxPrice) > 0
      ? { key: 'maxPrice', label: `${Number(filters.maxPrice).toLocaleString('vi-VN')} ₫` }
      : null,
    filters.minDiscount ? { key: 'minDiscount', label: `Giảm từ ${filters.minDiscount}%` } : null
  ].filter(Boolean) as Array<{ key: string; label: string }>

  function clearFilter(key: string) {
    const next = { ...filters }
    if (key === 'keyword') next.keyword = ''
    if (key === 'category') next.category = ''
    if (key === 'region') next.region = ''
    if (key === 'partnerId') next.partnerId = ''
    if (key === 'minPrice') next.minPrice = ''
    if (key === 'maxPrice') next.maxPrice = ''
    if (key === 'minDiscount') next.minDiscount = ''
    handleFilterChange(next)
  }

  function handleFilterChange(next: VoucherFilterValues) {
    const nextParams = new URLSearchParams()
    for (const [key, value] of Object.entries(next)) {
      if (value) nextParams.set(key, value)
    }
    if (sort !== 'newest') nextParams.set('sort', sort)
    if (next.keyword) nextParams.set('q', next.keyword)
    else nextParams.delete('q')
    setUrlParams(nextParams)
  }

  function handlePageChange(nextPage: number) {
    const nextParams = new URLSearchParams(urlParams)
    if (nextPage > 1) nextParams.set('page', String(nextPage))
    else nextParams.delete('page')
    setUrlParams(nextParams)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleSortChange(nextSort: string) {
    const nextParams = new URLSearchParams(urlParams)
    if (nextSort === 'newest') nextParams.delete('sort')
    else nextParams.set('sort', nextSort)
    setUrlParams(nextParams)
  }

  return (
    <section className='voucher-browse-page' style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className='voucher-browse-layout'>
        <aside className='voucher-browse-filter' aria-label='Bộ lọc voucher'>
          <SearchFilters
            value={filters}
            onChange={handleFilterChange}
            partnerOptions={filterOptionsQuery.data?.partners ?? partnerOptions}
            categoryOptions={filterOptionsQuery.data?.categories ?? []}
            regionOptions={filterOptionsQuery.data?.regions ?? []}
            priceRange={filterOptionsQuery.data?.priceRange}
          />
        </aside>
        <div className='voucher-browse-content'>
          <header className='voucher-browse-heading'>
            <p className='voucher-browse-breadcrumb'>
              Trang chủ <span>›</span> Tất cả ưu đãi
            </p>
            <h1>Tất cả ưu đãi</h1>
            <p className='voucher-browse-count'>
              {query.isLoading
                ? 'Đang tải voucher…'
                : `Tìm thấy ${total.toLocaleString('vi-VN')} voucher/ưu đãi từ ${cataloguePartnerCount.toLocaleString('vi-VN')} đối tác`}
            </p>
          </header>

          <div className='voucher-browse-toolbar'>
            <div className='voucher-browse-toolbar__left'>
              {!query.isLoading && (
                <div className='voucher-browse-active-filters' aria-label='Bộ lọc đang áp dụng'>
                  {activeFilterEntries.length > 0 && (
                    <>
                      {activeFilterEntries.map((entry) => (
                        <button
                          key={entry.key}
                          type='button'
                          aria-label={`Xóa bộ lọc ${entry.label}`}
                          onClick={() => clearFilter(entry.key)}
                          style={{
                            ...filterChipStyle,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            height: 34,
                            padding: '0 12px',
                            border: '1px solid rgba(79, 70, 229, 0.2)',
                            cursor: 'pointer'
                          }}
                        >
                          <span>{entry.label}</span>
                          <span aria-hidden='true' style={{ fontSize: 13, lineHeight: 1, opacity: 0.8 }}>
                            ×
                          </span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            <div className='voucher-browse-toolbar__right'>
              <label htmlFor='catalogue-sort' style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 13 }}>
                Sắp xếp
              </label>
              <select
                id='catalogue-sort'
                value={sort}
                onChange={(event) => handleSortChange(event.target.value)}
                style={{
                  padding: '10px 38px 10px 14px',
                  borderRadius: radius.md,
                  border: `1px solid ${colors.hairline}`,
                  background: colors.surface,
                  fontFamily: fonts.body,
                  minWidth: 200,
                  height: 40
                }}
              >
                <option value='newest'>Mới nhất</option>
                <option value='price-asc'>Giá tăng dần</option>
                <option value='price-desc'>Giá giảm dần</option>
                <option value='discount'>Giảm giá nhiều nhất</option>
              </select>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type='button'
                  aria-label='Chế độ lưới'
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    border: `1px solid ${colors.hairline}`,
                    background: colors.surface,
                    color: colors.accentHover,
                    fontWeight: 700
                  }}
                >
                  ▦
                </button>
                <button
                  type='button'
                  aria-label='Chế độ danh sách'
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    border: `1px solid ${colors.hairline}`,
                    background: colors.surface,
                    color: colors.accentHover,
                    fontWeight: 700
                  }}
                >
                  ☰
                </button>
              </div>
            </div>
          </div>

          {query.isError ? (
            <p role='alert' style={errorStyle}>
              Chưa thể tải danh sách voucher. Vui lòng thử lại.
            </p>
          ) : (
            <>
              <div
                className={isRefreshing ? 'voucher-results is-refreshing' : 'voucher-results'}
                aria-busy={isRefreshing}
              >
                {isRefreshing && (
                  <div className='voucher-results-loading' role='status' aria-live='polite'>
                    <span className='voucher-results-loading__spinner' aria-hidden='true' />
                    Đang cập nhật kết quả…
                  </div>
                )}
                <VoucherGrid vouchers={vouchers} isLoading={query.isLoading} />
              </div>

              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
                </div>
              )}

              <div className='voucher-browse-brand-strip' aria-label='Thương hiệu đồng hành'>
                <div className='voucher-browse-brand-strip__header'>
                  <span>Thương hiệu đối tác</span>
                  <button type='button' onClick={() => setShowAllBrandStrip((current) => !current)}>
                    {showAllBrandStrip ? 'Thu gọn' : 'Xem thêm'}
                  </button>
                </div>
                <div
                  className={
                    showAllBrandStrip
                      ? 'voucher-browse-brand-strip__list is-expanded'
                      : 'voucher-browse-brand-strip__list'
                  }
                >
                  {(filterOptionsQuery.data?.partners ?? [])
                    .slice(0, showAllBrandStrip ? undefined : 10)
                    .map((partner) => (
                      <button
                        type='button'
                        key={partner.id}
                        className='voucher-browse-brand-strip__item'
                        onClick={() => handleFilterChange({ ...filters, partnerId: partner.id })}
                      >
                        <span className='voucher-browse-brand-strip__mark'>
                          {partner.logoUrl ? (
                            <img src={partner.logoUrl} alt={`Logo ${partner.name}`} loading='lazy' />
                          ) : (
                            partner.name.slice(0, 2).toLocaleUpperCase('vi')
                          )}
                        </span>
                        <span className='voucher-browse-brand-strip__name'>{partner.name}</span>
                      </button>
                    ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

const filterChipStyle: CSSProperties = {
  borderRadius: 8,
  background: colors.accentSurface,
  color: colors.accentHover,
  fontFamily: fonts.display,
  fontSize: 12,
  fontWeight: 700,
  border: 'none',
  margin: 0,
  lineHeight: 1
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
