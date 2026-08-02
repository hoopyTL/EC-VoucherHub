/**
 * Order / cart / payment API helpers (task 12.3).
 *
 * Thin typed wrappers over the shared Axios {@link api} client for the customer
 * checkout → payment flow:
 *   - POST /cart                 → {@link addToCart}      (Req 13.1)
 *   - GET  /cart                 → {@link getCart}        (order summary source)
 *   - POST /orders               → {@link createOrder}    (Req 14.1, 14.2)
 *   - GET  /orders/:id           → {@link getOrder}       (payment page summary)
 *   - POST /orders/:id/pay       → {@link payOrder}       (Req 15.1–15.3)
 *   - POST /orders/:id/cancel    → {@link cancelOrder}    (Req 15.4)
 *
 * Response typing notes:
 *   - The backend serialises Prisma `Decimal` money values as JSON strings, so
 *     monetary fields on orders are typed `string | number` and must be passed
 *     through {@link toNumber} before arithmetic/formatting.
 *   - The cart endpoint already returns plain `number` money values.
 *
 * _Requirements: 14.1, 14.2, 15.1, 15.2, 15.3_
 */
import type { CreateOrderRequest, OrderStatus, PaymentRequest } from '@ui-contracts'
import { api } from './api'

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------

/** A single cart line as returned by `GET /cart` (money values are numbers). */
export interface CartItemResponse {
  id: string
  voucherId: string
  title: string
  unitPrice: number
  quantity: number
  subtotal: number
}

/** The customer's cart with its recalculated total (`GET /cart`). */
export interface CartResponse {
  items: CartItemResponse[]
  total: number
}

/**
 * An order line item. `unitPrice`/`subtotal` arrive as JSON strings (Prisma
 * `Decimal`) but may be numbers in tests — normalise with {@link toNumber}.
 */
export interface OrderItemResponse {
  id: string
  orderId: string
  voucherId: string
  quantity: number
  unitPrice: string | number
  subtotal: string | number
  voucher: { id: string; title: string }
}

/** An order with its line items, as returned by the order/payment endpoints. */
export interface OrderResponse {
  id: string
  userId: string
  totalAmount: string | number
  status: OrderStatus
  recipientName: string | null
  recipientEmail: string | null
  recipientPhone: string | null
  createdAt: string
  updatedAt: string
  orderItems: OrderItemResponse[]
}

/** Result of a successful payment (`POST /orders/:id/pay`). */
export interface PaymentResultResponse {
  order: OrderResponse
  /** Number of voucher codes issued for the order (Req 16.1). */
  issuedCodeCount: number
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

/** Fetch the authenticated customer's cart (used to render the order summary). */
export async function getCart(): Promise<CartResponse> {
  const { data } = await api.get<CartResponse>('/cart')
  return data
}

/**
 * Add a voucher to the authenticated customer's cart (Req 13.1).
 *
 * The backend increments the quantity if the voucher is already in the cart,
 * and enforces the per-item maximum (10) and available-inventory limit — it
 * returns the refreshed cart with recalculated subtotals/total.
 */
export async function addToCart(voucherId: string, quantity: number): Promise<CartResponse> {
  const { data } = await api.post<CartResponse>('/cart', { voucherId, quantity })
  return data
}

/** Create an order from the customer's cart, with optional gift recipient. */
export async function createOrder(body: CreateOrderRequest): Promise<OrderResponse> {
  const { data } = await api.post<OrderResponse>('/orders', body)
  return data
}

/** Fetch a single order owned by the customer. */
export async function getOrder(orderId: string): Promise<OrderResponse> {
  const { data } = await api.get<OrderResponse>(`/orders/${orderId}`)
  return data
}

/** Submit a simulated payment for an order (success/failure). */
export async function payOrder(orderId: string, body: PaymentRequest): Promise<PaymentResultResponse> {
  const { data } = await api.post<PaymentResultResponse>(`/orders/${orderId}/pay`, body)
  return data
}

/** Cancel a pending order before payment, restoring inventory (Req 15.4). */
export async function cancelOrder(orderId: string): Promise<OrderResponse> {
  const { data } = await api.post<OrderResponse>(`/orders/${orderId}/cancel`, {})
  return data
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Coerce a Prisma-`Decimal`-as-string (or number) into a finite number. */
export function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

/** Format a monetary amount with grouping and two decimal places. */
export function formatMoney(value: string | number | null | undefined): string {
  return toNumber(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

/** Shape of the structured error body returned by the backend error handler. */
interface ApiErrorBody {
  error?: { code?: string; message?: string }
}

/**
 * Derive a user-facing message from a failed API call. Surfaces the backend's
 * structured `{ error: { message } }` when present, otherwise a network/default
 * fallback so internals are never leaked.
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  const response = (err as { response?: { status?: number; data?: ApiErrorBody } })?.response

  if (!response) {
    return 'Unable to reach the server. Please check your connection and try again.'
  }

  return response.data?.error?.message ?? fallback
}
