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
import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { VOUCHER_CATEGORIES, VOUCHER_REGIONS } from '../../constants/voucher'
import { colors, fonts, radius, shadows } from '../../theme/tokens'

/**
 * Selectable minimum-discount options for the discount dropdown (Req 11.7 /
 * FR-CUS-03). Each value is the percent sent to the API; the empty value means
 * "Any" (no discount filter applied).
 */
const MIN_DISCOUNT_OPTIONS: ReadonlyArray<{ label: string; value: string }> = [
  { label: 'Any discount', value: '' },
  { label: '10% or more', value: '10' },
  { label: '20% or more', value: '20' },
  { label: '30% or more', value: '30' },
  { label: '40% or more', value: '40' },
  { label: '50% or more', value: '50' }
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

const fieldRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 12,
  alignItems: 'flex-end'
}

const selectStyle: CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  fontSize: 15,
  fontFamily: fonts.body,
  color: colors.ink,
  background: colors.surface,
  border: `1px solid ${colors.hairline}`,
  borderRadius: radius.md,
  boxSizing: 'border-box',
  cursor: 'pointer'
}

const labelStyle: CSSProperties = {
  display: 'block',
  marginBottom: 6,
  fontFamily: fonts.display,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: colors.slate
}

export function SearchFilters({ value, onChange, partnerOptions = [] }: SearchFiltersProps) {
  // Local draft so edits don't fire a request until the user applies them.
  const [draft, setDraft] = useState<VoucherFilterValues>(value)

  // Keep the draft in sync when the applied value changes externally
  // (e.g. the page clears filters or restores them from the URL).
  useEffect(() => {
    setDraft(value)
  }, [value])

  function update<K extends keyof VoucherFilterValues>(key: K, next: VoucherFilterValues[K]) {
    setDraft((prev) => ({ ...prev, [key]: next }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onChange({ ...draft, keyword: draft.keyword.trim() })
  }

  function handleClear() {
    setDraft(EMPTY_FILTERS)
    onChange(EMPTY_FILTERS)
  }

  return (
    <form
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
      <Input
        label='Tìm kiếm'
        type='search'
        placeholder='Tìm theo tiêu đề hoặc mô tả'
        value={draft.keyword}
        onChange={(e) => update('keyword', e.target.value)}
      />

      <div style={fieldRowStyle}>
        <div style={{ flex: '1 1 160px' }}>
          <label htmlFor='filter-category' style={labelStyle}>
            Danh mục
          </label>
          <select
            id='filter-category'
            style={selectStyle}
            value={draft.category}
            onChange={(e) => update('category', e.target.value)}
          >
            <option value=''>Tất cả danh mục</option>
            {VOUCHER_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: '1 1 160px' }}>
          <label htmlFor='filter-region' style={labelStyle}>
            Khu vực
          </label>
          <select
            id='filter-region'
            style={selectStyle}
            value={draft.region}
            onChange={(e) => update('region', e.target.value)}
          >
            <option value=''>Tất cả khu vực</option>
            {VOUCHER_REGIONS.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: '1 1 160px' }}>
          <label htmlFor='filter-partner' style={labelStyle}>
            Đối tác
          </label>
          <select
            id='filter-partner'
            style={selectStyle}
            value={draft.partnerId}
            onChange={(e) => update('partnerId', e.target.value)}
            disabled={partnerOptions.length === 0}
          >
            <option value=''>Tất cả đối tác</option>
            {partnerOptions.map((partner) => (
              <option key={partner.id} value={partner.id}>
                {partner.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={fieldRowStyle}>
        <div style={{ flex: '1 1 140px' }}>
          <Input
            label='Giá thấp nhất'
            type='number'
            inputMode='numeric'
            min={0}
            placeholder='0'
            value={draft.minPrice}
            onChange={(e) => update('minPrice', e.target.value)}
          />
        </div>
        <div style={{ flex: '1 1 140px' }}>
          <Input
            label='Giá cao nhất'
            type='number'
            inputMode='numeric'
            min={0}
            placeholder='Bất kỳ'
            value={draft.maxPrice}
            onChange={(e) => update('maxPrice', e.target.value)}
          />
        </div>
        <div style={{ flex: '1 1 160px' }}>
          <label htmlFor='filter-min-discount' style={labelStyle}>
            Giảm tối thiểu %
          </label>
          <select
            id='filter-min-discount'
            style={selectStyle}
            value={draft.minDiscount}
            onChange={(e) => update('minDiscount', e.target.value)}
          >
            {MIN_DISCOUNT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <Button type='submit' withArrow>
          Tìm kiếm
        </Button>
        <Button type='button' variant='secondary' onClick={handleClear}>
          Xóa lọc
        </Button>
      </div>
    </form>
  )
}

export default SearchFilters
