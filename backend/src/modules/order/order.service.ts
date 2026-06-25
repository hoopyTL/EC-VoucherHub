import { Prisma } from '@prisma/client'
import prisma from '../../configs/prisma'
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from '../../middleware/error-handler'
import type {
  CreateOrderDto,
  OrderResponse,
  OrderItemResponse,
  OrderListResponse,
  GiftRecipient,
} from '@voucher/shared'
import { Decimal } from '@prisma/client/runtime/library'

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
