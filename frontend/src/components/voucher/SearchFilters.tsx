/**
 * SearchFilters — search bar + filter controls for the voucher catalogue
 * (task 12.1).
 *
 * Exposes a keyword search box plus category, region, price range, minimum
 * discount and partner filters (Req 11.2–11.7 / FR-CUS-03). The control is
 * "commit on submit": the user edits a local draft and applies all filters at
 * once via the Search button (or Clear to reset). Committing as a batch keeps
 * the page's TanStack Query key stable between edits, avoiding a request per
 * keystroke.
 *
 * Partner options are supplied by the page (derived from the loaded catalogue),
 * since there is no public partner-listing endpoint.
 *
 * _Requirements: 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_
 */
import { useEffect, useMemo, useState } from 'react'
import { colors, radius, shadows } from '../../theme/tokens'

/**
 * Selectable minimum-discount options for the discount dropdown (Req 11.7 /
 * FR-CUS-03). Each value is the percent sent to the API; the empty value means
 * "Any" (no discount filter applied).
 */
const MIN_DISCOUNT_OPTIONS: ReadonlyArray<{ label: string; value: string }> = [
  { label: 'Mọi mức giảm', value: '' },
  { label: 'Từ 10%', value: '10' },
  { label: 'Từ 20%', value: '20' },
  { label: 'Từ 30%', value: '30' },
  { label: 'Từ 40%', value: '40' },
  { label: 'Từ 50%', value: '50' }
]

/** The set of filters the catalogue understands (mirrors the API params). */
export interface VoucherFilterValues {
  keyword: string
  category: string
  region: string
  minPrice: string
  maxPrice: string
  /** Minimum discount percentage as a string ('' = any); Req 11.7 / FR-CUS-03. */
  minDiscount: string
  partnerId: string
}

/** A selectable partner option for the partner dropdown. */
export interface PartnerOption {
  id: string
  name: string
}

export interface SearchFiltersProps {
  /** Currently-applied filter values (controlled from the page). */
  value: VoucherFilterValues
  /** Called with the new filter set when the user applies or clears filters. */
  onChange: (next: VoucherFilterValues) => void
  /** Partner options for the partner dropdown. */
  partnerOptions?: PartnerOption[]
  categoryOptions?: string[]
  regionOptions?: string[]
}

/** An empty filter set — used by the page as the initial/cleared state. */
export const EMPTY_FILTERS: VoucherFilterValues = {
  keyword: '',
  category: '',
  region: '',
  minPrice: '',
  maxPrice: '',
  minDiscount: '',
  partnerId: ''
}

const MAX_PRICE_CAP = 1000000

const formatPriceShort = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0
  }).format(value) + ' ₫'

export function SearchFilters({
  value,
  onChange,
  partnerOptions = [],
  categoryOptions = [],
  regionOptions = []
}: SearchFiltersProps) {
  // Local draft so edits don't fire a request until the user applies them.
  const [draft, setDraft] = useState<VoucherFilterValues>(value)
  const [validationError, setValidationError] = useState('')
  const [partnerKeyword, setPartnerKeyword] = useState('')

  // Keep the draft in sync when the applied value changes externally
  // (e.g. the page clears filters or restores them from the URL).
  useEffect(() => {
    setDraft(value)
  }, [value])

  // The API accepts one value per filter group. The visible sidebar behaves
  // like a checkbox catalogue but commits the selected value immediately.
  function applyListChoice<K extends 'category' | 'region' | 'partnerId' | 'minDiscount'>(key: K, next: string) {
    const nextDraft = { ...draft, [key]: draft[key] === next ? '' : next }
    setDraft(nextDraft)
    setValidationError('')
    onChange({ ...nextDraft, keyword: nextDraft.keyword.trim() })
  }

  const visiblePartners = useMemo(
    () =>
      partnerOptions.filter((partner) =>
        partner.name.toLocaleLowerCase('vi').includes(partnerKeyword.toLocaleLowerCase('vi'))
      ),
    [partnerKeyword, partnerOptions]
  )

  const maxRangeValue = Number(draft.maxPrice !== '' ? draft.maxPrice : 0)
  const sliderPercent = Math.min((maxRangeValue / MAX_PRICE_CAP) * 100, 100)
  const priceSliderBackground = `linear-gradient(90deg, #4f46e5 0%, #4f46e5 ${sliderPercent}%, #e2e8f0 ${sliderPercent}%, #e2e8f0 100%)`
  const sliderDisplayValue = maxRangeValue > 0 ? formatPriceShort(maxRangeValue) : 'Tất cả'

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const min = Number(draft.minPrice)
    const max = Number(draft.maxPrice)
    if (draft.minPrice && draft.maxPrice && min > max) {
      setValidationError('Giá thấp nhất không được lớn hơn giá cao nhất.')
      return
    }
    setValidationError('')
    onChange({ ...draft, keyword: draft.keyword.trim() })
  }

  function handleClear() {
    setDraft(EMPTY_FILTERS)
    setValidationError('')
    onChange(EMPTY_FILTERS)
  }

  return (
    <form
      className='catalogue-filter-form'
      onSubmit={handleSubmit}
      aria-label='Tìm kiếm và lọc voucher'
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: 24,
        borderRadius: radius.xl,
        border: `1px solid ${colors.hairline}`,
        background: colors.surface,
        boxShadow: shadows.card
      }}
    >
      <div className='catalogue-filter-heading'>
        <strong>Bộ lọc</strong>
        <button type='button' onClick={handleClear} className='catalogue-filter-clear'>
          Xóa bộ lọc
        </button>
      </div>

      <div className='catalogue-filter-lists'>
        <fieldset className='catalogue-filter-section'>
          <legend>Danh mục</legend>
          {categoryOptions.map((category) => (
            <button
              key={category}
              type='button'
              className={draft.category === category ? 'catalogue-check is-selected' : 'catalogue-check'}
              aria-pressed={draft.category === category}
              onClick={() => applyListChoice('category', category)}
            >
              <span aria-hidden='true' />
              {category}
            </button>
          ))}
        </fieldset>

        <fieldset className='catalogue-filter-section'>
          <legend>Thương hiệu</legend>
          <input
            className='catalogue-brand-search'
            type='search'
            aria-label='Tìm thương hiệu'
            placeholder='Tìm thương hiệu'
            value={partnerKeyword}
            onChange={(event) => setPartnerKeyword(event.target.value)}
          />
          <div className='catalogue-option-list'>
            {visiblePartners.slice(0, 6).map((partner) => (
              <button
                key={partner.id}
                type='button'
                className={draft.partnerId === partner.id ? 'catalogue-check is-selected' : 'catalogue-check'}
                aria-pressed={draft.partnerId === partner.id}
                onClick={() => applyListChoice('partnerId', partner.id)}
              >
                <span aria-hidden='true' />
                {partner.name}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className='catalogue-filter-section'>
          <legend>Khu vực</legend>
          {regionOptions.map((region) => (
            <button
              key={region}
              type='button'
              className={draft.region === region ? 'catalogue-check is-selected' : 'catalogue-check'}
              aria-pressed={draft.region === region}
              onClick={() => applyListChoice('region', region)}
            >
              <span aria-hidden='true' />
              {region}
            </button>
          ))}
        </fieldset>

        <fieldset className='catalogue-filter-section'>
          <legend>Mức giảm</legend>
          {MIN_DISCOUNT_OPTIONS.filter((option) => option.value).map((option) => (
            <button
              key={option.value}
              type='button'
              className={draft.minDiscount === option.value ? 'catalogue-check is-selected' : 'catalogue-check'}
              aria-pressed={draft.minDiscount === option.value}
              onClick={() => applyListChoice('minDiscount', option.value)}
            >
              <span aria-hidden='true' />
              {option.label}
            </button>
          ))}
        </fieldset>

        <fieldset className='catalogue-filter-section'>
          <legend>Khoảng giá</legend>
          <div className='catalogue-price-slider'>
            <div className='catalogue-price-slider__row'>
              <span style={{ opacity: 0, pointerEvents: 'none' }}>0 ₫</span>
              <span>{sliderDisplayValue}</span>
            </div>
            <div className='catalogue-price-slider__rail' style={{ background: priceSliderBackground }}>
              <input
                aria-label='Giá tối đa'
                type='range'
                min={0}
                max={MAX_PRICE_CAP}
                step={10000}
                value={Number(draft.maxPrice !== '' ? draft.maxPrice : 0)}
                onChange={(event) => {
                  const nextMax = Number(event.target.value)
                  const next = { ...draft, minPrice: '0', maxPrice: String(nextMax) }
                  setDraft(next)
                  onChange({ ...next, keyword: next.keyword.trim() })
                }}
                style={{ direction: 'ltr' }}
              />
            </div>
          </div>
        </fieldset>
      </div>

      {validationError && (
        <p role='alert' style={{ margin: 0, color: colors.onDangerSurface, fontSize: 13 }}>
          {validationError}
        </p>
      )}
    </form>
  )
}

export default SearchFilters
