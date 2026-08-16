import { PrismaClient } from '@prisma/client'
import { RoleName } from '@voucher/shared'
import { hashPassword } from '../src/utils/password'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seed...')

  // 1. Wipe the DB before seeding (delete children before parents to avoid FK errors)
  console.log('Cleaning up existing data...')
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

  // 2. Seed the Roles table (fixed roles — values must match the RoleName enum)
  console.log('Creating roles...')
  const adminRole = await prisma.role.create({ data: { name: RoleName.ADMIN } })
  const partnerRole = await prisma.role.create({ data: { name: RoleName.PARTNER } })
  const customerRole = await prisma.role.create({ data: { name: RoleName.CUSTOMER } })

  // 3. Seed the Categories table (product categories)
  console.log('Creating categories...')
  const foodCat = await prisma.category.create({ data: { name: 'Ăn uống' } })
  await prisma.category.create({ data: { name: 'Du lịch & Khách sạn' } })
  await prisma.category.create({ data: { name: 'Làm đẹp & Spa' } })

  // Seed sub-categories (self-reference)
  const cafeCat = await prisma.category.create({
    data: { name: 'Cà phê & Trà sữa', parentId: foodCat.id }
  })
  await prisma.category.create({
    data: { name: 'Buffet & Lẩu', parentId: foodCat.id }
  })

  // 4. Seed Users (sample accounts)
  console.log('Creating users...')
  const passwordHash = await hashPassword('12345678')

  // System admin account
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

  // Sample customer account
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

  // Partner owner account
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

  // 5. Seed Partners and their Branches
  console.log('Creating partner profiles & branches...')
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

  // 6. Seed VoucherProducts
  console.log('Creating sample voucher products...')
  await prisma.voucherProduct.create({
    data: {
      partnerId: highlandPartner.id,
      categoryId: cafeCat.id,
      name: 'Voucher Highlands Coffee giảm 50k toàn menu',
      description: 'Áp dụng cho mọi đồ uống tại các chi nhánh Highlands toàn quốc.',
      imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93',
      originalPrice: 50000.0,
      salePrice: 35000.0,
      saleStart: new Date(),
      saleEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      usageStart: new Date(),
      usageEnd: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      totalQuantity: 1000,
      remainingQuantity: 950,
      isMultiUse: false,
      status: 'ON_SALE'
    }
  })

  // 7. Seed an initial empty cart for the customer
  await prisma.cart.create({
    data: {
      customerId: customerUser.id
    }
  })

  console.log('Database seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
