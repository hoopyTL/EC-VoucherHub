import { z } from 'zod'

// ─── Cart DTOs ──────────────────────────────────────────────────────

export const addCartItemSchema = z.object({
  voucherProductId: z
    .string({ error: 'voucherProductId là bắt buộc' })
    .uuid('voucherProductId phải là UUID hợp lệ'),
  quantity: z
    .number({ error: 'quantity là bắt buộc' })
    .int('quantity phải là số nguyên')
    .positive('quantity phải lớn hơn 0'),
})
export type AddCartItemDto = z.infer<typeof addCartItemSchema>

export const updateCartItemSchema = z.object({
  quantity: z
    .number({ error: 'quantity là bắt buộc' })
    .int('quantity phải là số nguyên')
    .positive('quantity phải lớn hơn 0'),
})
export type UpdateCartItemDto = z.infer<typeof updateCartItemSchema>

export interface CartItemResponse {
  id: number
  voucherProductId: string
  voucherProductName: string
  salePrice: string // Decimal as string
  quantity: number
  itemTotal: string // salePrice × quantity
}

export interface CartResponse {
  id: string
  customerId: string
  items: CartItemResponse[]
  subtotal: string // Σ(salePrice × quantity)
  updatedAt: string
}
