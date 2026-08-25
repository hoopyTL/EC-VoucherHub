import { createHash } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/utils/password'

const prisma = new PrismaClient()

const reviewerNames = [
  'Mai Anh',
  'Hoàng Nam',
  'Khánh Linh',
  'Minh Khoa',
  'Thảo Vy',
  'Quốc Bảo',
  'Ngọc Hân',
  'Gia Huy',
  'Phương Anh',
  'Tuấn Minh',
  'Bảo Ngọc',
  'Thanh Tâm',
  'Đức Anh',
  'Hải Yến',
  'Mỹ Duyên',
  'Nhật Nam',
  'Kim Chi',
  'Hoàng Long',
  'Tú Anh',
  'Trung Kiên',
  'Thanh Hà',
  'Yến Nhi',
  'Đăng Khoa',
  'Lan Phương',
  'Vân Anh'
] as const

const comments = [
  'Ưu đãi đúng mô tả, thao tác mua nhanh và sử dụng rất thuận tiện.',
  'Voucher có giá tốt, nhân viên hỗ trợ nhiệt tình. Mình sẽ tiếp tục sử dụng.',
  'Trải nghiệm ổn định, mã được xác nhận nhanh và không phát sinh chi phí khác.',
  'Hình ảnh và thông tin rõ ràng, quy trình thanh toán dễ hiểu.',
  'Dịch vụ phù hợp với mức giá, ưu đãi thiết thực và dễ áp dụng.',
  'Nhận voucher nhanh, thông tin sử dụng rõ ràng và dễ kiểm tra.',
  'Giá tốt hơn mua trực tiếp, mình đã dùng đúng tại chi nhánh.',
  'Đặt cho gia đình rất tiện, nhân viên hỗ trợ nhiệt tình.',
  'Mã voucher hiển thị rõ, thanh toán và nhận mã diễn ra nhanh.',
  'Ưu đãi đúng như mô tả, trải nghiệm ổn và đáng tiền.',
  'Địa điểm áp dụng đa dạng, dễ tìm trên bản đồ.',
  'Mình sẽ quay lại mua thêm khi có chương trình mới.',
  'Chất lượng tốt trong tầm giá, không có phụ phí bất ngờ.',
  'Giao diện dễ dùng, chỉ vài bước là hoàn tất đơn.',
  'Voucher phù hợp cho dịp cuối tuần, trải nghiệm rất vui.',
  'Thông tin hạn sử dụng được ghi rõ nên dễ sắp xếp lịch.',
  'Dịch vụ nhanh, mã được xác nhận ngay tại quầy.',
  'Mua làm quà cũng tiện, người nhận dùng được ngay.',
  'Đã kiểm tra điều kiện trước khi mua, mọi thứ đúng như cam kết.',
  'Hình ảnh đẹp và mô tả chi tiết, không bị hụt kỳ vọng.',
  'Nhân viên tại điểm dùng thân thiện, hỗ trợ tốt.',
  'Tỷ lệ giảm hợp lý, rất đáng thử cho lần đầu.',
  'Thanh toán an toàn, nhận thông báo đơn hàng đầy đủ.',
  'Mình hài lòng với chất lượng và tốc độ phục vụ.',
  'Dùng voucher đơn giản, không phải chờ lâu.',
  'Đã giới thiệu cho bạn bè vì ưu đãi thực tế.',
  'Sản phẩm đúng nhu cầu, sẽ tiếp tục theo dõi ưu đãi.',
  'Có nhiều chi nhánh nên thuận tiện di chuyển.',
  'Trải nghiệm tổng thể tốt, đánh giá cao cách trình bày thông tin.'
] as const

function stableUuid(value: string) {
  const hex = createHash('sha256').update(value).digest('hex').slice(0, 32).split('')
  hex[12] = '4'
  hex[16] = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16)
  const id = hex.join('')
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`
}

async function main() {
  const customerRole = await prisma.role.findUniqueOrThrow({ where: { name: 'CUSTOMER' } })
  const passwordHash = await hashPassword('12345678')
  const users = []
  const reviewers = reviewerNames.map(
    (fullName, index) => [`reviewer.${String(index + 1).padStart(2, '0')}@voucherhub.demo`, fullName] as const
  )

  for (const [index, [email, fullName]] of reviewers.entries()) {
    users.push(
      await prisma.user.upsert({
        where: { email },
        update: { fullName, status: 'ACTIVE' },
        create: {
          email,
          fullName,
          phone: `0927000${String(index + 1).padStart(3, '0')}`,
          passwordHash,
          roleId: customerRole.id,
          status: 'ACTIVE'
        }
      })
    )
  }

  const vouchers = await prisma.voucherProduct.findMany({
    select: { id: true, salePrice: true },
    orderBy: { id: 'asc' }
  })

  for (const [voucherIndex, voucher] of vouchers.entries()) {
    for (const [reviewerIndex, customer] of users.entries()) {
      const orderId = stableUuid(`review-order:${voucher.id}:${customer.id}`)
      const createdAt = new Date(Date.UTC(2026, 6, 1 + ((voucherIndex + reviewerIndex) % 50)))
      await prisma.order.upsert({
        where: { id: orderId },
        update: {},
        create: {
          id: orderId,
          customerId: customer.id,
          totalAmount: voucher.salePrice,
          paymentMethod: 'DEMO_REVIEW',
          status: 'PAID',
          paidAt: createdAt,
          createdAt,
          orderItems: {
            create: { voucherProductId: voucher.id, quantity: 1, unitPrice: voucher.salePrice }
          }
        }
      })

      const rating = 4 + ((voucherIndex + reviewerIndex) % 3 === 0 ? 0 : 1)
      await prisma.review.upsert({
        where: { customerId_voucherProductId: { customerId: customer.id, voucherProductId: voucher.id } },
        update: {},
        create: {
          customerId: customer.id,
          voucherProductId: voucher.id,
          orderId,
          rating,
          comment: comments[(voucherIndex + reviewerIndex) % comments.length],
          createdAt
        }
      })
    }
  }

  const total = await prisma.review.count()
  console.log(`Đã bảo đảm ${vouchers.length} voucher đều có dữ liệu đánh giá. Tổng đánh giá: ${total}.`)
}

main()
  .catch((error) => {
    console.error('Không thể tạo dữ liệu đánh giá:', error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
