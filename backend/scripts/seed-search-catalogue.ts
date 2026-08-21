import { PrismaClient, VoucherStatus } from '@prisma/client'

const prisma = new PrismaClient()
const DAY = 86_400_000
const regions = ['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Cần Thơ', 'Hải Phòng']
const descriptors = [
  'Trải nghiệm cuối tuần', 'Combo tiết kiệm', 'Gói cao cấp', 'Ưu đãi thành viên', 'Quà tặng đặc biệt',
  'Trải nghiệm dành cho hai người', 'Gói gia đình', 'Ưu đãi giờ vàng', 'Combo bán chạy', 'Trải nghiệm mới'
]
const categoryKeywords: Record<string, string> = {
  'Mua sắm': 'shopping,lifestyle',
  'Giải trí': 'cinema,entertainment',
  'Du lịch & Khách sạn': 'travel,hotel',
  'Làm đẹp & Spa': 'spa,wellness',
  'Ăn uống': 'restaurant,food',
  'Buffet & Lẩu': 'buffet,hotpot',
  'Cà phê & Trà sữa': 'coffee,bubbletea'
}

async function main() {
  const partner = await prisma.partner.findFirst({
    where: { approvalStatus: 'APPROVED', operatingStatus: 'ACTIVE' },
    orderBy: { id: 'asc' }
  })
  if (!partner) throw new Error('Không tìm thấy đối tác đang hoạt động')

  const branches = []
  for (const region of regions) {
    const name = `VoucherHub ${region}`
    const branch = (await prisma.branch.findFirst({ where: { partnerId: partner.id, region } })) ??
      await prisma.branch.create({ data: { partnerId: partner.id, name, address: `Trung tâm ${region}`, region } })
    branches.push(branch)
  }

  let created = 0
  let updated = 0

  for (const [categoryIndex, [categoryName]] of Object.entries(categoryKeywords).entries()) {
    const category = await prisma.category.findFirstOrThrow({ where: { name: categoryName } })
    for (let index = 0; index < descriptors.length; index += 1) {
      const name = `${descriptors[index]} · ${category.name}`
      const imageUrl = `/assets/voucher-catalogue-sprite.png?cell=${categoryIndex * 10 + index}`
      const originalPrice = 180_000 + categoryIndex * 110_000 + index * 35_000
      const salePrice = Math.round(originalPrice * (0.55 + (index % 4) * 0.06) / 1000) * 1000
      const existing = await prisma.voucherProduct.findFirst({ where: { partnerId: partner.id, name } })
      const data = {
        categoryId: category.id,
        description: `${name}, áp dụng tại ${regions.join(', ')}. Số lượng có hạn.`,
        imageUrl,
        originalPrice,
        salePrice,
        saleStart: new Date(Date.now() - 5 * DAY),
        saleEnd: new Date(Date.now() + 120 * DAY),
        usageStart: new Date(Date.now() - DAY),
        usageEnd: new Date(Date.now() + 210 * DAY),
        totalQuantity: 500,
        remainingQuantity: 500,
        isMultiUse: false,
        status: VoucherStatus.ON_SALE
      }
      const voucher = existing
        ? await prisma.voucherProduct.update({ where: { id: existing.id }, data })
        : await prisma.voucherProduct.create({ data: { partnerId: partner.id, name, ...data } })
      if (existing) updated += 1
      else created += 1

      for (const branch of branches) {
        await prisma.voucherProductBranch.upsert({
          where: { voucherProductId_branchId: { voucherProductId: voucher.id, branchId: branch.id } },
          update: {},
          create: { voucherProductId: voucher.id, branchId: branch.id }
        })
      }
    }
  }

  console.log(JSON.stringify({ created, updated, totalVouchers: await prisma.voucherProduct.count() }))
}

main().catch((error) => { console.error(error); process.exitCode = 1 }).finally(() => prisma.$disconnect())
