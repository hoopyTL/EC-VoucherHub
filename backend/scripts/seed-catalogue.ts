import { PrismaClient, VoucherStatus } from '@prisma/client'

const prisma = new PrismaClient()

const DAY = 24 * 60 * 60 * 1000
const fromNow = (days: number) => new Date(Date.now() + days * DAY)

const catalogue = [
  {
    name: 'Combo cà phê sáng Highlands',
    description: 'Combo cà phê và bánh ngọt cho buổi sáng năng động.',
    category: 'Ẩm Thực',
    originalPrice: 89000,
    salePrice: 59000,
    imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085'
  },
  {
    name: 'Trà sen vàng size lớn',
    description: 'Một ly trà sen vàng size lớn tại hệ thống cửa hàng áp dụng.',
    category: 'Ẩm Thực',
    originalPrice: 65000,
    salePrice: 45000,
    imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc'
  },
  {
    name: 'Buffet tối ưu đãi 30%',
    description: 'Thưởng thức buffet tối từ thứ Hai đến thứ Sáu với mức giá ưu đãi.',
    category: 'Buffet',
    originalPrice: 399000,
    salePrice: 279000,
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5'
  },
  {
    name: 'Set lẩu dành cho hai người',
    description: 'Set lẩu đầy đủ dành cho hai người, áp dụng tại chi nhánh tham gia.',
    category: 'Buffet',
    originalPrice: 499000,
    salePrice: 349000,
    imageUrl: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec'
  },
  {
    name: 'Bữa trưa văn phòng tiết kiệm',
    description: 'Một phần ăn trưa và nước uống cho ngày làm việc hiệu quả.',
    category: 'Ẩm Thực',
    originalPrice: 120000,
    salePrice: 79000,
    imageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554'
  },
  {
    name: 'Liệu trình chăm sóc da cơ bản',
    description: 'Làm sạch sâu và chăm sóc da trong 60 phút.',
    category: 'Spa & Làm đẹp',
    originalPrice: 550000,
    salePrice: 329000,
    imageUrl: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881'
  },
  {
    name: 'Massage thư giãn 90 phút',
    description: 'Liệu trình massage toàn thân giúp phục hồi năng lượng.',
    category: 'Massage Nam Nữ',
    originalPrice: 650000,
    salePrice: 420000,
    imageUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874'
  },
  {
    name: 'Kỳ nghỉ cuối tuần dành cho hai người',
    description: 'Một đêm nghỉ dưỡng kèm bữa sáng dành cho hai khách.',
    category: 'Hotel & Resort',
    originalPrice: 1800000,
    salePrice: 1290000,
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945'
  }
] as const

async function main() {
  const partner = await prisma.partner.findFirst({
    where: { approvalStatus: 'APPROVED', operatingStatus: 'ACTIVE' },
    include: { branches: true }
  })
  if (!partner) throw new Error('Cần ít nhất một đối tác APPROVED và ACTIVE để bổ sung catalogue')

  let created = 0
  for (const item of catalogue) {
    const exists = await prisma.voucherProduct.findFirst({ where: { partnerId: partner.id, name: item.name } })
    const category = await prisma.category.findFirst({ where: { name: item.category } })
    if (exists) {
      if (!exists.categoryId && category) {
        await prisma.voucherProduct.update({ where: { id: exists.id }, data: { categoryId: category.id } })
      }
      continue
    }

    await prisma.voucherProduct.create({
      data: {
        partnerId: partner.id,
        categoryId: category?.id,
        name: item.name,
        description: item.description,
        imageUrl: item.imageUrl,
        originalPrice: item.originalPrice,
        salePrice: item.salePrice,
        saleStart: fromNow(-7),
        saleEnd: fromNow(60),
        usageStart: fromNow(-1),
        usageEnd: fromNow(120),
        totalQuantity: 200,
        remainingQuantity: 200,
        isMultiUse: false,
        status: VoucherStatus.ON_SALE,
        voucherProductBranches: partner.branches.length
          ? { create: partner.branches.map((branch) => ({ branchId: branch.id })) }
          : undefined
      }
    })
    created += 1
  }

  const total = await prisma.voucherProduct.count({ where: { status: VoucherStatus.ON_SALE } })
  console.log(`Đã bổ sung ${created} voucher; hiện có ${total} voucher đang bán.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
