import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Đang bắt đầu seed dữ liệu mẫu...')

  // 1. Dọn dẹp sạch DB trước khi seed (Dọn ngược từ bảng con lên bảng cha để tránh lỗi Khóa ngoại)
  console.log('Đang dọn dẹp dữ liệu cũ...')
  await prisma.usageLog.deleteMany()
  await prisma.issuedVoucherCode.deleteMany()
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.cartItem.deleteMany()
  await prisma.cart.deleteMany()
  await prisma.voucherProductBranch.deleteMany()
  await prisma.voucherProduct.deleteMany()
  await prisma.branch.deleteMany()
  await prisma.partner.deleteMany()
  await prisma.user.deleteMany()
  await prisma.category.deleteMany()
  await prisma.role.deleteMany()

  // 2. Seed bảng Roles (Vai trò cố định)
  console.log('Tạo vai trò (Roles)...')
  const adminRole = await prisma.role.create({ data: { name: 'QUAN_TRI_VIEN' } })
  const partnerRole = await prisma.role.create({ data: { name: 'DOI_TAC' } })
  const customerRole = await prisma.role.create({ data: { name: 'KHACH_HANG' } })

  // 3. Seed bảng Categories (Danh mục sản phẩm)
  console.log('Tạo danh mục (Categories)...')
  const foodCat = await prisma.category.create({ data: { name: 'Ăn uống' } })
  const travelCat = await prisma.category.create({ data: { name: 'Du lịch & Khách sạn' } })
  const beautyCat = await prisma.category.create({ data: { name: 'Làm đẹp & Spa' } })

  // Seed danh mục con (Self-reference)
  const cafeCat = await prisma.category.create({
    data: { name: 'Cà phê & Trà sữa', parentId: foodCat.id }
  })
  const buffetCat = await prisma.category.create({
    data: { name: 'Buffet & Lẩu', parentId: foodCat.id }
  })

  // 4. Seed dữ liệu Users (Tài khoản mẫu)
  console.log('Tạo tài khoản người dùng (Users)...')
  // Password hash mẫu cho '12345678'
  const passwordHash = '$2b$10$EPVma1Sp2.3m/zJ1S.3oGe7rM4zK18/O5n7qg.ZqF68e1QvYpMyea'

  // Tài khoản Admin hệ thống
  await prisma.user.create({
    data: {
      email: 'admin@voucherhub.com',
      phone: '0901234567',
      passwordHash,
      roleId: adminRole.id,
      fullName: 'Hệ thống Quản trị viên',
      status: 'ACTIVE'
    }
  })

  // Tài khoản Khách hàng mẫu
  const customerUser = await prisma.user.create({
    data: {
      email: 'customer@gmail.com',
      phone: '0908888888',
      passwordHash,
      roleId: customerRole.id,
      fullName: 'Nguyễn Văn Khách',
      status: 'ACTIVE'
    }
  })

  // Tài khoản Chủ doanh nghiệp đối tác (Partner Owner)
  const partnerUser = await prisma.user.create({
    data: {
      email: 'owner@highlandscoffee.com.vn',
      phone: '0909999999',
      passwordHash,
      roleId: partnerRole.id,
      fullName: 'Đại diện Highlands Coffee',
      status: 'ACTIVE'
    }
  })

  // 5. Seed thông tin Đối tác (Partners) và Chi nhánh (Branches)
  console.log('Tạo hồ sơ đối tác & chi nhánh...')
  const highlandPartner = await prisma.partner.create({
    data: {
      ownerUserId: partnerUser.id,
      legalName: 'CÔNG TY CỔ PHẦN DỊCH VỤ CÀ PHÊ CAO NGUYÊN',
      taxCode: '0302869720',
      representative: 'Nguyễn Hải Highlands',
      approvalStatus: 'APPROVED',
      operatingStatus: 'ACTIVE'
    }
  })

  await prisma.branch.create({
    data: {
      partnerId: highlandPartner.id,
      name: 'Highlands Coffee Nhà Hát Lớn',
      address: 'Số 1 Tràng Tiền, Hoàn Kiếm, Hà Nội',
      region: 'Miền Bắc'
    }
  })

  await prisma.branch.create({
    data: {
      partnerId: highlandPartner.id,
      name: 'Highlands Coffee Dinh Độc Lập',
      address: '135 Nam Kỳ Khởi Nghĩa, Quận 1, TP. Hồ Chí Minh',
      region: 'Miền Nam'
    }
  })

  // 6. Seed Sản phẩm Voucher (VoucherProducts)
  console.log('Tạo sản phẩm voucher mẫu...')
  await prisma.voucherProduct.create({
    data: {
      partnerId: highlandPartner.id,
      categoryId: cafeCat.id,
      name: 'Voucher Highlands Coffee giảm 50k toàn menu',
      description: 'Áp dụng cho mọi đồ uống tại các chi nhánh Highlands toàn quốc.',
      imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93',
      originalPrice: 50000.00,
      salePrice: 35000.00,
      saleStart: new Date(),
      saleEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 ngày
      usageStart: new Date(),
      usageEnd: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 ngày
      totalQuantity: 1000,
      remainingQuantity: 950,
      isMultiUse: false,
      status: 'ON_SALE'
    }
  })

  // 7. Seed giỏ hàng trống ban đầu cho Khách hàng
  await prisma.cart.create({
    data: {
      customerId: customerUser.id
    }
  })

  console.log('Đã nạp seed dữ liệu mẫu thành công!')
}

main()
  .catch((e) => {
    console.error('Lỗi khi seed dữ liệu:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
