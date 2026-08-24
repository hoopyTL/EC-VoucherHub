import prisma from '~/configs/prisma'
import { AppError } from '~/utils/app-error'

export async function getPartnerReport(userId: string) {
  const partner = await prisma.partner.findUnique({ where: { ownerUserId: userId }, select: { id: true } })
  if (!partner) throw AppError.forbidden('Tài khoản không thuộc đối tác')
  const products = await prisma.voucherProduct.findMany({
    where: { partnerId: partner.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      status: true,
      salePrice: true,
      totalQuantity: true,
      remainingQuantity: true,
      issuedVoucherCodes: { select: { id: true, usageLogs: { where: { result: 'SUCCESS' }, select: { id: true } } } }
    }
  })
  const vouchers = products.map((product) => {
    const soldCount = product.totalQuantity - product.remainingQuantity
    const issuedCount = product.issuedVoucherCodes.length
    const usedCount = product.issuedVoucherCodes.filter(({ usageLogs }) => usageLogs.length > 0).length
    return {
      id: product.id,
      name: product.name,
      status: product.status,
      revenue: Number(product.salePrice) * soldCount,
      issuedCount,
      soldCount,
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
