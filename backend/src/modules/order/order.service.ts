import { Prisma } from '@prisma/client'
import prisma from '../../configs/prisma'
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
  ConflictError,
} from '../../middleware/error-handler'
import type {
  CreateOrderDto,
  OrderResponse,
  OrderItemResponse,
  OrderListResponse,
  GiftRecipient,
  PaymentOutcomeDto,
  PaymentResponse,
} from '@voucher/shared'
import { Decimal } from '@prisma/client/runtime/library'
import { generateVoucherCode } from '../../utils/voucher-code-generator'

// ─── Constants ──────────────────────────────────────────────────────

const DEFAULT_PAGE_LIMIT = 20
const MAX_PAGE_LIMIT = 100

// ─── Helpers ────────────────────────────────────────────────────────

const formatDecimal = (d: Decimal): string => d.toFixed(2)

/**
 * Map raw Prisma order → OrderResponse DTO.
 */
const toOrderResponse = (
  order: {
    id: string
    customerId: string
    status: string
    totalAmount: Decimal
    paymentMethod: string
    giftRecipient: Prisma.JsonValue
    paidAt: Date | null
    createdAt: Date
    updatedAt: Date
    orderItems: Array<{
      id: number
      voucherProductId: string
      quantity: number
      unitPrice: Decimal
      voucherProduct: {
        name: string
      }
    }>
  },
): OrderResponse => {
  const items: OrderItemResponse[] = order.orderItems.map((oi) => ({
    id: oi.id,
    voucherProductId: oi.voucherProductId,
    voucherProductName: oi.voucherProduct.name,
    quantity: oi.quantity,
    unitPrice: formatDecimal(oi.unitPrice),
  }))

  return {
    id: order.id,
    customerId: order.customerId,
    status: order.status,
    totalAmount: formatDecimal(order.totalAmount),
    paymentMethod: order.paymentMethod,
    giftRecipient: order.giftRecipient as GiftRecipient | null,
    items,
    paidAt: order.paidAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  }
}

// Include fragment
const orderInclude = {
  orderItems: {
    include: {
      voucherProduct: {
        select: { name: true },
      },
    },
  },
} as const

// ─── Service ────────────────────────────────────────────────────────

/**
 * Tạo đơn hàng từ giỏ.
 *
 * Logic:
 * 1. Lấy giỏ + items + join voucher
 * 2. Validate giỏ không rỗng
 * 3. Validate mỗi voucher ON_SALE + tồn kho đủ
 * 4. Trong Prisma transaction:
 *    - Tạo Order (PENDING_PAYMENT)
 *    - Tạo OrderItems (snapshot unitPrice = salePrice)
 *    - Xóa các CartItems đã đưa vào đơn
 *
 * Chưa trừ tồn kho — chỉ trừ khi thanh toán thành công (TASK-010).
 */
export const createOrder = async (
  customerId: string,
  dto: CreateOrderDto,
): Promise<OrderResponse> => {
  // 1. Lấy giỏ
  const cart = await prisma.cart.findUnique({
    where: { customerId },
    include: {
      cartItems: {
        include: {
          voucherProduct: {
            select: {
              id: true,
              name: true,
              salePrice: true,
              status: true,
              remainingQuantity: true,
            },
          },
        },
      },
    },
  })

  // 2. Validate giỏ có items
  if (!cart || cart.cartItems.length === 0) {
    throw new ValidationError('giỏ hàng rỗng', [
      { field: 'cart', message: 'giỏ hàng rỗng, không thể tạo đơn' },
    ])
  }

  // 3. Validate từng mục
  const stockErrors: Array<{ field: string; message: string }> = []

  for (const item of cart.cartItems) {
    const vp = item.voucherProduct

    if (vp.status !== 'ON_SALE') {
      stockErrors.push({
        field: `items.${vp.id}`,
        message: `"${vp.name}" không còn đang bán`,
      })
      continue
    }

    if (item.quantity > vp.remainingQuantity) {
      stockErrors.push({
        field: `items.${vp.id}`,
        message: `"${vp.name}" chỉ còn ${vp.remainingQuantity}, bạn đặt ${item.quantity}`,
      })
    }
  }

  if (stockErrors.length > 0) {
    throw new ValidationError('vượt quá tồn kho', stockErrors)
  }

  // 4. Tính tổng
  let totalAmount = new Decimal(0)
  for (const item of cart.cartItems) {
    totalAmount = totalAmount.add(item.voucherProduct.salePrice.mul(item.quantity))
  }

  // 5. Transaction: tạo order + items + xóa cart items đã đặt
  const cartItemIds = cart.cartItems.map((ci) => ci.id)

  const order = await prisma.$transaction(async (tx) => {
    // 5a. Tạo Order
    const newOrder = await tx.order.create({
      data: {
        customerId,
        totalAmount,
        paymentMethod: dto.paymentMethod,
        status: 'PENDING_PAYMENT',
        giftRecipient: dto.giftRecipient
          ? (dto.giftRecipient as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        orderItems: {
          create: cart.cartItems.map((ci) => ({
            voucherProductId: ci.voucherProductId,
            quantity: ci.quantity,
            unitPrice: ci.voucherProduct.salePrice, // snapshot giá
          })),
        },
      },
      include: orderInclude,
    })

    // 5b. Xóa chỉ các cart items đã đưa vào đơn
    await tx.cartItem.deleteMany({
      where: {
        id: { in: cartItemIds },
      },
    })

    return newOrder
  })

  return toOrderResponse(order)
}

/**
 * Danh sách đơn hàng của khách (cursor pagination).
 */
export const getMyOrders = async (
  customerId: string,
  cursor?: string,
  limit?: number,
): Promise<OrderListResponse> => {
  const take = Math.min(limit ?? DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT)

  const orders = await prisma.order.findMany({
    where: { customerId },
    include: orderInclude,
    orderBy: { createdAt: 'desc' },
    take: take + 1, // lấy thêm 1 để xác định nextCursor
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1, // skip cursor item
        }
      : {}),
  })

  let nextCursor: string | null = null
  if (orders.length > take) {
    const lastItem = orders.pop()!
    nextCursor = lastItem.id
  }

  return {
    items: orders.map(toOrderResponse),
    nextCursor,
  }
}

/**
 * Chi tiết đơn hàng. Kiểm tra phạm vi sở hữu (chỉ xem đơn của mình).
 */
export const getOrderDetail = async (
  customerId: string,
  orderId: string,
): Promise<OrderResponse> => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: orderInclude,
  })

  if (!order) {
    throw new NotFoundError('đơn hàng không tồn tại')
  }

  if (order.customerId !== customerId) {
    throw new ForbiddenError('đơn hàng không thuộc về bạn')
  }

  return toOrderResponse(order)
}

/**
 * Xử lý thanh toán mô phỏng cho đơn hàng.
 * Nếu thành công: trừ kho + đổi trạng thái PAID + phát hành N mã voucher trong transaction.
 */
export const processPayment = async (
  customerId: string,
  orderId: string,
  dto: PaymentOutcomeDto,
): Promise<PaymentResponse> => {
  // 1. Tìm đơn hàng
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      orderItems: {
        include: {
          voucherProduct: {
            select: {
              id: true,
              name: true,
              status: true,
              remainingQuantity: true,
              usageEnd: true,
              isMultiUse: true,
              usesPerCode: true,
            },
          },
        },
      },
    },
  })

  if (!order) {
    throw new NotFoundError('đơn hàng không tồn tại')
  }

  if (order.customerId !== customerId) {
    throw new ForbiddenError('đơn hàng không thuộc về bạn')
  }

  // 2. Kiểm tra trạng thái đơn hàng (chỉ thanh toán khi PENDING_PAYMENT)
  if (order.status !== 'PENDING_PAYMENT') {
    throw new ConflictError('đơn hàng không ở trạng thái chờ thanh toán')
  }

  // 3. Nếu thanh toán thất bại
  if (dto.outcome === 'FAILURE') {
    return {
      orderId: order.id,
      status: order.status,
      codes: [],
    }
  }

  // 4. Nếu thanh toán thành công -> Chạy transaction
  const issuedCodes = await prisma.$transaction(async (tx) => {
    const codesData: Array<{
      code: string
      orderId: string
      orderItemId: number
      voucherProductId: string
      ownerUserId: string
      status: 'UNUSED'
      remainingUses: number
      expiresAt: Date
    }> = []

    // 4a. Khóa và trừ tồn kho từng voucher
    for (const item of order.orderItems) {
      const vp = item.voucherProduct

      // Tải lại voucher và kiểm tra lại
      const freshVoucher = await tx.voucherProduct.findUnique({
        where: { id: vp.id },
        select: { remainingQuantity: true, name: true, status: true },
      })

      if (!freshVoucher || freshVoucher.status !== 'ON_SALE') {
        throw new ValidationError('voucher không còn đang bán', [
          { field: `items.${vp.id}`, message: `Voucher "${freshVoucher?.name ?? 'Không tên'}" không còn bán.` },
        ])
      }

      if (freshVoucher.remainingQuantity < item.quantity) {
        throw new ValidationError('vượt quá tồn kho', [
          { field: `items.${vp.id}`, message: `Voucher "${freshVoucher.name}" không đủ số lượng trong kho.` },
        ])
      }

      // Trừ tồn kho
      await tx.voucherProduct.update({
        where: { id: vp.id },
        data: {
          remainingQuantity: {
            decrement: item.quantity,
          },
        },
      })

      // 4b. Chuẩn bị thông tin mã voucher sẽ phát hành
      for (let i = 0; i < item.quantity; i++) {
        // Sinh mã ngẫu nhiên duy nhất
        let code = generateVoucherCode()
        
        // Đảm bảo không trùng lặp (nếu trùng thì sinh lại, tối đa 5 lần)
        let isUnique = false
        let attempts = 0
        while (!isUnique && attempts < 5) {
          const existingCode = await tx.issuedVoucherCode.findUnique({
            where: { code },
          })
          if (!existingCode) {
            isUnique = true
          } else {
            code = generateVoucherCode()
            attempts++
          }
        }

        codesData.push({
          code,
          orderId: order.id,
          orderItemId: item.id,
          voucherProductId: vp.id,
          ownerUserId: customerId,
          status: 'UNUSED',
          remainingUses: vp.isMultiUse ? (vp.usesPerCode ?? 1) : 1,
          expiresAt: vp.usageEnd,
        })
      }
    }

    // 4c. Cập nhật trạng thái đơn hàng -> PAID
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
    })

    // 4d. Tạo các mã voucher trong DB
    const createdCodes: Array<{
      code: string
      voucherProductId: string
      status: string
      expiresAt: Date
    }> = []

    for (const data of codesData) {
      const newCode = await tx.issuedVoucherCode.create({
        data,
        select: {
          code: true,
          voucherProductId: true,
          status: true,
          expiresAt: true,
        },
      })
      createdCodes.push(newCode)
    }

    return createdCodes
  })

  // 5. Trả về kết quả thanh toán thành công
  return {
    orderId: order.id,
    status: 'PAID',
    codes: issuedCodes.map((c) => ({
      code: c.code,
      voucherProductId: c.voucherProductId,
      status: c.status,
      expiresAt: c.expiresAt.toISOString(),
    })),
  }
}
