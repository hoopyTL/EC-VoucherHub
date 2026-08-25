import { describe, expect, it } from 'vitest'
import { extractPromotionLinks } from './html-source.helpers'

describe('HTML source adapter', () => {
  it('normalizes fixture cards and deduplicates URLs', () => {
    const html = `<article><a href="/vi/activity/123"><h3>Vé công viên chủ đề</h3><img src="/a.jpg"/><span>₫ 450.000 Giá thị trường: 500.000đ Giảm 10%</span></a></article>`
    const rows = extractPromotionLinks(
      html + html,
      'https://www.klook.com/vi/deals/',
      'KLOOK',
      'Klook',
      /\/vi\/activity\//
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      name: 'Vé công viên chủ đề',
      salePrice: 450000,
      originalPrice: 500000,
      discountPercentage: 10
    })
  })
})
