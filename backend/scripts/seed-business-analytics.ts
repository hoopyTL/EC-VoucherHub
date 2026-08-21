import { OrderStatus, PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const existing = await prisma.order.findFirst({ where: { giftRecipient: { path: ['analyticsDemo'], equals: true } } })
  if (existing) {
    console.log('Business analytics demo data already exists.')
    return
  }
  const customer = await prisma.user.findFirst({ where: { role: { name: { in: ['KHACH_HANG', 'CUSTOMER'] } } } })
  const vouchers = await prisma.voucherProduct.findMany({ where: { status: 'ON_SALE' }, orderBy: { createdAt: 'asc' }, take: 24 })
  if (!customer || vouchers.length < 6) throw new Error('Need one customer and at least six on-sale vouchers')

  for (let index = 0; index < 42; index += 1) {
    const voucher = vouchers[index % vouchers.length]
    const quantity = 1 + (index % 3)
    const createdAt = new Date()
    createdAt.setDate(createdAt.getDate() - index * 4)
    createdAt.setHours(9 + (index % 9), (index * 7) % 60, 0, 0)
    const status = index % 9 === 0 ? OrderStatus.CANCELLED : index % 11 === 0 ? OrderStatus.PENDING_PAYMENT : OrderStatus.PAID
    const totalAmount = Number(voucher.salePrice) * quantity
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: { customerId: customer.id, totalAmount, paymentMethod: index % 2 ? 'VNPAY' : 'STRIPE', status, paidAt: status === OrderStatus.PAID ? createdAt : null, createdAt, giftRecipient: { analyticsDemo: true, campaign: 'business-dashboard-2026' }, orderItems: { create: { voucherProductId: voucher.id, quantity, unitPrice: voucher.salePrice } } },
        include: { orderItems: true }
      })
      if (status === OrderStatus.PAID) {
        await tx.voucherProduct.update({ where: { id: voucher.id }, data: { remainingQuantity: { decrement: quantity } } })
        await tx.issuedVoucherCode.create({
          data: { code: `VHDEMO${String(index + 1).padStart(6, '0')}`, orderId: order.id, orderItemId: order.orderItems[0].id, voucherProductId: voucher.id, ownerUserId: customer.id, expiresAt: voucher.usageEnd, issuedAt: createdAt }
        })
      }
    })
  }
  console.log('Created 42 historical commerce orders for dashboard analytics.')
}

main().finally(() => prisma.$disconnect())
