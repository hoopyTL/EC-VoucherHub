import { PrismaClient } from '@prisma/client'
import type { CrawlStats, ExternalVoucher, VoucherSource } from './crawler.types'

function valid(record: ExternalVoucher) {
  return Boolean(record.externalId && record.name && /^https?:\/\//.test(record.sourceUrl))
}

function comparable(record: ExternalVoucher) {
  return JSON.stringify({
    ...record,
    saleStart: record.saleStart?.toISOString(),
    saleEnd: record.saleEnd?.toISOString()
  })
}

export async function crawlAndPersist(source: VoucherSource, prisma: PrismaClient): Promise<CrawlStats> {
  const stats: CrawlStats = { source: source.name, fetched: 0, inserted: 0, updated: 0, skipped: 0, failed: 0 }
  const records = await source.crawl()
  stats.fetched = records.length
  for (const record of records) {
    if (!valid(record)) {
      stats.skipped += 1
      continue
    }
    try {
      const existing = await prisma.externalPromotion.findUnique({
        where: { source_externalId: { source: record.source, externalId: record.externalId } },
        select: {
          externalId: true,
          source: true,
          name: true,
          sourceUrl: true,
          description: true,
          originalPrice: true,
          salePrice: true,
          discountPercentage: true,
          imageUrl: true,
          saleStart: true,
          saleEnd: true,
          merchant: true,
          category: true,
          promoCode: true,
          terms: true
        }
      })
      if (
        existing &&
        comparable({
          ...existing,
          originalPrice: existing.originalPrice ? Number(existing.originalPrice) : undefined,
          salePrice: existing.salePrice ? Number(existing.salePrice) : undefined,
          description: existing.description ?? undefined,
          imageUrl: existing.imageUrl ?? undefined,
          merchant: existing.merchant ?? undefined,
          category: existing.category ?? undefined,
          promoCode: existing.promoCode ?? undefined,
          terms: existing.terms ?? undefined,
          discountPercentage: existing.discountPercentage ?? undefined,
          saleStart: existing.saleStart ?? undefined,
          saleEnd: existing.saleEnd ?? undefined
        } as ExternalVoucher) === comparable(record)
      ) {
        await prisma.externalPromotion.update({
          where: { source_externalId: { source: record.source, externalId: record.externalId } },
          data: { lastSeenAt: new Date() }
        })
        stats.skipped += 1
        continue
      }
      await prisma.externalPromotion.upsert({
        where: { source_externalId: { source: record.source, externalId: record.externalId } },
        create: { ...record, lastSeenAt: new Date() },
        update: { ...record, lastSeenAt: new Date() }
      })
      if (existing) stats.updated += 1
      else stats.inserted += 1
    } catch {
      stats.failed += 1
    }
  }
  return stats
}
