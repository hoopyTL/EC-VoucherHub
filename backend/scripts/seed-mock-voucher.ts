import 'dotenv/config'
import { PrismaClient, VoucherStatus, UserStatus, ApprovalStatus, OperatingStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding mock vouchers for TASK-008 Search testing...')

  // 1. Ensure Roles
  const rolePartner = await prisma.role.upsert({
    where: { name: 'DOI_TAC' },
    update: {},
    create: { name: 'DOI_TAC' },
  })

  // 2. Ensure a Partner User
  const owner = await prisma.user.upsert({
    where: { email: 'partner_seed@example.com' },
    update: {},
    create: {
      email: 'partner_seed@example.com',
      passwordHash: 'dummy_hash',
      fullName: 'Mock Partner Owner',
      roleId: rolePartner.id,
      status: UserStatus.ACTIVE,
    },
  })

  // 3. Ensure a Partner profile
  const partner = await prisma.partner.upsert({
    where: { ownerUserId: owner.id },
    update: {},
    create: {
      ownerUserId: owner.id,
      legalName: 'Mock Partner JSC',
      taxCode: 'MOCK-123456789',
      representative: 'John Doe',
      approvalStatus: ApprovalStatus.APPROVED,
      operatingStatus: OperatingStatus.ACTIVE,
    },
  })

  // 3.5 Ensure Categories
  const categories = ['Food & Beverage', 'Spa & Beauty', 'Entertainment', 'Travel', 'Shopping', 'Education']
  const categoryMap = new Map<string, number>()
  for (const catName of categories) {
    let cat = await prisma.category.findFirst({
      where: { name: catName }
    })
    if (!cat) {
      cat = await prisma.category.create({
        data: { name: catName }
      })
    }
    categoryMap.set(catName, cat.id)
  }

  // 4. Create Mock Vouchers
  const mockVouchers = [
    {
      name: 'Voucher Buffet Hải Sản Giảm 50%',
      description: 'Thưởng thức buffet hải sản tôm hùm, cua hoàng đế tại nhà hàng 5 sao.',
      originalPrice: 1000000,
      salePrice: 500000,
      status: VoucherStatus.ON_SALE,
      totalQuantity: 100,
      remainingQuantity: 100,
      categoryName: 'Food & Beverage'
    },
    {
      name: 'Voucher Xem Phim CGV Cuối Tuần',
      description: 'Áp dụng cho mọi cụm rạp CGV trên toàn quốc vào thứ 7 và Chủ nhật.',
      originalPrice: 150000,
      salePrice: 90000,
      status: VoucherStatus.ON_SALE,
      totalQuantity: 500,
      remainingQuantity: 500,
      categoryName: 'Entertainment'
    },
    {
      name: 'Voucher Gym California 1 Tháng',
      description: 'Tập gym không giới hạn tại bất kỳ chi nhánh nào của California Fitness.',
      originalPrice: 2000000,
      salePrice: 500000,
      status: VoucherStatus.ON_SALE,
      totalQuantity: 50,
      remainingQuantity: 0, // Hết hàng
      categoryName: 'Spa & Beauty'
    },
    {
      name: 'Voucher Spa Chăm Sóc Da Chuyên Sâu',
      description: 'Liệu trình chăm sóc da mụn và lão hóa với công nghệ Hàn Quốc.',
      originalPrice: 800000,
      salePrice: 350000,
      status: VoucherStatus.DRAFT, // Chưa bán, sẽ không ra trong kết quả search
      totalQuantity: 200,
      remainingQuantity: 200,
      categoryName: 'Spa & Beauty'
    },
    {
      name: 'Buffet Lẩu Nướng Gogi House',
      description: 'Ăn lẩu nướng thả ga chuẩn vị Hàn Quốc.',
      originalPrice: 400000,
      salePrice: 299000,
      status: VoucherStatus.ON_SALE,
      totalQuantity: 1000,
      remainingQuantity: 950,
      categoryName: 'Food & Beverage'
    }
  ]

  let createdCount = 0
  for (const v of mockVouchers) {
    const exists = await prisma.voucherProduct.findFirst({
      where: { name: v.name, partnerId: partner.id },
    })

    if (!exists) {
      await prisma.voucherProduct.create({
        data: {
          partnerId: partner.id,
          categoryId: categoryMap.get(v.categoryName),
          name: v.name,
          description: v.description,
          originalPrice: v.originalPrice,
          salePrice: v.salePrice,
          saleStart: new Date(),
          saleEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
          usageStart: new Date(),
          usageEnd: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // +60 days
          totalQuantity: v.totalQuantity,
          remainingQuantity: v.remainingQuantity,
          isMultiUse: false,
          status: v.status,
        },
      })
      createdCount++
    } else {
      // Update category if missing
      if (!exists.categoryId) {
        await prisma.voucherProduct.update({
          where: { id: exists.id },
          data: { categoryId: categoryMap.get(v.categoryName) }
        })
      }
    }
  }

  console.log(`✅ Seeded ${createdCount} mock vouchers successfully!`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
