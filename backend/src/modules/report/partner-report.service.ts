import { OrderStatus } from '@prisma/client'
import prisma from '~/configs/prisma'
import { AppError } from '~/utils/app-error'

export async function getPartnerReport(userId: string) {
  const partner = await prisma.partner.findUnique({ where: { ownerUserId: userId }, select: { id: true } })
  if (!partner) throw AppError.forbidden('Tài khoản không thuộc đối tác')
  const products = await prisma.voucherProduct.findMany({
    where: { partnerId: partner.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, status: true }
  })
  const ids = products.map((p) => p.id)

  const orderGroups = ids.length
    ? await prisma.orderItem.groupBy({
        by: ['voucherProductId', 'unitPrice'],
        where: { voucherProductId: { in: ids }, order: { status: OrderStatus.PAID } },
        _sum: { quantity: true }
      })
    : []

  const issuedGroups = ids.length
    ? await prisma.issuedVoucherCode.groupBy({
        by: ['voucherProductId'],
        where: { voucherProductId: { in: ids }, order: { status: OrderStatus.PAID } },
        _count: { _all: true }
      })
    : []

  const usedGroups = ids.length
    ? await prisma.issuedVoucherCode.groupBy({
        by: ['voucherProductId'],
        where: {
          voucherProductId: { in: ids },
          order: { status: OrderStatus.PAID },
          usageLogs: { some: { result: 'SUCCESS' } }
        },
        _count: { _all: true }
      })
    : []

  const soldMap = new Map<string, { qty: number; revenue: number }>()
  for (const g of orderGroups) {
    const qty = g._sum.quantity ?? 0
    const revenue = qty * Number(g.unitPrice)
    const current = soldMap.get(g.voucherProductId) ?? { qty: 0, revenue: 0 }
    current.qty += qty
    current.revenue += revenue
    soldMap.set(g.voucherProductId, current)
  }
  const issuedMap = new Map(issuedGroups.map((g) => [g.voucherProductId, g._count._all]))
  const usedMap = new Map(usedGroups.map((g) => [g.voucherProductId, g._count._all]))

  const vouchers = products.map((product) => {
    const sold = soldMap.get(product.id) ?? { qty: 0, revenue: 0 }
    const issuedCount = issuedMap.get(product.id) ?? 0
    const usedCount = usedMap.get(product.id) ?? 0
    return {
      id: product.id,
      name: product.name,
      status: product.status,
      revenue: sold.revenue,
      issuedCount,
      soldCount: sold.qty,
      usedCount,
      usageRate: issuedCount === 0 ? 0 : usedCount / issuedCount
    }
  })
  const summary = vouchers.reduce(
    (result, voucher) => ({
      revenue: result.revenue + voucher.revenue,
      issuedCount: result.issuedCount + voucher.issuedCount,
      soldCount: result.soldCount + voucher.soldCount,
      usedCount: result.usedCount + voucher.usedCount
    }),
    { revenue: 0, issuedCount: 0, soldCount: 0, usedCount: 0 }
  )
  return {
    summary: { ...summary, usageRate: summary.issuedCount === 0 ? 0 : summary.usedCount / summary.issuedCount },
    vouchers
  }
}
