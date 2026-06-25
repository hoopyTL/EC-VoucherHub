import { z } from 'zod'

// ─── Order DTOs ─────────────────────────────────────────────────────

export const giftRecipientSchema = z.object({
  name: z
    .string({ error: 'tên người nhận là bắt buộc' })
    .min(1, 'tên người nhận không được rỗng')
    .max(255, 'tên người nhận quá dài'),
  phone: z
    .string({ error: 'số điện thoại người nhận là bắt buộc' })
    .min(1, 'số điện thoại không được rỗng')
    .max(20, 'số điện thoại quá dài'),
})
export type GiftRecipient = z.infer<typeof giftRecipientSchema>

export const createOrderSchema = z.object({
  paymentMethod: z
    .string({ error: 'paymentMethod là bắt buộc' })
    .min(1, 'paymentMethod không được rỗng')
    .max(32, 'paymentMethod quá dài'),
  giftRecipient: giftRecipientSchema.optional(),
})
export type CreateOrderDto = z.infer<typeof createOrderSchema>

export interface OrderItemResponse {
  id: number
  voucherProductId: string
  voucherProductName: string
  quantity: number
  unitPrice: string // Decimal as string — snapshot giá tại lúc mua
}

export interface OrderResponse {
  id: string
  customerId: string
  status: string
  totalAmount: string
  paymentMethod: string
  giftRecipient: GiftRecipient | null
  items: OrderItemResponse[]
  paidAt: string | null
  createdAt: string
  updatedAt: string
}

export interface OrderListResponse {
  items: OrderResponse[]
  nextCursor: string | null
}
