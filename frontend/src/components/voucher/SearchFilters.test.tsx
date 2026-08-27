import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SearchFilters, EMPTY_FILTERS, type VoucherFilterValues } from './SearchFilters'

function renderFilters(overrides: Partial<VoucherFilterValues> = {}) {
  const onChange = vi.fn()
  const value = { ...EMPTY_FILTERS, ...overrides }
  render(
    <SearchFilters
      value={value}
      onChange={onChange}
      partnerOptions={[
        { id: 'p1', name: 'Serenity Spa' },
        { id: 'p2', name: 'Tasty Bites' }
      ]}
      categoryOptions={['Ẩm Thực', 'Spa & Làm đẹp', 'Tour du lịch']}
      regionOptions={['Hà Nội', 'TP. Hồ Chí Minh']}
      priceRange={{ min: 35_000, max: 8_990_000 }}
    />
  )
  return { onChange }
}

describe('SearchFilters', () => {
  it('renders the sidebar filter controls used by the new catalogue', () => {
    renderFilters()
    expect(screen.getByRole('group', { name: /danh mục/i })).toBeDefined()
    expect(screen.getByRole('group', { name: /thương hiệu/i })).toBeDefined()
    expect(screen.getByRole('group', { name: /khu vực/i })).toBeDefined()
    expect(screen.getByRole('group', { name: /mức giảm/i })).toBeDefined()
    expect(screen.getByRole('group', { name: /khoảng giá/i })).toBeDefined()
    expect(screen.getByLabelText(/tìm thương hiệu/i)).toBeDefined()
    expect(screen.getByLabelText(/giá từ/i)).toBeDefined()
    expect(screen.getByLabelText(/giá đến/i)).toBeDefined()
  })

  it('commits catalogue choices immediately', () => {
    const { onChange } = renderFilters()

    fireEvent.click(screen.getByRole('button', { name: 'Spa & Làm đẹp' }))
    fireEvent.click(screen.getByRole('button', { name: 'Hà Nội' }))
    fireEvent.click(screen.getByRole('button', { name: 'Tasty Bites' }))
    fireEvent.click(screen.getByRole('button', { name: 'Từ 30%' }))

    expect(onChange).toHaveBeenLastCalledWith({
      keyword: '',
      category: 'Spa & Làm đẹp',
      region: 'Hà Nội',
      partnerId: 'p2',
      minPrice: '',
      maxPrice: '',
      minDiscount: '30'
    })
  })

  it('filters the visible partner choices without applying a catalogue filter', () => {
    const { onChange } = renderFilters()
    fireEvent.change(screen.getByLabelText(/tìm thương hiệu/i), {
      target: { value: 'serenity' }
    })
    expect(screen.getByRole('button', { name: 'Serenity Spa' })).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Tasty Bites' })).toBeNull()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('applies a real price range above the old one-million limit', () => {
    const { onChange } = renderFilters()
    fireEvent.change(screen.getByLabelText(/giá từ/i), { target: { value: '1200000' } })
    fireEvent.change(screen.getByLabelText(/giá đến/i), { target: { value: '8990000' } })

    expect(onChange).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /áp dụng/i }))

    expect(onChange).toHaveBeenCalledWith({
      ...EMPTY_FILTERS,
      minPrice: '1200000',
      maxPrice: '8990000'
    })
  })

  it('clears both price bounds instead of sending maxPrice zero', () => {
    const { onChange } = renderFilters({ minPrice: '50000', maxPrice: '1000000' })
    fireEvent.click(screen.getByRole('button', { name: /tất cả/i }))
    expect(onChange).toHaveBeenCalledWith(EMPTY_FILTERS)
  })

  it('clears all filters when Clear is pressed', () => {
    const { onChange } = renderFilters({ keyword: 'spa', category: 'Tour du lịch' })
    fireEvent.click(screen.getByRole('button', { name: /xóa bộ lọc/i }))
    expect(onChange).toHaveBeenCalledWith(EMPTY_FILTERS)
  })
})
