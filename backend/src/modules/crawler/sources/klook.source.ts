import { fetchPublicHtml } from '../crawler.http'
import type { VoucherSource } from '../crawler.types'
import { extractPromotionLinks } from './html-source.helpers'

export class KlookSource implements VoucherSource {
  readonly name = 'KLOOK' as const
  readonly url = 'https://www.klook.com/vi/deals/'
  async crawl() {
    return extractPromotionLinks(
      await fetchPublicHtml(this.url),
      this.url,
      this.name,
      'Klook',
      /\/vi\/(?:activity|hotel|combo|deals)\//i
    )
  }
}
