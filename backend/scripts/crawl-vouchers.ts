import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { crawlAndPersist } from '../src/modules/crawler/crawler.service'
import type { CrawlStats, VoucherSource } from '../src/modules/crawler/crawler.types'
import { HighlandsSource } from '../src/modules/crawler/sources/highlands.source'
import { KlookSource } from '../src/modules/crawler/sources/klook.source'
import { MomoSource } from '../src/modules/crawler/sources/momo.source'

const prisma = new PrismaClient()
const sources: VoucherSource[] = [new KlookSource(), new MomoSource(), new HighlandsSource()]

async function main() {
  const results: CrawlStats[] = []
  for (const source of sources) {
    console.log(`[Crawler] Source: ${source.name}`)
    try {
      const stats = await crawlAndPersist(source, prisma)
      results.push(stats)
      console.log(
        `[FOUND] ${stats.fetched} [NEW] ${stats.inserted} [UPDATED] ${stats.updated} [SKIPPED] ${stats.skipped} [ERROR] ${stats.failed}`
      )
    } catch (error) {
      console.warn(`[SKIPPED SOURCE] ${source.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      results.push({ source: source.name, fetched: 0, inserted: 0, updated: 0, skipped: 0, failed: 1 })
    }
  }
  const total = results.reduce(
    (sum, item) => ({
      fetched: sum.fetched + item.fetched,
      inserted: sum.inserted + item.inserted,
      updated: sum.updated + item.updated,
      skipped: sum.skipped + item.skipped,
      failed: sum.failed + item.failed
    }),
    { fetched: 0, inserted: 0, updated: 0, skipped: 0, failed: 0 }
  )
  console.log('===== CRAWL RESULT =====')
  console.log(
    `Sources: ${results.length}\nFetched: ${total.fetched}\nInserted: ${total.inserted}\nUpdated: ${total.updated}\nSkipped: ${total.skipped}\nFailed: ${total.failed}`
  )
  console.log('========================')
  const samples = await prisma.externalPromotion.findMany({
    take: 10,
    orderBy: [{ source: 'asc' }, { name: 'asc' }],
    select: {
      source: true,
      name: true,
      originalPrice: true,
      salePrice: true,
      discountPercentage: true,
      saleEnd: true,
      sourceUrl: true
    }
  })
  console.table(
    samples.map((item) => ({
      ...item,
      originalPrice: item.originalPrice?.toString() ?? null,
      salePrice: item.salePrice?.toString() ?? null,
      saleEnd: item.saleEnd?.toISOString() ?? null
    }))
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
