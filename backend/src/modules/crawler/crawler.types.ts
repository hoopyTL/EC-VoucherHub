export type VoucherSourceName = 'KLOOK' | 'HIGHLANDS' | 'MOMO'

export interface ExternalVoucher {
  externalId: string
  source: VoucherSourceName
  name: string
  sourceUrl: string
  description?: string
  originalPrice?: number
  salePrice?: number
  discountPercentage?: number
  imageUrl?: string
  saleStart?: Date
  saleEnd?: Date
  merchant?: string
  category?: string
  promoCode?: string
  terms?: string
}

export interface VoucherSource {
  readonly name: VoucherSourceName
  crawl(): Promise<ExternalVoucher[]>
}

export interface CrawlStats {
  source: VoucherSourceName
  fetched: number
  inserted: number
  updated: number
  skipped: number
  failed: number
}
