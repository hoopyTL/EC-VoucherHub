/**
 * Client-side response DTOs for the customer order / voucher-code endpoints.
 *
 * These mirror the JSON shapes returned by the backend services:
 *   - `OrderWithItems`        → GET /orders, GET /orders/:id
 *   - `VoucherCodeWithDetails` → GET /my-codes, GET /my-codes/:id
 *
 * The server models money as Prisma `Decimal` (serialised to a JSON string) and
 * dates as `DateTime` (serialised to an ISO string), so those fields are typed
 * as `string` here. Status enums reuse the canonical unions from
 * The UI preview imports these temporary contracts from `@ui-contracts`.
 */
import type { OrderStatus, VoucherCodeStatus } from '@ui-contracts'

/** A single line item within an order (GET /orders, /orders/:id). */
export interface OrderItem {
  id: number | string
  orderId?: string
  voucherProductId: string
  voucherProductName: string
  voucherId?: string
  subtotal?: string
  voucher?: { id: string; title: string }
  quantity: number
  /** Decimal serialised as a string. */
  unitPrice: string
}

/** An order with its line items, as returned to the owning customer. */
export interface Order {
  id: string
  customerId?: string
  userId?: string
  /** Decimal serialised as a string. */
  totalAmount: string
  status: OrderStatus
  paymentMethod: string
  giftRecipient: { name?: string; phone?: string; email?: string } | null
  recipientName?: string | null
  recipientEmail?: string | null
  recipientPhone?: string | null
  /** ISO date string. */
  createdAt: string
  /** ISO date string. */
  updatedAt: string
  items?: OrderItem[]
  orderItems?: OrderItem[]
  paidAt: string | null
  codes?: Array<{
    code: string
    voucherProductId: string
    status: string
    expiresAt: string
  }>
  voucherCodes?: VoucherCode[]
}

/** Voucher details embedded in a voucher-code response. */
export interface VoucherCodeVoucher {
  id: string
  title: string
  description: string
  category: string
  /** ISO date string. */
  usagePeriodStart: string
  /** ISO date string. */
  usagePeriodEnd: string
  terms: string | null
}

/** Order summary embedded in a voucher-code response. */
export interface VoucherCodeOrder {
  id: string
  /** ISO date string. */
  createdAt: string
  status: OrderStatus
}

/** A voucher code with its voucher details and originating order. */
export interface VoucherCode {
  id: string
  code: string
  status: VoucherCodeStatus
  voucherId: string
  orderId: string
  ownerId: string
  /** ISO date string, present once the code has been redeemed. */
  redeemedAt: string | null
  redemptionBranchId: string | null
  /** ISO date string. */
  createdAt: string
  /** ISO date string. */
  updatedAt: string
  voucher: VoucherCodeVoucher
  order: VoucherCodeOrder
}
