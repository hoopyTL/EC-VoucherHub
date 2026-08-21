/**
 * CartPage — the customer's shopping cart (task 12.2).
 *
 * Lists every cart line with its name, unit price, quantity, line subtotal and
 * the overall cart total (Requirement 13.4). Quantity controls update an item
 * (Requirement 13.2) and a remove button deletes it (Requirement 13.3); both
 * recalculate the totals. When a quantity change exceeds available inventory
 * the backend rejects it and an insufficient-stock message is surfaced inline
 * (Requirement 13.5).
 *
 * Data is managed with TanStack Query. Mutations apply an OPTIMISTIC update so
 * the UI reacts instantly, then reconcile against the authoritative response:
 * every cart endpoint (`PUT`/`DELETE /cart/:id`) returns the full recalculated
 * `CartView`, so `onSuccess` simply writes that into the cache (no extra
 * round-trip needed). On failure the optimistic change is rolled back and the
 * error message is shown next to the affected row.
 *
 * The app shell does not mount a global toast provider, so feedback is rendered
 * as inline `role="alert"` regions rather than via `useToast` (which would
 * throw without its provider).
 *
 * _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
 */
import { useCallback, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../services/api'
import { Button } from '../../components/ui/Button'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { CheckoutProgress } from '../../components/customer/CheckoutProgress'
import { colors, fonts, radius, shadows } from '../../theme/tokens'

/** Maximum quantity of a single voucher allowed per order (mirrors backend). */
export const MAX_QUANTITY_PER_ITEM = 10

/** Query key for the cart resource. */
export const CART_QUERY_KEY = ['cart'] as const

/** A single cart line as returned by the backend (`GET /cart`). */
export interface CartItemView {
  id: string
  voucherId: string
  title: string
  imageUrl?: string | null
  unitPrice: number
  quantity: number
  subtotal: number
}

/** The full cart payload: items plus the recalculated total. */
export interface CartView {
  items: CartItemView[]
  total: number
}

/** Shape of the structured error body returned by the backend error handler. */
interface ApiErrorBody {
  error?: { code?: string; message?: string }
}

/* -------------------------------------------------------------------------- */
/* API helpers (built on the shared Axios client)                             */
/* -------------------------------------------------------------------------- */

import { mapCartData } from '../../services/orders'

async function fetchCart(): Promise<CartView> {
  const { data } = await api.get<{ data: any }>('/cart')
  return mapCartData((data as any).data || data) as unknown as CartView // CartResponse signature matches exactly CartView fields
}

async function putCartItemQuantity(id: string, quantity: number): Promise<CartView> {
  const { data } = await api.patch<{ data: any }>(`/cart/items/${id}`, { quantity })
  return mapCartData((data as any).data || data) as unknown as CartView
}

async function deleteCartItem(id: string): Promise<CartView> {
  const { data } = await api.delete<{ data: any }>(`/cart/items/${id}`)
  return mapCartData((data as any).data || data) as unknown as CartView
}

/* -------------------------------------------------------------------------- */
/* Pure helpers                                                               */
/* -------------------------------------------------------------------------- */

/** Format a numeric amount as a currency string. */
export function formatPrice(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(value)
}

/** Recompute the cart total as the sum of every line subtotal. */
function recalcTotal(items: CartItemView[]): number {
  return items.reduce((sum, item) => sum + item.subtotal, 0)
}

/** Return a new cart with `id`'s quantity (and subtotal/total) updated. */
function withQuantity(cart: CartView, id: string, quantity: number): CartView {
  const items = cart.items.map((item) =>
    item.id === id ? { ...item, quantity, subtotal: item.unitPrice * quantity } : item
  )
  return { items, total: recalcTotal(items) }
}

/** Return a new cart with `id` removed (and the total recalculated). */
function withoutItem(cart: CartView, id: string): CartView {
  const items = cart.items.filter((item) => item.id !== id)
  return { items, total: recalcTotal(items) }
}

/**
 * Derive a user-facing message from a failed cart mutation. The backend returns
 * `{ error: { code, message } }`; its insufficient-stock and max-quantity
 * messages are safe to display directly. Network/unknown errors fall back to a
 * generic message.
 */
export function resolveCartError(err: unknown): string {
  const response = (err as { response?: { data?: ApiErrorBody } })?.response
  const message = response?.data?.error?.message
  if (message) return message
  if (!response) {
    return 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối và thử lại.'
  }
  return 'Không thể cập nhật giỏ hàng. Vui lòng thử lại.'
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export function CartPage() {
  const queryClient = useQueryClient()

  // Per-row error messages (keyed by cart item id) for inline feedback such as
  // insufficient-stock notices (Requirement 13.5).
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})

  const setRowError = useCallback((id: string, message: string | null) => {
    setRowErrors((prev) => {
      if (message === null) {
        if (!(id in prev)) return prev
        const next = { ...prev }
        delete next[id]
        return next
      }
      return { ...prev, [id]: message }
    })
  }, [])

  const {
    data: cart,
    isLoading,
    isError,
    refetch,
    isFetching
  } = useQuery({
    queryKey: CART_QUERY_KEY,
    queryFn: fetchCart
  })

  /**
   * Shared optimistic-mutation wiring: cancel in-flight fetches, snapshot the
   * cache for rollback, and apply `optimistic`. On success the authoritative
   * `CartView` returned by the endpoint replaces the cache; on error we roll
   * back and record the row message.
   */
  const updateMutation = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) => putCartItemQuantity(id, quantity),
    onMutate: async ({ id, quantity }) => {
      setRowError(id, null)
      await queryClient.cancelQueries({ queryKey: CART_QUERY_KEY })
      const previous = queryClient.getQueryData<CartView>(CART_QUERY_KEY)
      if (previous) {
        queryClient.setQueryData<CartView>(CART_QUERY_KEY, withQuantity(previous, id, quantity))
      }
      return { previous }
    },
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(CART_QUERY_KEY, context.previous)
      }
      setRowError(variables.id, resolveCartError(err))
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(CART_QUERY_KEY, data)
      setRowError(variables.id, null)
    }
  })

  const removeMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => deleteCartItem(id),
    onMutate: async ({ id }) => {
      setRowError(id, null)
      await queryClient.cancelQueries({ queryKey: CART_QUERY_KEY })
      const previous = queryClient.getQueryData<CartView>(CART_QUERY_KEY)
      if (previous) {
        queryClient.setQueryData<CartView>(CART_QUERY_KEY, withoutItem(previous, id))
      }
      return { previous }
    },
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(CART_QUERY_KEY, context.previous)
      }
      setRowError(variables.id, resolveCartError(err))
    },
    onSuccess: (data) => {
      queryClient.setQueryData(CART_QUERY_KEY, data)
    }
  })

  const changeQuantity = useCallback(
    (item: CartItemView, nextQuantity: number) => {
      if (nextQuantity < 1 || nextQuantity > MAX_QUANTITY_PER_ITEM) return
      if (nextQuantity === item.quantity) return
      updateMutation.mutate({ id: item.id, quantity: nextQuantity })
    },
    [updateMutation]
  )

  const removeItem = useCallback(
    (item: CartItemView) => {
      removeMutation.mutate({ id: item.id })
    },
    [removeMutation]
  )

  /* ----------------------------- Render states ---------------------------- */

  if (isLoading) {
    return (
      <section style={sectionStyle}>
        <h1 style={headingStyle}>Giỏ hàng</h1>
        <LoadingSpinner label='Đang tải giỏ hàng' />
      </section>
    )
  }

  if (isError || !cart) {
    return (
      <section style={sectionStyle}>
        <h1 style={headingStyle}>Giỏ hàng</h1>
        <div role='alert' style={alertStyle}>
          Không thể tải giỏ hàng. Vui lòng thử lại.
        </div>
        <Button variant='secondary' onClick={() => refetch()}>
          Thử lại
        </Button>
      </section>
    )
  }

  if (cart.items.length === 0) {
    return (
      <section style={sectionStyle}>
        <h1 style={headingStyle}>Giỏ hàng</h1>
        <p style={{ color: colors.slate }}>Giỏ hàng của bạn đang trống.</p>
        <Link to='/search' style={browseLinkStyle}>
          Khám phá voucher
        </Link>
      </section>
    )
  }

  return (
    <section style={sectionStyle}>
      <CheckoutProgress current='cart' />
      <h1 style={headingStyle}>Giỏ hàng</h1>

      <ul style={listStyle}>
        {cart.items.map((item) => {
          const rowError = rowErrors[item.id]
          const isUpdatingRow = updateMutation.isPending && updateMutation.variables?.id === item.id
          const isRemovingRow = removeMutation.isPending && removeMutation.variables?.id === item.id
          const rowBusy = isUpdatingRow || isRemovingRow

          return (
            <li key={item.id} style={rowStyle} data-testid={`cart-item-${item.id}`}>
              <div style={thumbnailStyle}>
                <span>VH</span>
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt=''
                    style={thumbnailImageStyle}
                    onError={(event) => {
                      event.currentTarget.style.display = 'none'
                    }}
                  />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={titleStyle}>{item.title}</p>
                <p style={metaStyle}>
                  Đơn giá: <span data-testid={`unit-price-${item.id}`}>{formatPrice(item.unitPrice)}</span>
                </p>
              </div>

              <div style={quantityControlStyle}>
                <Button
                  size='sm'
                  variant='secondary'
                  aria-label={`Giảm số lượng ${item.title}`}
                  disabled={rowBusy || item.quantity <= 1}
                  onClick={() => changeQuantity(item, item.quantity - 1)}
                >
                  −
                </Button>
                <span
                  aria-label={`Số lượng ${item.title}`}
                  data-testid={`quantity-${item.id}`}
                  style={quantityValueStyle}
                >
                  {item.quantity}
                </span>
                <Button
                  size='sm'
                  variant='secondary'
                  aria-label={`Tăng số lượng ${item.title}`}
                  disabled={rowBusy || item.quantity >= MAX_QUANTITY_PER_ITEM}
                  onClick={() => changeQuantity(item, item.quantity + 1)}
                >
                  +
                </Button>
              </div>

              <div style={subtotalStyle} data-testid={`subtotal-${item.id}`}>
                {formatPrice(item.subtotal)}
              </div>

              <Button
                size='sm'
                variant='danger'
                aria-label={`Xóa ${item.title} khỏi giỏ hàng`}
                isLoading={isRemovingRow}
                disabled={rowBusy}
                onClick={() => removeItem(item)}
              >
                Xóa
              </Button>

              {rowError && (
                <p role='alert' style={rowErrorStyle}>
                  {rowError}
                </p>
              )}
            </li>
          )
        })}
      </ul>

      <div style={footerStyle}>
        <div style={{ fontSize: 16 }}>
          <span style={{ color: colors.slate, marginRight: 8 }}>Tổng giỏ hàng</span>
          <strong data-testid='cart-total'>{formatPrice(cart.total)}</strong>
          {isFetching && (
            <span style={{ marginLeft: 10, verticalAlign: 'middle' }}>
              <LoadingSpinner size='sm' inline label='Đang cập nhật giỏ hàng' />
            </span>
          )}
        </div>
        <Link to='/checkout' style={{ textDecoration: 'none' }}>
          <Button>Tiến hành thanh toán</Button>
        </Link>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                     */
/* -------------------------------------------------------------------------- */

const sectionStyle: CSSProperties = {
  maxWidth: 760,
  margin: '0 auto'
}

const headingStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 16,
  fontFamily: fonts.display,
  fontSize: 40,
  fontWeight: 800,
  letterSpacing: '-0.03em',
  color: colors.ink
}

const browseLinkStyle: CSSProperties = {
  color: colors.ink,
  fontWeight: 600
}

const listStyle: CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 12
}

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  flexWrap: 'wrap',
  padding: '18px 20px',
  border: `1px solid ${colors.hairline}`,
  borderRadius: radius.xl,
  background: colors.surface,
  boxShadow: shadows.card
}

const thumbnailStyle: CSSProperties = {
  position: 'relative',
  width: 88,
  height: 66,
  flexShrink: 0,
  display: 'grid',
  placeItems: 'center',
  overflow: 'hidden',
  borderRadius: radius.lg,
  background: colors.ink,
  color: colors.onInk,
  fontFamily: fonts.display,
  fontWeight: 800
}

const thumbnailImageStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover'
}

const titleStyle: CSSProperties = {
  margin: 0,
  fontWeight: 600,
  fontFamily: fonts.display,
  color: colors.ink,
  overflow: 'hidden',
  textOverflow: 'ellipsis'
}

const metaStyle: CSSProperties = {
  margin: '4px 0 0',
  fontSize: 13,
  color: colors.slate
}

const quantityControlStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8
}

const quantityValueStyle: CSSProperties = {
  minWidth: 24,
  textAlign: 'center',
  fontVariantNumeric: 'tabular-nums',
  fontWeight: 600,
  color: colors.ink
}

const subtotalStyle: CSSProperties = {
  minWidth: 90,
  textAlign: 'right',
  fontWeight: 700,
  color: colors.ink
}

const footerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  marginTop: 24,
  paddingTop: 20,
  borderTop: `1px solid ${colors.hairline}`,
  flexWrap: 'wrap'
}

const alertStyle: CSSProperties = {
  marginBottom: 16,
  padding: '12px 16px',
  borderRadius: radius.md,
  background: colors.dangerSurface,
  border: `1px solid ${colors.dangerSurface}`,
  color: colors.onDangerSurface,
  fontSize: 14
}

const rowErrorStyle: CSSProperties = {
  flexBasis: '100%',
  margin: '4px 0 0',
  fontSize: 13,
  color: colors.onDangerSurface
}

export default CartPage
