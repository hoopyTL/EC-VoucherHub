import { describe, expect, it } from 'vitest'
import {
  deterministicExternalId,
  normalizeUrl,
  parsePercentage,
  parseVietnameseDate,
  parseVnd
} from './crawler.normalizer'

describe('crawler normalizer', () => {
  it('parses VND formats', () => {
    expect(parseVnd('Từ ₫ 1,399,430')).toBe(1399430)
    expect(parseVnd('200.000đ')).toBe(200000)
  })
  it('parses percentages', () => {
    expect(parsePercentage('Sale Giảm 30%')).toBe(30)
    expect(parsePercentage('none')).toBeUndefined()
  })
  it('parses Vietnamese dates', () => {
    expect(parseVietnameseDate('31/08/2026')?.toISOString()).toBe('2026-08-31T00:00:00.000Z')
  })
  it('normalizes relative URLs', () => {
    expect(normalizeUrl('/deal/1', 'https://example.com/a')).toBe('https://example.com/deal/1')
  })
  it('creates deterministic IDs', () => {
    expect(deterministicExternalId('KLOOK', 'https://x')).toBe(deterministicExternalId('KLOOK', 'https://x'))
  })
})
