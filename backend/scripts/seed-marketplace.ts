import bcrypt from 'bcryptjs'
import { PrismaClient, VoucherStatus } from '@prisma/client'
import { DEMO_PASSWORD, ROLE_ALIASES, SEED_CATEGORY_NAMES } from '../prisma/seed/constants'

const prisma = new PrismaClient()
const DAY = 86_400_000
const fromNow = (days: number) => new Date(Date.now() + days * DAY)

const partners = [
  {
    email: 'owner@lotusspa.vn',
    legalName: 'Lotus Wellness & Spa',
    taxCode: 'VH-DEMO-LOTUS-01',
    cover: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874',
    representative: 'Trần Minh Anh',
    branch: ['Lotus Spa Quận 1', '45 Nguyễn Huệ, Quận 1', 'TP. Hồ Chí Minh'],
    products: [
      ['Chăm sóc da chuyên sâu 90 phút', 'Spa & Làm đẹp', 890000, 499000],
      ['Massage đá nóng thư giãn', 'Massage Nam Nữ', 750000, 449000],
      ['Gội đầu dưỡng sinh thảo mộc', 'Spa & Làm đẹp', 320000, 189000],
      ['Combo spa dành cho hai người', 'Spa & Làm đẹp', 1600000, 990000],
      ['Liệu trình phục hồi tóc Keratin', 'Spa & Làm đẹp', 1100000, 699000]
    ]
  },
  {
    email: 'owner@goldengate.vn',
    legalName: 'Golden Gate Restaurant Group',
    taxCode: 'VH-DEMO-GOLDEN-02',
    cover: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5',
    representative: 'Nguyễn Hoàng Nam',
    branch: ['Golden Gate Cầu Giấy', '17T5 Hoàng Đạo Thúy', 'Hà Nội'],
    products: [
      ['Buffet nướng Hàn Quốc cuối tuần', 'Buffet', 499000, 349000],
      ['Set lẩu Nhật Bản cho hai người', 'Buffet', 699000, 459000],
      ['Buffet hải sản cao cấp', 'Buffet', 899000, 599000],
      ['Combo cơm trưa doanh nhân', 'Ẩm Thực', 220000, 139000],
      ['Tiệc gia đình bốn người', 'Ẩm Thực', 1200000, 799000]
    ]
  },
  {
    email: 'owner@tripgo.vn',
    legalName: 'TripGo Việt Nam',
    taxCode: 'VH-DEMO-TRIPGO-03',
    cover: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e',
    representative: 'Lê Thu Trang',
    branch: ['TripGo Đà Nẵng', '36 Bạch Đằng, Hải Châu', 'Đà Nẵng'],
    products: [
      ['Nghỉ dưỡng biển Đà Nẵng 2N1Đ', 'Hotel & Resort', 3200000, 2190000],
      ['Tour Bà Nà Hills trọn ngày', 'Tour du lịch', 1400000, 999000],
      ['Resort Hội An dành cho hai người', 'Hotel & Resort', 4500000, 2990000],
      ['Vé xe limousine Đà Nẵng - Huế', 'Tour du lịch', 450000, 299000],
      ['Tour khám phá bán đảo Sơn Trà', 'Tour du lịch', 800000, 499000]
    ]
  },
  {
    email: 'owner@starlight.vn',
    legalName: 'Starlight Entertainment',
    taxCode: 'VH-DEMO-STAR-04',
    cover: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba',
    representative: 'Phạm Quốc Huy',
    branch: ['Starlight Ninh Kiều', '6 Hòa Bình, Ninh Kiều', 'Cần Thơ'],
    products: [
      ['Cặp vé xem phim 2D cuối tuần', 'Giải Trí & Thể Thao', 220000, 149000],
      ['Combo phim và bắp nước cho hai người', 'Giải Trí & Thể Thao', 360000, 229000],
      ['Vé khu vui chơi trẻ em cả ngày', 'Giải Trí & Thể Thao', 280000, 169000],
      ['Trải nghiệm bowling 60 phút', 'Giải Trí & Thể Thao', 300000, 179000],
      ['Phòng karaoke gia đình hai giờ', 'Giải Trí & Thể Thao', 700000, 399000]
    ]
  },
  {
    email: 'owner@readmore.vn',
    legalName: 'ReadMore Lifestyle',
    taxCode: 'VH-DEMO-READ-05',
    cover: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d',
    representative: 'Võ Khánh Linh',
    branch: ['ReadMore Hải Phòng', '12 Trần Phú, Hồng Bàng', 'Hải Phòng'],
    products: []
  }
] as const

async function main() {
  const role = await prisma.role.findFirst({ where: { name: { in: [...ROLE_ALIASES.PARTNER] } } })
  if (!role) throw new Error('Thiếu role PARTNER')
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)
  let createdPartners = 0
  let createdVouchers = 0

  for (const seed of partners) {
    const user = await prisma.user.upsert({
      where: { email: seed.email },
      update: { fullName: seed.representative, status: 'ACTIVE', roleId: role.id },
      create: { email: seed.email, fullName: seed.representative, passwordHash, status: 'ACTIVE', roleId: role.id }
    })
    let partner = await prisma.partner.findUnique({ where: { taxCode: seed.taxCode } })
    if (!partner) {
      partner = await prisma.partner.create({
        data: {
          ownerUserId: user.id,
          legalName: seed.legalName,
          taxCode: seed.taxCode,
          representative: seed.representative,
          approvalStatus: 'APPROVED',
          operatingStatus: 'ACTIVE'
        }
      })
      createdPartners += 1
    }

    const [branchName, address, region] = seed.branch
    let branch = await prisma.branch.findFirst({ where: { partnerId: partner.id, name: branchName } })
    branch = branch
      ? await prisma.branch.update({ where: { id: branch.id }, data: { address, region } })
      : await prisma.branch.create({ data: { partnerId: partner.id, name: branchName, address, region } })

    for (const [name, categoryName, originalPrice, salePrice] of seed.products) {
      if (!SEED_CATEGORY_NAMES.includes(categoryName)) {
        throw new Error(`Danh mục seed không hợp lệ: ${categoryName}`)
      }
      const exists = await prisma.voucherProduct.findFirst({ where: { partnerId: partner.id, name } })
      if (exists) {
        if (!exists.imageUrl) {
          await prisma.voucherProduct.update({ where: { id: exists.id }, data: { imageUrl: seed.cover } })
        }
        continue
      }
      const category = await prisma.category.findFirstOrThrow({ where: { name: categoryName } })
      await prisma.voucherProduct.create({
        data: {
          partnerId: partner.id,
          categoryId: category.id,
          name,
          imageUrl: seed.cover,
          description: `${name} tại ${seed.legalName}. Áp dụng theo điều kiện chương trình và số lượng có hạn.`,
          originalPrice,
          salePrice,
          saleStart: fromNow(-5),
          saleEnd: fromNow(90),
          usageStart: fromNow(-1),
          usageEnd: fromNow(180),
          totalQuantity: 300,
          remainingQuantity: 300,
          isMultiUse: false,
          status: VoucherStatus.ON_SALE,
          voucherProductBranches: { create: { branchId: branch.id } }
        }
      })
      createdVouchers += 1
    }
  }

  // Normalize the two original Highlands branch regions to the same city taxonomy.
  await prisma.branch.updateMany({ where: { name: { contains: 'Nhà Hát Lớn' } }, data: { region: 'Hà Nội' } })
  await prisma.branch.updateMany({ where: { name: { contains: 'Dinh Độc Lập' } }, data: { region: 'TP. Hồ Chí Minh' } })

  console.log(
    JSON.stringify({
      createdPartners,
      createdVouchers,
      totalPartners: await prisma.partner.count(),
      totalVouchers: await prisma.voucherProduct.count()
    })
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
