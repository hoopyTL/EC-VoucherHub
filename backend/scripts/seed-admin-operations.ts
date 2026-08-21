import { ApprovalStatus, OrderStatus, PrismaClient, VoucherStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const businesses = [
  ['Nhà hàng Biển Xanh', 'Nguyễn Hải Nam', 'adminops01@voucherhub.vn', '0319001001'],
  ['Mộc An Wellness', 'Trần Thu Hương', 'adminops02@voucherhub.vn', '0319001002'],
  ['Rạp phim Galaxy Việt', 'Lê Minh Quân', 'adminops03@voucherhub.vn', '0319001003'],
  ['Du lịch Mây Trắng', 'Phạm Gia Hân', 'adminops04@voucherhub.vn', '0319001004'],
  ['Bếp Nhà Sài Gòn', 'Võ Hoàng Anh', 'adminops05@voucherhub.vn', '0319001005'],
  ['FitLife Việt Nam', 'Đặng Thanh Tùng', 'adminops06@voucherhub.vn', '0319001006'],
  ['Lumière Beauty', 'Bùi Ngọc Mai', 'adminops07@voucherhub.vn', '0319001007'],
  ['Green Mart', 'Ngô Quốc Bảo', 'adminops08@voucherhub.vn', '0319001008'],
  ['Học viện NextSkill', 'Đỗ Khánh Linh', 'adminops09@voucherhub.vn', '0319001009'],
  ['The Coffee Garden', 'Phan Đức Long', 'adminops10@voucherhub.vn', '0319001010'],
  ['Kids Planet', 'Trương Mỹ Duyên', 'adminops11@voucherhub.vn', '0319001011'],
  ['Nội thất An Cư', 'Huỳnh Tuấn Kiệt', 'adminops12@voucherhub.vn', '0319001012']
] as const

const voucherNames = [
  'Buffet hải sản tối dành cho hai người', 'Liệu trình massage thư giãn 90 phút',
  'Combo vé phim và bắp nước cuối tuần', 'Tour nghỉ dưỡng biển 3 ngày 2 đêm',
  'Set lẩu gia đình bốn người', 'Gói tập gym và yoga một tháng',
  'Chăm sóc da chuyên sâu chuẩn Hàn', 'Phiếu mua sắm hàng tiêu dùng 500K',
  'Khóa học kỹ năng số thực chiến', 'Combo cà phê rang xay và bánh ngọt',
  'Vé khu vui chơi trọn ngày cho bé', 'Voucher nội thất cho căn hộ mới',
  'Brunch cuối tuần phong cách Địa Trung Hải', 'Gói nghỉ dưỡng chăm sóc sức khỏe',
  'Vé xem phim IMAX dành cho hai người', 'Tour khám phá miền Tây một ngày',
  'Tiệc sinh nhật tại nhà hàng', 'Gói huấn luyện cá nhân 10 buổi',
  'Trang điểm dự tiệc cao cấp', 'Giỏ quà thực phẩm hữu cơ',
  'Khóa tiếng Anh giao tiếp 12 buổi', 'Thẻ đồ uống mùa hè 10 món',
  'Workshop sáng tạo cuối tuần cho bé', 'Gói thiết kế góc làm việc tại nhà'
] as const

async function main() {
  const partnerRole = await prisma.role.findFirst({ where: { name: { in: ['PARTNER', 'DOI_TAC'] } } })
  const customerRole = await prisma.role.findFirst({ where: { name: { in: ['CUSTOMER', 'KHACH_HANG'] } } })
  const categories = await prisma.category.findMany({ orderBy: { id: 'asc' } })
  const customers = await prisma.user.findMany({ where: { roleId: customerRole?.id }, take: 12 })
  const approvedVouchers = await prisma.voucherProduct.findMany({ where: { status: VoucherStatus.ON_SALE }, take: 36 })
  if (!partnerRole || !customerRole || !categories.length || !customers.length || !approvedVouchers.length) {
    throw new Error('Cần role, category, khách hàng và voucher đang bán trước khi seed dữ liệu vận hành.')
  }

  const passwordHash = await bcrypt.hash('12345678', 10)
  const pendingPartners = []
  for (let index = 0; index < businesses.length; index += 1) {
    const [legalName, representative, email, taxCode] = businesses[index]
    const owner = await prisma.user.upsert({
      where: { email },
      update: { fullName: representative, roleId: partnerRole.id, status: 'ACTIVE' },
      create: { email, passwordHash, roleId: partnerRole.id, fullName: representative, phone: `0908${String(410000 + index).slice(-6)}`, address: `${20 + index} Nguyễn Văn Linh, TP. Hồ Chí Minh` }
    })
    const partner = await prisma.partner.upsert({
      where: { taxCode },
      update: { legalName, representative, approvalStatus: ApprovalStatus.PENDING, rejectReason: null },
      create: { ownerUserId: owner.id, legalName, representative, taxCode, approvalStatus: ApprovalStatus.PENDING }
    })
    pendingPartners.push(partner)
    const branchCount = await prisma.branch.count({ where: { partnerId: partner.id } })
    if (!branchCount) {
      await prisma.branch.createMany({ data: [
        { partnerId: partner.id, name: `${legalName} - Chi nhánh trung tâm`, address: `${40 + index} Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh`, region: 'TP. Hồ Chí Minh' },
        { partnerId: partner.id, name: `${legalName} - Chi nhánh phía Đông`, address: `${90 + index} Võ Nguyên Giáp, TP. Thủ Đức`, region: 'TP. Hồ Chí Minh' }
      ] })
    }
  }

  const approvedPartners = await prisma.partner.findMany({ where: { approvalStatus: ApprovalStatus.APPROVED }, include: { branches: true }, take: 12 })
  const now = new Date()
  for (let index = 0; index < voucherNames.length; index += 1) {
    const partner = approvedPartners[index % approvedPartners.length]
    const marker = `[ADMIN-DEMO-${String(index + 1).padStart(2, '0')}]`
    const existing = await prisma.voucherProduct.findFirst({ where: { description: { startsWith: marker } } })
    const saleStart = new Date(now); saleStart.setDate(saleStart.getDate() + 2)
    const saleEnd = new Date(now); saleEnd.setDate(saleEnd.getDate() + 75)
    const usageEnd = new Date(now); usageEnd.setDate(usageEnd.getDate() + 120)
    const originalPrice = 180000 + (index % 8) * 90000
    const salePrice = Math.round(originalPrice * (0.55 + (index % 4) * 0.06))
    const voucher = existing ?? await prisma.voucherProduct.create({
      data: {
        partnerId: partner.id, categoryId: categories[index % categories.length].id,
        name: voucherNames[index], description: `${marker} Ưu đãi mới đang chờ đội ngũ VoucherHub kiểm duyệt nội dung, điều kiện và thời hạn sử dụng.`,
        imageUrl: `https://images.unsplash.com/photo-${['1504674900247-0877df9cc836','1544161515-4ab6ce6db874','1489599849927-2ee91cede3ba','1507525428034-b723cf961d3e','1552566626-52f8b828add9','1534438327276-14e5300c3a48'][index % 6]}?auto=format&fit=crop&w=900&q=80`,
        originalPrice, salePrice, saleStart, saleEnd, usageStart: saleStart, usageEnd,
        totalQuantity: 300 + index * 20, remainingQuantity: 300 + index * 20,
        status: VoucherStatus.PENDING_REVIEW,
        voucherProductBranches: partner.branches.length ? { create: partner.branches.slice(0, 2).map((branch) => ({ branchId: branch.id })) } : undefined
      }
    })
    if (existing && voucher.status !== VoucherStatus.PENDING_REVIEW) {
      await prisma.voucherProduct.update({ where: { id: voucher.id }, data: { status: VoucherStatus.PENDING_REVIEW, rejectReason: null } })
    }
  }

  const existingOrder = await prisma.order.findFirst({ where: { giftRecipient: { path: ['adminOperationsDemo'], equals: true } } })
  if (!existingOrder) {
    for (let index = 0; index < 84; index += 1) {
      const voucher = approvedVouchers[index % approvedVouchers.length]
      const customer = customers[index % customers.length]
      const quantity = 1 + (index % 3)
      const createdAt = new Date(now); createdAt.setDate(createdAt.getDate() - index * 2); createdAt.setHours(8 + index % 12, index % 60)
      const status = index % 10 === 0 ? OrderStatus.CANCELLED : index % 13 === 0 ? OrderStatus.REFUNDED : index % 7 === 0 ? OrderStatus.PENDING_PAYMENT : OrderStatus.PAID
      await prisma.order.create({
        data: {
          customerId: customer.id, totalAmount: Number(voucher.salePrice) * quantity,
          paymentMethod: index % 3 === 0 ? 'STRIPE' : 'VNPAY', status,
          paidAt: status === OrderStatus.PAID || status === OrderStatus.REFUNDED ? createdAt : null,
          createdAt, giftRecipient: { adminOperationsDemo: true, reference: `VH-OPS-${String(index + 1).padStart(4, '0')}` },
          orderItems: { create: { voucherProductId: voucher.id, quantity, unitPrice: voucher.salePrice } }
        }
      })
    }
  }

  console.log(`Đã sẵn sàng: ${pendingPartners.length} đối tác chờ duyệt, ${voucherNames.length} voucher chờ duyệt và 84 đơn vận hành.`)
}

main().finally(() => prisma.$disconnect())
