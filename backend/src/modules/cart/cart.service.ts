import { Prisma } from '@prisma/client'
import prisma from '../../configs/prisma'
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from '../../middleware/error-handler'
import type { AddCartItemDto, UpdateCartItemDto, CartResponse, CartItemResponse } from '@voucher/shared'
import { Decimal } from '@prisma/client/runtime/library'

// ─── Helpers ────────────────────────────────────────────────────────

const formatDecimal = (d: Decimal): string => d.toFixed(2)

/**
 * Map cart + items + voucherProduct join → CartResponse DTO.
 */
const toCartResponse = (
  cart: {
    id: string
    customerId: string
    updatedAt: Date
    cartItems: Array<{
      id: number
      voucherProductId: string
      quantity: number
      voucherProduct: {
        name: string
        salePrice: Decimal
      }
    }>
  },
): CartResponse => {
  let subtotal = new Decimal(0)

  const items: CartItemResponse[] = cart.cartItems.map((ci) => {
    const itemTotal = ci.voucherProduct.salePrice.mul(ci.quantity)
    subtotal = subtotal.add(itemTotal)

    return {
      id: ci.id,
      voucherProductId: ci.voucherProductId,
      voucherProductName: ci.voucherProduct.name,
      salePrice: formatDecimal(ci.voucherProduct.salePrice),
      quantity: ci.quantity,
      itemTotal: formatDecimal(itemTotal),
    }
  })

  return {
    id: cart.id,
    customerId: cart.customerId,
    items,
    subtotal: formatDecimal(subtotal),
    updatedAt: cart.updatedAt.toISOString(),
  }
}

// Include fragment dùng chung cho mọi query
const cartInclude = {
  cartItems: {
    include: {
      voucherProduct: {
        select: { name: true, salePrice: true },
      },
    },
    orderBy: { createdAt: Prisma.SortOrder.asc },
  },
} as const

// ─── Service ────────────────────────────────────────────────────────

/**
 * Lấy giỏ hàng của khách. Nếu chưa có → tạo mới (lazy init).
 */
export const getCart = async (customerId: string): Promise<CartResponse> => {
  let cart = await prisma.cart.findUnique({
    where: { customerId },
    include: cartInclude,
  })

  if (!cart) {
    cart = await prisma.cart.create({
      data: { customerId },
      include: cartInclude,
    })
  }

  return toCartResponse(cart)
}

/**
 * Thêm mục vào giỏ. Upsert: nếu đã có → cộng dồn quantity.
 */
export const addItem = async (
  customerId: string,
  dto: AddCartItemDto,
): Promise<CartResponse> => {
  const { voucherProductId, quantity } = dto

  // 1. Validate voucher tồn tại + đang bán
  const voucher = await prisma.voucherProduct.findUnique({
    where: { id: voucherProductId },
    select: { id: true, status: true, remainingQuantity: true, name: true },
  })

  if (!voucher) {
    throw new NotFoundError('voucher không tồn tại')
  }

  if (voucher.status !== 'ON_SALE') {
    throw new ValidationError('voucher không đang bán', [
      { field: 'voucherProductId', message: 'voucher không ở trạng thái đang bán' },
    ])
  }

  // 2. Lazy init giỏ
  let cart = await prisma.cart.findUnique({
    where: { customerId },
  })

  if (!cart) {
    cart = await prisma.cart.create({
      data: { customerId },
    })
  }

  // 3. Kiểm tra existing item → cộng dồn
  const existingItem = await prisma.cartItem.findUnique({
    where: {
      cartId_voucherProductId: {
        cartId: cart.id,
        voucherProductId,
      },
    },
  })

  const newQuantity = existingItem ? existingItem.quantity + quantity : quantity

  // 4. Validate tồn kho
  if (newQuantity > voucher.remainingQuantity) {
    throw new ValidationError('vượt quá tồn kho', [
      {
        field: 'quantity',
        message: `chỉ còn ${voucher.remainingQuantity} sản phẩm, bạn đã có ${existingItem?.quantity ?? 0} trong giỏ`,
      },
    ])
  }

  // 5. Upsert cart item
  if (existingItem) {
    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: newQuantity },
    })
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        voucherProductId,
        quantity,
      },
    })
  }

  // 6. Trả giỏ cập nhật
  return getCart(customerId)
}

/**
 * Cập nhật số lượng mục trong giỏ.
 */
export const updateItem = async (
  customerId: string,
  itemId: number,
  dto: UpdateCartItemDto,
): Promise<CartResponse> => {
  const { quantity } = dto

  // 1. Tìm item + validate ownership
  const item = await prisma.cartItem.findUnique({
    where: { id: itemId },
    include: {
      cart: { select: { customerId: true } },
      voucherProduct: { select: { remainingQuantity: true } },
    },
  })

  if (!item) {
    throw new NotFoundError('mục giỏ hàng không tồn tại')
  }

  if (item.cart.customerId !== customerId) {
    throw new ForbiddenError('mục không thuộc giỏ của bạn')
  }

  // 2. Validate tồn kho
  if (quantity > item.voucherProduct.remainingQuantity) {
    throw new ValidationError('vượt quá tồn kho', [
      {
        field: 'quantity',
        message: `chỉ còn ${item.voucherProduct.remainingQuantity} sản phẩm`,
      },
    ])
  }

  // 3. Update
  await prisma.cartItem.update({
    where: { id: itemId },
    data: { quantity },
  })

  return getCart(customerId)
}

/**
 * Xoá mục khỏi giỏ.
 */
export const removeItem = async (
  customerId: string,
  itemId: number,
): Promise<void> => {
  // 1. Tìm + validate ownership
  const item = await prisma.cartItem.findUnique({
    where: { id: itemId },
    include: { cart: { select: { customerId: true } } },
  })

  if (!item) {
    throw new NotFoundError('mục giỏ hàng không tồn tại')
  }

  if (item.cart.customerId !== customerId) {
    throw new ForbiddenError('mục không thuộc giỏ của bạn')
  }

  // 2. Delete
  await prisma.cartItem.delete({ where: { id: itemId } })
}
