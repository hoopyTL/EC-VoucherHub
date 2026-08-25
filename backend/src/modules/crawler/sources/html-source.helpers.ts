import * as cheerio from 'cheerio'
import type { ExternalVoucher, VoucherSourceName } from '../crawler.types'
import { cleanText, deterministicExternalId, normalizeUrl, parsePercentage, parseVnd } from '../crawler.normalizer'

export function extractPromotionLinks(
  html: string,
  baseUrl: string,
  source: VoucherSourceName,
  merchant: string,
  hrefPattern: RegExp
): ExternalVoucher[] {
  const $ = cheerio.load(html)
  const records = new Map<string, ExternalVoucher>()
  $('a[href]').each((_index, element) => {
    const href = $(element).attr('href')
    if (!href || !hrefPattern.test(href)) return
    const sourceUrl = normalizeUrl(href, baseUrl)
    const container = $(element).closest('article, li, [class*=card], [class*=item]')
    const text = cleanText(container.length ? container.text() : $(element).text())
    const name = cleanText(
      $(element).attr('title') || $(element).find('h2,h3,h4,[class*=title]').first().text() || $(element).text()
    )
    if (!name || name.length < 8 || name.length > 512) return
    const imageUrl = $(element).find('img').first().attr('src') || $(element).find('img').first().attr('data-src')
    const prices = text?.match(/(?:(?:₫|VND|đ)\s*[\d.,]+|[\d.,]+\s*(?:₫|VND|đ))/gi) ?? []
    const parsedPrices = prices.map(parseVnd).filter((price): price is number => price !== undefined)
    records.set(sourceUrl, {
      source,
      externalId: deterministicExternalId(source, sourceUrl),
      sourceUrl,
      name,
      description: text && text !== name ? text.slice(0, 2000) : undefined,
      merchant,
      category: source === 'KLOOK' ? 'Du lịch & Khách sạn' : 'Khuyến mãi',
      imageUrl: imageUrl ? normalizeUrl(imageUrl, baseUrl) : undefined,
      salePrice: parsedPrices[0],
      originalPrice: parsedPrices.length > 1 ? Math.max(...parsedPrices) : undefined,
      discountPercentage: parsePercentage(text)
    })
  })
  return [...records.values()]
}
