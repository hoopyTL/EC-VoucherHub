import bcrypt from 'bcryptjs'
import { PrismaClient, VoucherStatus } from '@prisma/client'

const prisma = new PrismaClient()
const DAY = 86_400_000
const fromNow = (days: number) => new Date(Date.now() + days * DAY)

const partners = [
  {
    email: 'owner@lotusspa.vn', legalName: 'Lotus Wellness & Spa', taxCode: 'VH-DEMO-LOTUS-01',
    cover: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874',
    representative: 'Trần Minh Anh', branch: ['Lotus Spa Quận 1', '45 Nguyễn Huệ, Quận 1', 'TP. Hồ Chí Minh'],
    products: [
      ['Chăm sóc da chuyên sâu 90 phút', 'Làm đẹp & Spa', 890000, 499000],
      ['Massage đá nóng thư giãn', 'Làm đẹp & Spa', 750000, 449000],
      ['Gội đầu dưỡng sinh thảo mộc', 'Làm đẹp & Spa', 320000, 189000],
      ['Combo spa dành cho hai người', 'Làm đẹp & Spa', 1600000, 990000],
      ['Liệu trình phục hồi tóc Keratin', 'Làm đẹp & Spa', 1100000, 699000]
    ]
  },
  {
    email: 'owner@goldengate.vn', legalName: 'Golden Gate Restaurant Group', taxCode: 'VH-DEMO-GOLDEN-02',
    cover: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5',
    representative: 'Nguyễn Hoàng Nam', branch: ['Golden Gate Cầu Giấy', '17T5 Hoàng Đạo Thúy', 'Hà Nội'],
    products: [
      ['Buffet nướng Hàn Quốc cuối tuần', 'Buffet & Lẩu', 499000, 349000],
      ['Set lẩu Nhật Bản cho hai người', 'Buffet & Lẩu', 699000, 459000],
      ['Buffet hải sản cao cấp', 'Buffet & Lẩu', 899000, 599000],
      ['Combo cơm trưa doanh nhân', 'Ăn uống', 220000, 139000],
      ['Tiệc gia đình bốn người', 'Ăn uống', 1200000, 799000]
    ]
  },
  {
    email: 'owner@tripgo.vn', legalName: 'TripGo Việt Nam', taxCode: 'VH-DEMO-TRIPGO-03',
    cover: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e',
    representative: 'Lê Thu Trang', branch: ['TripGo Đà Nẵng', '36 Bạch Đằng, Hải Châu', 'Đà Nẵng'],
    products: [
      ['Nghỉ dưỡng biển Đà Nẵng 2N1Đ', 'Du lịch & Khách sạn', 3200000, 2190000],
      ['Tour Bà Nà Hills trọn ngày', 'Du lịch & Khách sạn', 1400000, 999000],
      ['Resort Hội An dành cho hai người', 'Du lịch & Khách sạn', 4500000, 2990000],
      ['Vé xe limousine Đà Nẵng - Huế', 'Du lịch & Khách sạn', 450000, 299000],
      ['Tour khám phá bán đảo Sơn Trà', 'Du lịch & Khách sạn', 800000, 499000]
    ]
  },
  {
    email: 'owner@starlight.vn', legalName: 'Starlight Entertainment', taxCode: 'VH-DEMO-STAR-04',
    cover: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba',
    representative: 'Phạm Quốc Huy', branch: ['Starlight Ninh Kiều', '6 Hòa Bình, Ninh Kiều', 'Cần Thơ'],
    products: [
      ['Cặp vé xem phim 2D cuối tuần', 'Giải trí', 220000, 149000],
      ['Combo phim và bắp nước cho hai người', 'Giải trí', 360000, 229000],
      ['Vé khu vui chơi trẻ em cả ngày', 'Giải trí', 280000, 169000],
      ['Trải nghiệm bowling 60 phút', 'Giải trí', 300000, 179000],
      ['Phòng karaoke gia đình hai giờ', 'Giải trí', 700000, 399000]
    ]
  },
  {
    email: 'owner@readmore.vn', legalName: 'ReadMore Lifestyle', taxCode: 'VH-DEMO-READ-05',
    cover: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d',
    representative: 'Võ Khánh Linh', branch: ['ReadMore Hải Phòng', '12 Trần Phú, Hồng Bàng', 'Hải Phòng'],
    products: [
      ['Voucher mua sách trị giá 300K', 'Mua sắm', 300000, 249000],
      ['Combo văn phòng phẩm sáng tạo', 'Mua sắm', 450000, 299000],
      ['Thẻ quà tặng lifestyle 500K', 'Mua sắm', 500000, 419000],
      ['Bộ sách kỹ năng bán chạy', 'Mua sắm', 650000, 399000],
      ['Voucher quà tặng sinh nhật', 'Mua sắm', 1000000, 849000]
    ]
  }
] as const

async function main() {
  const role = await prisma.role.findUnique({ where: { name: 'PARTNER' } })
  if (!role) throw new Error('Thiếu role PARTNER')
  const passwordHash = await bcrypt.hash('12345678', 10)
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
        data: { ownerUserId: user.id, legalName: seed.legalName, taxCode: seed.taxCode, representative: seed.representative, approvalStatus: 'APPROVED', operatingStatus: 'ACTIVE' }
      })
      createdPartners += 1
    }

    const [branchName, address, region] = seed.branch
    let branch = await prisma.branch.findFirst({ where: { partnerId: partner.id, name: branchName } })
    branch = branch
      ? await prisma.branch.update({ where: { id: branch.id }, data: { address, region } })
      : await prisma.branch.create({ data: { partnerId: partner.id, name: branchName, address, region } })

    for (const [name, categoryName, originalPrice, salePrice] of seed.products) {
      const exists = await prisma.voucherProduct.findFirst({ where: { partnerId: partner.id, name } })
      if (exists) {
        if (!exists.imageUrl) {
          await prisma.voucherProduct.update({ where: { id: exists.id }, data: { imageUrl: seed.cover } })
        }
        continue
      }
      const category =
        (await prisma.category.findFirst({ where: { name: categoryName, parentId: null } })) ??
        (await prisma.category.create({ data: { name: categoryName } }))
      await prisma.voucherProduct.create({
        data: {
          partnerId: partner.id, categoryId: category.id, name,
          imageUrl: seed.cover,
          description: `${name} tại ${seed.legalName}. Áp dụng theo điều kiện chương trình và số lượng có hạn.`,
          originalPrice, salePrice, saleStart: fromNow(-5), saleEnd: fromNow(90),
          usageStart: fromNow(-1), usageEnd: fromNow(180), totalQuantity: 300,
          remainingQuantity: 300, isMultiUse: false, status: VoucherStatus.ON_SALE,
          voucherProductBranches: { create: { branchId: branch.id } }
        }
      })
      createdVouchers += 1
    }
  }

  // Normalize the two original Highlands branch regions to the same city taxonomy.
  await prisma.branch.updateMany({ where: { name: { contains: 'Nhà Hát Lớn' } }, data: { region: 'Hà Nội' } })
  await prisma.branch.updateMany({ where: { name: { contains: 'Dinh Độc Lập' } }, data: { region: 'TP. Hồ Chí Minh' } })

  console.log(JSON.stringify({ createdPartners, createdVouchers, totalPartners: await prisma.partner.count(), totalVouchers: await prisma.voucherProduct.count() }))
}

main().catch((error) => { console.error(error); process.exitCode = 1 }).finally(() => prisma.$disconnect())
