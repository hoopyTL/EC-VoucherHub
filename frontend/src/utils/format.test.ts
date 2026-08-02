import { describe, it, expect } from 'vitest'
import { parsePrice, formatCurrency, discountPercent, formatDate, formatDateRange } from './format'

describe('parsePrice', () => {
  it('parses Decimal strings to numbers', () => {
    expect(parsePrice('150000.00')).toBe(150000)
  })

  it('passes through numbers', () => {
    expect(parsePrice(2500)).toBe(2500)
  })

  it('returns 0 for null/undefined/unparseable input', () => {
    expect(parsePrice(null)).toBe(0)
    expect(parsePrice(undefined)).toBe(0)
    expect(parsePrice('not-a-number')).toBe(0)
  })
})

describe('formatCurrency', () => {
  it('formats a value as VND currency containing the grouped amount', () => {
    const formatted = formatCurrency('150000')
    // Locale separators vary by environment; assert the digits/symbol are present.
    expect(formatted).toMatch(/150[.,\s]000/)
    expect(formatted).toContain('₫')
  })
})

describe('discountPercent', () => {
  it('computes the rounded discount percentage', () => {
    expect(discountPercent(200000, 150000)).toBe(25)
    expect(discountPercent('100', '75')).toBe(25)
  })

  it('returns 0 when sale price is not lower than original', () => {
    expect(discountPercent(100, 100)).toBe(0)
    expect(discountPercent(100, 120)).toBe(0)
  })

  it('returns 0 for a non-positive original price', () => {
    expect(discountPercent(0, 0)).toBe(0)
  })
})

describe('formatDate / formatDateRange', () => {
  it('formats an ISO date', () => {
    expect(formatDate('2025-12-31T00:00:00.000Z')).toMatch(/2025/)
  })

  it('returns empty string for invalid/missing dates', () => {
    expect(formatDate(undefined)).toBe('')
    expect(formatDate('garbage')).toBe('')
  })

  it('joins a range with an en dash', () => {
    const range = formatDateRange('2025-01-01T00:00:00.000Z', '2025-02-01T00:00:00.000Z')
    expect(range).toContain('–')
  })
})
