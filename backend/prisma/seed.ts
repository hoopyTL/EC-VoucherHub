import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/utils/password'
import { DEMO_PASSWORD, SEED_CATEGORIES, SEED_ROLES } from './seed/constants'

const prisma = new PrismaClient()

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
}

async function resetDatabase() {
  await prisma.review.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.contentItem.deleteMany()
  await prisma.usageLog.deleteMany()
  await prisma.partnerStaffBranch.deleteMany()
  await prisma.partnerStaff.deleteMany()
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
}

async function main() {
  console.log('Seeding VoucherHub demo data...')
  await resetDatabase()
  const passwordHash = await hashPassword(DEMO_PASSWORD)

  const adminRole = await prisma.role.upsert({
    where: { name: SEED_ROLES.ADMIN },
    update: {},
    create: { name: SEED_ROLES.ADMIN }
  })
  const partnerRole = await prisma.role.upsert({
    where: { name: SEED_ROLES.PARTNER },
    update: {},
    create: { name: SEED_ROLES.PARTNER }
  })
  const customerRole = await prisma.role.upsert({
    where: { name: SEED_ROLES.CUSTOMER },
    update: {},
    create: { name: SEED_ROLES.CUSTOMER }
  })
  const staffRole = await prisma.role.upsert({
    where: { name: SEED_ROLES.STAFF },
    update: {},
    create: { name: SEED_ROLES.STAFF }
  })

  const foodCat = await prisma.category.create({ data: { name: SEED_CATEGORIES.FOOD } })
  const travelCat = await prisma.category.create({ data: { name: SEED_CATEGORIES.TRAVEL } })
  const beautyCat = await prisma.category.create({ data: { name: SEED_CATEGORIES.BEAUTY } })
  const cafeCat = await prisma.category.create({ data: { name: SEED_CATEGORIES.CAFE, parentId: foodCat.id } })
  const buffetCat = await prisma.category.create({ data: { name: SEED_CATEGORIES.BUFFET, parentId: foodCat.id } })
  await prisma.category.create({ data: { name: SEED_CATEGORIES.SHOPPING } })
  await prisma.category.create({ data: { name: SEED_CATEGORIES.ENTERTAINMENT } })

  const admin = await prisma.user.create({
    data: {
      email: 'admin@voucherhub.com',
      phone: '0901000000',
      passwordHash,
      roleId: adminRole.id,
      fullName: 'VoucherHub Admin',
      status: 'ACTIVE'
    }
  })

  const customerA = await prisma.user.create({
    data: {
      email: 'customer@voucherhub.com',
      phone: '0902000000',
      passwordHash,
      roleId: customerRole.id,
      fullName: 'Nguyen Minh Khach',
      status: 'ACTIVE'
    }
  })

  const customerB = await prisma.user.create({
    data: {
      email: 'linh.customer@voucherhub.com',
      phone: '0902000001',
      passwordHash,
      roleId: customerRole.id,
      fullName: 'Tran Hoang Linh',
      status: 'ACTIVE'
    }
  })

  const highlandsOwner = await prisma.user.create({
    data: {
      email: 'owner@highlands.example',
      phone: '0903000000',
      passwordHash,
      roleId: partnerRole.id,
      fullName: 'Highlands Owner',
      status: 'ACTIVE'
    }
  })

  const spaOwner = await prisma.user.create({
    data: {
      email: 'owner@lotus-spa.example',
      phone: '0903000001',
      passwordHash,
      roleId: partnerRole.id,
      fullName: 'Lotus Spa Owner',
      status: 'ACTIVE'
    }
  })

  const highlands = await prisma.partner.create({
    data: {
      ownerUserId: highlandsOwner.id,
      legalName: 'Highlands Coffee Demo',
      taxCode: '0302869720',
      representative: 'Nguyen Hai Highlands',
      approvalStatus: 'APPROVED',
      operatingStatus: 'ACTIVE'
    }
  })

  const lotusSpa = await prisma.partner.create({
    data: {
      ownerUserId: spaOwner.id,
      legalName: 'Lotus Spa Demo',
      taxCode: '0319999999',
      representative: 'Le Mai Lotus',
      approvalStatus: 'APPROVED',
      operatingStatus: 'ACTIVE'
    }
  })

  const pendingPartnerOwner = await prisma.user.create({
    data: {
      email: 'pending.partner@voucherhub.com',
      phone: '0903000002',
      passwordHash,
      roleId: partnerRole.id,
      fullName: 'Pending Partner Owner',
      status: 'ACTIVE'
    }
  })

  await prisma.partner.create({
    data: {
      ownerUserId: pendingPartnerOwner.id,
      legalName: 'Pending Foods Demo',
      taxCode: '0399999999',
      representative: 'Pham Pending',
      approvalStatus: 'PENDING',
      operatingStatus: 'ACTIVE'
    }
  })

  const hanoiBranch = await prisma.branch.create({
    data: {
      partnerId: highlands.id,
      name: 'Highlands Hoan Kiem',
      address: '1 Trang Tien, Hoan Kiem, Ha Noi',
      region: 'Ha Noi'
    }
  })

  const hcmBranch = await prisma.branch.create({
    data: {
      partnerId: highlands.id,
      name: 'Highlands Quan 1',
      address: '135 Nam Ky Khoi Nghia, Quan 1, TP HCM',
      region: 'TP HCM'
    }
  })

  const spaBranch = await prisma.branch.create({
    data: {
      partnerId: lotusSpa.id,
      name: 'Lotus Spa Thao Dien',
      address: '12 Quoc Huong, Thu Duc, TP HCM',
      region: 'TP HCM'
    }
  })

  const highlandsStaffUser = await prisma.user.create({
    data: {
      email: 'staff@highlands.example',
      phone: '0904000000',
      passwordHash,
      roleId: staffRole.id,
      fullName: 'Highlands Staff Demo',
      status: 'ACTIVE'
    }
  })
  await prisma.partnerStaff.create({
    data: {
      userId: highlandsStaffUser.id,
      partnerId: highlands.id,
      status: 'ACTIVE',
      assignments: { create: [{ branchId: hanoiBranch.id }, { branchId: hcmBranch.id }] }
    }
  })

  const coffeeVoucher = await prisma.voucherProduct.create({
    data: {
      partnerId: highlands.id,
      categoryId: cafeCat.id,
      name: 'Highlands 50k toan menu',
      description: 'Ap dung cho do uong tai cac chi nhanh Highlands trong danh sach.',
      imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93',
      originalPrice: 50000,
      salePrice: 35000,
      saleStart: daysFromNow(-10),
      saleEnd: daysFromNow(25),
      usageStart: daysFromNow(-10),
      usageEnd: daysFromNow(60),
      totalQuantity: 100,
      remainingQuantity: 94,
      isMultiUse: false,
      status: 'ON_SALE',
      voucherProductBranches: {
        create: [{ branchId: hanoiBranch.id }, { branchId: hcmBranch.id }]
      }
    }
  })

  const buffetVoucher = await prisma.voucherProduct.create({
    data: {
      partnerId: highlands.id,
      categoryId: buffetCat.id,
      name: 'Buffet toi giam 30%',
      description: 'Voucher buffet ap dung buoi toi tu thu 2 den thu 6.',
      imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5',
      originalPrice: 399000,
      salePrice: 279000,
      saleStart: daysFromNow(-5),
      saleEnd: daysFromNow(20),
      usageStart: daysFromNow(-5),
      usageEnd: daysFromNow(45),
      totalQuantity: 50,
      remainingQuantity: 47,
      isMultiUse: false,
      status: 'ON_SALE',
      voucherProductBranches: {
        create: [{ branchId: hcmBranch.id }]
      }
    }
  })

  const spaVoucher = await prisma.voucherProduct.create({
    data: {
      partnerId: lotusSpa.id,
      categoryId: beautyCat.id,
      name: 'Massage thu gian 90 phut',
      description: 'Lieu trinh massage thu gian tai Lotus Spa.',
      imageUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874',
      originalPrice: 650000,
      salePrice: 420000,
      saleStart: daysFromNow(-3),
      saleEnd: daysFromNow(30),
      usageStart: daysFromNow(-3),
      usageEnd: daysFromNow(75),
      totalQuantity: 40,
      remainingQuantity: 38,
      isMultiUse: false,
      status: 'ON_SALE',
      voucherProductBranches: {
        create: [{ branchId: spaBranch.id }]
      }
    }
  })

  await prisma.voucherProduct.create({
    data: {
      partnerId: lotusSpa.id,
      categoryId: travelCat.id,
      name: 'Staycation cuoi tuan',
      description: 'San pham dang cho admin duyet.',
      originalPrice: 1800000,
      salePrice: 1290000,
      saleStart: daysFromNow(2),
      saleEnd: daysFromNow(35),
      usageStart: daysFromNow(5),
      usageEnd: daysFromNow(90),
      totalQuantity: 20,
      remainingQuantity: 20,
      isMultiUse: false,
      status: 'PENDING_REVIEW'
    }
  })

  await prisma.voucherProduct.create({
    data: {
      partnerId: highlands.id,
      categoryId: cafeCat.id,
      name: 'Combo ca phe sang',
      description: 'Da duyet, cho admin cong bo.',
      originalPrice: 90000,
      salePrice: 65000,
      saleStart: daysFromNow(1),
      saleEnd: daysFromNow(20),
      usageStart: daysFromNow(1),
      usageEnd: daysFromNow(40),
      totalQuantity: 80,
      remainingQuantity: 80,
      isMultiUse: false,
      status: 'APPROVED'
    }
  })

  await prisma.cart.create({ data: { customerId: customerA.id } })
  await prisma.cart.create({ data: { customerId: customerB.id } })

  const paidOrder = await prisma.order.create({
    data: {
      customerId: customerA.id,
      totalAmount: 70000,
      paymentMethod: 'SIMULATED',
      status: 'PAID',
      paidAt: daysFromNow(-2),
      orderItems: {
        create: [
          {
            voucherProductId: coffeeVoucher.id,
            quantity: 2,
            unitPrice: 35000
          }
        ]
      }
    },
    include: { orderItems: true }
  })

  const unusedCode = await prisma.issuedVoucherCode.create({
    data: {
      code: 'VH-DEMO-COFFEE-001',
      orderId: paidOrder.id,
      orderItemId: paidOrder.orderItems[0].id,
      voucherProductId: coffeeVoucher.id,
      ownerUserId: customerA.id,
      status: 'UNUSED',
      remainingUses: 1,
      expiresAt: daysFromNow(60)
    }
  })

  const usedCode = await prisma.issuedVoucherCode.create({
    data: {
      code: 'VH-DEMO-COFFEE-002',
      orderId: paidOrder.id,
      orderItemId: paidOrder.orderItems[0].id,
      voucherProductId: coffeeVoucher.id,
      ownerUserId: customerA.id,
      status: 'USED',
      remainingUses: 0,
      expiresAt: daysFromNow(60)
    }
  })

  await prisma.usageLog.create({
    data: {
      issuedCodeId: usedCode.id,
      branchId: hanoiBranch.id,
      actorUserId: highlandsOwner.id,
      result: 'SUCCESS',
      usedAt: daysFromNow(-1)
    }
  })

  const refundableOrder = await prisma.order.create({
    data: {
      customerId: customerB.id,
      totalAmount: 420000,
      paymentMethod: 'SIMULATED',
      status: 'PAID',
      paidAt: daysFromNow(-1),
      orderItems: {
        create: [
          {
            voucherProductId: spaVoucher.id,
            quantity: 1,
            unitPrice: 420000
          }
        ]
      }
    },
    include: { orderItems: true }
  })

  await prisma.issuedVoucherCode.create({
    data: {
      code: 'VH-DEMO-SPA-001',
      orderId: refundableOrder.id,
      orderItemId: refundableOrder.orderItems[0].id,
      voucherProductId: spaVoucher.id,
      ownerUserId: customerB.id,
      status: 'UNUSED',
      remainingUses: 1,
      expiresAt: daysFromNow(75)
    }
  })

  const pendingOrder = await prisma.order.create({
    data: {
      customerId: customerA.id,
      totalAmount: 279000,
      paymentMethod: 'SIMULATED',
      status: 'PENDING_PAYMENT',
      orderItems: {
        create: [
          {
            voucherProductId: buffetVoucher.id,
            quantity: 1,
            unitPrice: 279000
          }
        ]
      }
    }
  })

  await prisma.order.create({
    data: {
      customerId: customerB.id,
      totalAmount: 35000,
      paymentMethod: 'SIMULATED',
      status: 'CANCELLED',
      orderItems: {
        create: [
          {
            voucherProductId: coffeeVoucher.id,
            quantity: 1,
            unitPrice: 35000
          }
        ]
      }
    }
  })

  const refundedOrder = await prisma.order.create({
    data: {
      customerId: customerB.id,
      totalAmount: 279000,
      paymentMethod: 'SIMULATED',
      status: 'REFUNDED',
      paidAt: daysFromNow(-6),
      orderItems: {
        create: [
          {
            voucherProductId: buffetVoucher.id,
            quantity: 1,
            unitPrice: 279000
          }
        ]
      }
    },
    include: { orderItems: true }
  })

  await prisma.issuedVoucherCode.create({
    data: {
      code: 'VH-DEMO-BUFFET-CANCELLED',
      orderId: refundedOrder.id,
      orderItemId: refundedOrder.orderItems[0].id,
      voucherProductId: buffetVoucher.id,
      ownerUserId: customerB.id,
      status: 'CANCELLED',
      remainingUses: 1,
      expiresAt: daysFromNow(45)
    }
  })

  const expiredOrder = await prisma.order.create({
    data: {
      customerId: customerA.id,
      totalAmount: 35000,
      paymentMethod: 'SIMULATED',
      status: 'PAID',
      paidAt: daysFromNow(-80),
      orderItems: {
        create: [
          {
            voucherProductId: coffeeVoucher.id,
            quantity: 1,
            unitPrice: 35000
          }
        ]
      }
    },
    include: { orderItems: true }
  })

  await prisma.issuedVoucherCode.create({
    data: {
      code: 'VH-DEMO-EXPIRED-001',
      orderId: expiredOrder.id,
      orderItemId: expiredOrder.orderItems[0].id,
      voucherProductId: coffeeVoucher.id,
      ownerUserId: customerA.id,
      status: 'EXPIRED',
      remainingUses: 1,
      issuedAt: daysFromNow(-80),
      expiresAt: daysFromNow(-5)
    }
  })

  const publishedContent = await prisma.contentItem.create({
    data: {
      type: 'banner',
      title: 'VoucherHub Summer Demo',
      body: 'Banner cong bo cac voucher dang ban trong du lieu mau TV4.',
      status: 'published',
      displayFrom: daysFromNow(-7),
      displayTo: daysFromNow(30),
      authorUserId: admin.id
    }
  })

  const policyContent = await prisma.contentItem.create({
    data: {
      type: 'policy',
      title: 'Chinh sach hoan tien demo',
      body: 'Admin chi hoan tien don da thanh toan khi voucher code chua duoc su dung.',
      status: 'published',
      authorUserId: admin.id
    }
  })

  await prisma.contentItem.create({
    data: {
      type: 'announcement',
      title: 'Thong bao bao tri cong doi tac',
      body: 'Noi dung nhap de admin co the chinh sua, xuat ban hoac luu tru.',
      status: 'draft',
      authorUserId: admin.id
    }
  })

  // Sample Reviews for Demo
  await prisma.review.createMany({
    data: [
      {
        customerId: customerB.id,
        voucherProductId: spaVoucher.id,
        orderId: refundableOrder.id,
        rating: 5,
        comment: 'Dịch vụ spa tuyệt vời, nhân viên tận tình, cơ sở vật chất 5 sao!'
      },
      {
        customerId: customerA.id,
        voucherProductId: coffeeVoucher.id,
        orderId: paidOrder.id,
        rating: 4,
        comment: 'Cà phê thơm ngon, không gian quán rất thích hợp để làm việc.'
      }
    ]
  })

  await prisma.auditLog.createMany({
    data: [
      // 1. Admin System Actions
      {
        actorUserId: admin.id,
        action: 'seed.database',
        entityType: 'database',
        metadata: { scope: 'EC-VoucherHub', roles: 4, tables: 19 }
      },
      {
        actorUserId: admin.id,
        action: 'content.publish',
        entityType: 'content_item',
        entityId: publishedContent.id,
        metadata: { title: publishedContent.title, type: publishedContent.type }
      },
      {
        actorUserId: admin.id,
        action: 'content.publish',
        entityType: 'content_item',
        entityId: policyContent.id,
        metadata: { title: policyContent.title, type: policyContent.type }
      },
      {
        actorUserId: admin.id,
        action: 'partner.approve',
        entityType: 'partner',
        entityId: highlands.id,
        metadata: { partnerName: highlands.legalName, approvalStatus: 'APPROVED' }
      },
      {
        actorUserId: admin.id,
        action: 'partner.approve',
        entityType: 'partner',
        entityId: lotusSpa.id,
        metadata: { partnerName: lotusSpa.legalName, approvalStatus: 'APPROVED' }
      },
      {
        actorUserId: admin.id,
        action: 'voucher.approve',
        entityType: 'voucher_product',
        entityId: coffeeVoucher.id,
        metadata: { voucherName: coffeeVoucher.name, previousStatus: 'PENDING_APPROVAL', nextStatus: 'ACTIVE' }
      },
      {
        actorUserId: admin.id,
        action: 'voucher.approve',
        entityType: 'voucher_product',
        entityId: spaVoucher.id,
        metadata: { voucherName: spaVoucher.name, previousStatus: 'PENDING_APPROVAL', nextStatus: 'ACTIVE' }
      },
      {
        actorUserId: admin.id,
        action: 'order.demo-ready',
        entityType: 'order',
        entityId: refundableOrder.id,
        metadata: { flow: 'FLOW-010', expectedAction: 'refund' }
      },

      // 2. Partner Actions (Highlands & Lotus Spa)
      {
        actorUserId: highlandsOwner.id,
        action: 'branch.create',
        entityType: 'branch',
        entityId: String(hanoiBranch.id),
        metadata: { branchName: hanoiBranch.name, region: hanoiBranch.region }
      },
      {
        actorUserId: highlandsOwner.id,
        action: 'voucher.create',
        entityType: 'voucher_product',
        entityId: coffeeVoucher.id,
        metadata: { voucherName: coffeeVoucher.name, salePrice: 35000, totalQuantity: 200 }
      },
      {
        actorUserId: highlandsOwner.id,
        action: 'voucher.submit',
        entityType: 'voucher_product',
        entityId: coffeeVoucher.id,
        metadata: { voucherName: coffeeVoucher.name, status: 'PENDING_APPROVAL' }
      },
      {
        actorUserId: spaOwner.id,
        action: 'voucher.submit',
        entityType: 'voucher_product',
        entityId: spaVoucher.id,
        metadata: { voucherName: spaVoucher.name, status: 'PENDING_APPROVAL' }
      },

      // 3. Customer Actions (Customer A & B)
      {
        actorUserId: customerA.id,
        action: 'order.create',
        entityType: 'order',
        entityId: paidOrder.id,
        metadata: { totalAmount: 70000, itemCount: 2 }
      },
      {
        actorUserId: customerA.id,
        action: 'payment.success',
        entityType: 'order',
        entityId: paidOrder.id,
        metadata: { gateway: 'VNPAY', amount: 70000 }
      },
      {
        actorUserId: customerA.id,
        action: 'review.create',
        entityType: 'review',
        entityId: coffeeVoucher.id,
        metadata: { rating: 4, comment: 'Cà phê thơm ngon, không gian quán rất thích hợp để làm việc.' }
      },
      {
        actorUserId: customerB.id,
        action: 'order.create',
        entityType: 'order',
        entityId: refundableOrder.id,
        metadata: { totalAmount: 390000, itemCount: 1 }
      },
      {
        actorUserId: customerB.id,
        action: 'payment.success',
        entityType: 'order',
        entityId: refundableOrder.id,
        metadata: { gateway: 'VNPAY', amount: 390000 }
      },
      {
        actorUserId: customerB.id,
        action: 'review.create',
        entityType: 'review',
        entityId: spaVoucher.id,
        metadata: { rating: 5, comment: 'Dịch vụ spa tuyệt vời, nhân viên tận tình, cơ sở vật chất 5 sao!' }
      }
    ]
  })

  console.log('Seed complete.')
  console.log(`Demo pending order for cancel: ${pendingOrder.id}`)
  console.log(`Demo paid order with used code: ${paidOrder.id}`)
  console.log(`Demo refundable paid order: ${refundableOrder.id}`)
  console.log(`Demo unused code: ${unusedCode.code}`)
}

main()
  .catch((error) => {
    console.error('Seed failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
