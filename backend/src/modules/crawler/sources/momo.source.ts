import { fetchPublicHtml } from '../crawler.http'
import type { VoucherSource } from '../crawler.types'
import { extractPromotionLinks } from './html-source.helpers'

export class MomoSource implements VoucherSource {
  readonly name = 'MOMO' as const
  readonly url = 'https://www.momo.vn/tin-tuc/khuyen-mai'
  async crawl() {
    return extractPromotionLinks(
      await fetchPublicHtml(this.url),
      this.url,
      this.name,
      'MoMo',
      /\/tin-tuc\/(?:khuyen-mai|promotion)\//i
    )
  }
}
