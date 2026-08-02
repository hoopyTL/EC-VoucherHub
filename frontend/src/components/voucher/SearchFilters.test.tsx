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
    />
  )
  return { onChange }
}

describe('SearchFilters', () => {
  it('renders the search box and all filter controls', () => {
    renderFilters()
    expect(screen.getByLabelText(/^tìm kiếm$/i)).toBeDefined()
    expect(screen.getByLabelText(/danh mục/i)).toBeDefined()
    expect(screen.getByLabelText(/khu vực/i)).toBeDefined()
    expect(screen.getByLabelText(/đối tác/i)).toBeDefined()
    expect(screen.getByLabelText(/giá thấp nhất/i)).toBeDefined()
    expect(screen.getByLabelText(/giá cao nhất/i)).toBeDefined()
    expect(screen.getByLabelText(/giảm tối thiểu/i)).toBeDefined()
  })

  it('commits all filter values on submit (trimming the keyword)', () => {
    const { onChange } = renderFilters()

    fireEvent.change(screen.getByLabelText(/^tìm kiếm$/i), {
      target: { value: '  spa  ' }
    })
    fireEvent.change(screen.getByLabelText(/danh mục/i), {
      target: { value: 'Spa & Beauty' }
    })
    fireEvent.change(screen.getByLabelText(/khu vực/i), {
      target: { value: 'Hà Nội' }
    })
    fireEvent.change(screen.getByLabelText(/đối tác/i), {
      target: { value: 'p2' }
    })
    fireEvent.change(screen.getByLabelText(/giá thấp nhất/i), {
      target: { value: '50000' }
    })
    fireEvent.change(screen.getByLabelText(/giá cao nhất/i), {
      target: { value: '200000' }
    })
    fireEvent.change(screen.getByLabelText(/giảm tối thiểu/i), {
      target: { value: '30' }
    })

    fireEvent.click(screen.getByRole('button', { name: /^tìm kiếm$/i }))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith({
      keyword: 'spa',
      category: 'Spa & Beauty',
      region: 'Hà Nội',
      partnerId: 'p2',
      minPrice: '50000',
      maxPrice: '200000',
      minDiscount: '30'
    })
  })

  it('does not fire onChange on every keystroke (commit-on-submit)', () => {
    const { onChange } = renderFilters()
    fireEvent.change(screen.getByLabelText(/^tìm kiếm$/i), {
      target: { value: 'food' }
    })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('clears all filters when Clear is pressed', () => {
    const { onChange } = renderFilters({ keyword: 'spa', category: 'Travel' })
    fireEvent.click(screen.getByRole('button', { name: /xóa lọc/i }))
    expect(onChange).toHaveBeenCalledWith(EMPTY_FILTERS)
  })
})
