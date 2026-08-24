import { z } from 'zod'

// ─── Order DTOs ─────────────────────────────────────────────────────

export const giftRecipientSchema = z
  .object({
    name: z.string().trim().min(1, 'tên người nhận không được rỗng').max(255, 'tên người nhận quá dài').optional(),
    email: z.string().trim().email('email người nhận không hợp lệ').max(255).optional(),
    phone: z.string().trim().min(1, 'số điện thoại không được rỗng').max(20, 'số điện thoại quá dài').optional()
  })
  .refine((recipient) => recipient.name || recipient.email || recipient.phone, {
    message: 'cần ít nhất một thông tin người nhận'
  })
export type GiftRecipient = z.infer<typeof giftRecipientSchema>

export const createOrderSchema = z.object({
  paymentMethod: z.string().optional(),
  giftRecipient: giftRecipientSchema.optional(),
  selectedCartItemIds: z.array(z.coerce.number().int().positive()).min(1, 'cần chọn ít nhất một voucher').optional()
})
export type CreateOrderDto = z.infer<typeof createOrderSchema>

export const paymentOutcomeSchema = z.object({
  outcome: z.enum(['SUCCESS', 'FAILURE'], {
    error: 'outcome phải là SUCCESS hoặc FAILURE'
  }),
  gateway: z.string().optional()
})
export type PaymentOutcomeDto = z.infer<typeof paymentOutcomeSchema>

export interface VoucherCodeIssuedResponse {
  code: string
  voucherProductId: string
  status: string
  expiresAt: string
}

export interface PaymentResponse {
  orderId: string
  status: string
  codes: VoucherCodeIssuedResponse[]
}

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
  codes?: VoucherCodeIssuedResponse[]
}

export interface OrderListResponse {
  items: OrderResponse[]
  nextCursor: string | null
}
