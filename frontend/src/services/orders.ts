/**
 * Order / cart / payment API helpers (task 12.3).
 *
 * Thin typed wrappers over the shared Axios {@link api} client for the customer
 * checkout → payment flow:
 *   - POST /cart                 → {@link addToCart}      (Req 13.1)
 *   - GET  /cart                 → {@link getCart}        (order summary source)
 *   - POST /orders               → {@link createOrder}    (Req 14.1, 14.2)
 *   - GET  /orders/:id           → {@link getOrder}       (payment page summary)
 *   - POST /orders/:id/payment   → {@link payOrder}       (Req 15.1–15.3)
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
 * An order line item from the backend JSON response
 */
export interface OrderItemResponse {
  id: number
  voucherProductId: string
  voucherProductName: string
  quantity: number
  unitPrice: string | number
}

/** An order with its line items, as returned by the order/payment endpoints. */
export interface OrderResponse {
  id: string
  customerId: string
  totalAmount: string | number
  status: OrderStatus
  paymentMethod: string
  giftRecipient: { name?: string; phone?: string; email?: string } | null
  paidAt: string | null
  createdAt: string
  updatedAt: string
  items: OrderItemResponse[]
  codes?: Array<{
    code: string
    voucherProductId: string
    status: string
    expiresAt: string
  }>
}

/** Result of a successful payment (`POST /orders/:id/payment`). */
export interface PaymentResultResponse {
  order: OrderResponse
  /** Number of voucher codes issued for the order (Req 16.1). */
  issuedCodeCount: number
}

/** A recorded gateway attempt returned by `GET /orders/:id/payments`. */
export interface PaymentTransactionResponse {
  id: string
  orderId: string
  gateway: string
  gatewayTransId: string | null
  amount: string
  currency: string
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED'
  failureReason: string | null
  paidAt: string | null
  refundedAt: string | null
  createdAt: string
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

export function mapCartData(apiCart: any): CartResponse {
  if (!apiCart) return { items: [], total: 0 }
  return {
    items: (apiCart.items || []).map((item: any) => ({
      id: String(item.id),
      voucherId: item.voucherProductId || item.voucherId,
      title: item.voucherProductName || item.title,
      unitPrice: Number(item.salePrice ?? item.unitPrice),
      quantity: Number(item.quantity),
      subtotal: Number(item.itemTotal ?? item.subtotal)
    })),
    total: Number(apiCart.subtotal ?? apiCart.total ?? 0)
  }
}

/** Fetch the authenticated customer's cart (used to render the order summary). */
export async function getCart(): Promise<CartResponse> {
  const { data } = await api.get<{ data: any }>('/cart')
  return mapCartData((data as any).data || data)
}

/**
 * Add a voucher to the authenticated customer's cart (Req 13.1).
 *
 * The backend increments the quantity if the voucher is already in the cart,
 * and enforces the per-item maximum (10) and available-inventory limit — it
 * returns the refreshed cart with recalculated subtotals/total.
 */
export async function addToCart(voucherId: string, quantity: number): Promise<CartResponse> {
  const { data } = await api.post<{ data: any }>('/cart/items', { voucherProductId: voucherId, quantity })
  return mapCartData((data as any).data || data)
}

/** Create an order from the customer's cart, with optional gift recipient. */
export async function createOrder(body: CreateOrderRequest): Promise<OrderResponse> {
  const { data } = await api.post<{ data: OrderResponse }>('/orders', body)
  return (data as any).data || data
}

/** Fetch a single order owned by the customer. */
export async function getOrder(orderId: string): Promise<OrderResponse> {
  const { data } = await api.get<OrderResponse>(`/orders/${orderId}`)
  return (data as any).data || data
}

/** Submit a simulated payment for an order (success/failure). */
export async function payOrder(orderId: string, body: PaymentRequest): Promise<PaymentResultResponse> {
  const { data } = await api.post<PaymentResultResponse>(`/orders/${orderId}/payment`, body)
  return (data as any).data || data
}

/** Cancel a pending order before payment, restoring inventory (Req 15.4). */
export async function cancelOrder(orderId: string): Promise<OrderResponse> {
  const { data } = await api.post<{ data: any }>(`/orders/${orderId}/cancel`, {})
  return (data as any).data || data
}

/** Get VNPay Payment URL for an order */
export async function getVNPayUrl(orderId: string): Promise<string> {
  const { data } = await api.get<{ data: { url: string } }>(`/orders/${orderId}/vnpay`)
  return data.data.url
}

/** Get the Stripe Checkout URL for an order. */
export async function getStripeUrl(orderId: string): Promise<string> {
  const { data } = await api.get<{ data: { url: string } }>(`/orders/${orderId}/stripe`)
  return data.data.url
}

/** Get the PayPal Sandbox approval URL for an order. */
export async function getPayPalUrl(orderId: string): Promise<string> {
  const { data } = await api.get<{ data: { url: string } }>(`/orders/${orderId}/paypal`)
  return data.data.url
}

/** Capture an approved PayPal order and issue voucher codes. */
export async function capturePayPalPayment(orderId: string, paypalOrderId: string): Promise<void> {
  await api.post(`/orders/${orderId}/paypal/capture`, { paypalOrderId })
}

/** Fetch the authenticated customer's payment attempts for one order. */
export async function getOrderPayments(orderId: string): Promise<PaymentTransactionResponse[]> {
  const { data } = await api.get<{ data: PaymentTransactionResponse[] }>(`/orders/${orderId}/payments`)
  return (data as any).data || data
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
