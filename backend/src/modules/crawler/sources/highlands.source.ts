import { fetchPublicHtml } from '../crawler.http'
import type { VoucherSource } from '../crawler.types'
import { extractPromotionLinks } from './html-source.helpers'

export class HighlandsSource implements VoucherSource {
  readonly name = 'HIGHLANDS' as const
  readonly url = 'https://www.highlandscoffee.com.vn/'
  async crawl() {
    return extractPromotionLinks(
      await fetchPublicHtml(this.url, 1),
      this.url,
      this.name,
      'Highlands Coffee',
      /(?:khuyen-mai|promotion|tin-tuc)/i
    )
  }
}
