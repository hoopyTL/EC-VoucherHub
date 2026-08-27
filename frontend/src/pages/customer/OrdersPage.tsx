/**
 * OrdersPage — customer order history list (task 12.4, Req 17 / PAGE-10).
 *
 * Fetches the authenticated customer's orders (GET /orders, newest first) with
 * TanStack Query and renders each as a clickable row showing the order id,
 * date, item count, total and a status badge. Selecting a row navigates to the
 * order detail page.
 *
 * States handled: loading (spinner), error (inline alert), empty (call to
 * action to browse vouchers), and the populated list.
 *
 * _Requirements: 17.1_
 */
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { useContext, useEffect, useState, useRef, type CSSProperties } from 'react'
import { api } from '../../services/api'
import type { Order } from '../../types/customer'
import { Badge, ConfirmDialog, ContentSkeleton, variantForStatus } from '../../components/ui'
import { formatCurrency, formatDate, formatStatus } from '../../utils/format'
import { colors, fonts, radius, shadows } from '../../theme/tokens'
import { AuthContext } from '../../store/AuthContext'
import { CalendarDays, ChevronRight, PackageCheck, ReceiptText } from 'lucide-react'

/** Fetch the customer's orders (newest first per the backend ordering). */
async function fetchOrders(view: string, cursor?: string): Promise<{ items: Order[]; nextCursor: string | null }> {
  const params: Record<string, any> = { limit: 20 }
  if (cursor) params.cursor = cursor
  if (view === 'processing') params.status = 'PENDING_PAYMENT'
  else if (view === 'purchased') params.status = 'PAID'
  else if (view === 'history') params.status = 'CANCELLED,REFUNDED'
  const { data } = await api.get<any>('/orders', { params })
  const unwrapped = (data as any).data || data
  return { items: unwrapped.items || [], nextCursor: unwrapped.nextCursor ?? null }
}

/** Total number of voucher units in an order (sum of line quantities). */
function itemCount(order: Order): number {
  return (order.items || order.orderItems || []).reduce((sum, item) => sum + item.quantity, 0)
}

export type OrderHistoryView = 'processing' | 'purchased' | 'history' | 'all'

export function OrdersPage({ view = 'all' }: { view?: OrderHistoryView }) {
  const navigate = useNavigate()
  const auth = useContext(AuthContext)
  const [cursor, setCursor] = useState<string | undefined>(undefined)
  const [history, setHistory] = useState<string[]>([])
  const [logoutOpen, setLogoutOpen] = useState(false)
  const lastDataRef = useRef<{ items: Order[]; nextCursor: string | null } | null>(null)

  type OrdersResult = { items: Order[]; nextCursor: string | null }
  const { data, isLoading, isError, isFetching } = useQuery<OrdersResult, Error, OrdersResult, (string | undefined)[]>({
    queryKey: ['orders', view, cursor],
    queryFn: () => fetchOrders(view, cursor),
    placeholderData: () => lastDataRef.current ?? undefined
  })

  useEffect(() => {
    if (data) lastDataRef.current = data
  }, [data])

  useEffect(() => {
    // reset pagination when view changes
    setCursor(undefined)
    setHistory([])
    lastDataRef.current = null
  }, [view])

  const visibleOrders = data?.items ?? []

  const heading =
    view === 'processing'
      ? 'Đơn chờ thanh toán'
      : view === 'purchased'
        ? 'Voucher đã mua'
        : view === 'history'
          ? 'Đơn đã hủy & hoàn tiền'
          : 'Lịch sử mua voucher'

  const initials = (auth?.user?.name ?? 'N').trim().charAt(0).toLocaleUpperCase('vi') || 'N'

  return (
    <section className='customer-orders-view customer-orders-page customer-account-layout'>
      <aside className='customer-account-sidebar' aria-label='Khu vực tài khoản'>
        <div aria-hidden='true' className='customer-account-avatar' style={avatarStyle}>
          {initials}
        </div>
        <strong>Tài khoản của tôi</strong>
        <p>Quản lý thông tin, lịch sử mua hàng và voucher của bạn.</p>
        <nav aria-label='Điều hướng tài khoản'>
          <Link to='/profile'>Thông tin tài khoản</Link>
          <Link className='is-current' to='/orders'>
            Lịch sử mua hàng
          </Link>
          <Link to='/my-vouchers'>Voucher của tôi</Link>
          <Link to='/profile?tab=security'>Đổi mật khẩu</Link>
        </nav>
        <button type='button' className='customer-account-logout' onClick={() => setLogoutOpen(true)}>
          Đăng xuất
        </button>
      </aside>
      <div className='customer-account-content'>
        <header className='purchase-history-hero'>
          <div>
            <span>
              <ReceiptText size={18} /> Tài khoản khách hàng
            </span>
            <h1 style={pageHeadingStyle}>{heading}</h1>
            <p>Theo dõi trạng thái, giá trị và xem chi tiết các voucher bạn đã mua.</p>
          </div>
          <div className='purchase-history-stat'>
            <PackageCheck size={24} />
            <span>
              <strong>{visibleOrders.length}</strong>
              <small>đơn trên trang này</small>
            </span>
          </div>
        </header>

        <nav className='purchase-history-filters' aria-label='Lọc lịch sử mua hàng'>
          <Link className={view === 'all' ? 'is-current' : ''} to='/cart?tab=orders'>
            Tất cả
          </Link>
          <Link className={view === 'processing' ? 'is-current' : ''} to='/cart?tab=processing'>
            Chờ thanh toán
          </Link>
          <Link className={view === 'purchased' ? 'is-current' : ''} to='/cart?tab=purchased'>
            Đã mua
          </Link>
          <Link className={view === 'history' ? 'is-current' : ''} to='/cart?tab=history'>
            Đã hủy & hoàn tiền
          </Link>
        </nav>

        {isLoading && (
          <div style={{ padding: 32 }}>
            <ContentSkeleton rows={5} label='Đang tải đơn hàng' />
          </div>
        )}

        {isError && (
          <div role='alert' style={alertStyle}>
            Không thể tải đơn hàng. Vui lòng thử lại sau.
          </div>
        )}

        {!isLoading && !isError && visibleOrders.length === 0 && (
          <div style={emptyStyle}>
            <p style={{ margin: 0 }}>Bạn chưa có đơn hàng nào trong nhóm này.</p>
            <Link to='/search' style={linkStyle}>
              Khám phá voucher →
            </Link>
          </div>
        )}

        {!isLoading && !isError && visibleOrders.length > 0 && (
          <ul className='customer-order-list' style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            <li className='customer-order-list__header' aria-hidden='true'>
              <span>Đơn hàng</span>
              <span>Ngày mua</span>
              <span>Sản phẩm</span>
              <span>Tổng tiền</span>
              <span>Trạng thái</span>
              <span>Thao tác</span>
            </li>
            {visibleOrders.map((order) => (
              <li key={order.id}>
                <button
                  type='button'
                  className='customer-order-row'
                  onClick={() => navigate(`/orders/${order.id}`)}
                  style={rowStyle}
                  aria-label={`Xem đơn hàng ${order.id}`}
                >
                  <span className='order-code'>
                    <ReceiptText size={18} />
                    <span>
                      <strong>Đơn #{order.id.slice(0, 8).toUpperCase()}</strong>
                      <small>Mã đơn hàng</small>
                    </span>
                  </span>
                  <span className='order-date'>
                    <CalendarDays size={16} />
                    {formatDate(order.createdAt)}
                  </span>
                  <span className='order-items'>{itemCount(order)} voucher</span>
                  <span className='order-total'>{formatCurrency(order.totalAmount)}</span>
                  <span className='order-status'>
                    <Badge variant={variantForStatus(order.status)}>{formatStatus(order.status)}</Badge>
                  </span>
                  <span className='order-action'>
                    Xem chi tiết <ChevronRight size={16} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {!isLoading && !isError && (
          <div
            className='customer-order-pagination'
            style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}
          >
            <button
              type='button'
              onClick={() => {
                const prev = history.pop()
                setHistory([...history])
                setCursor(prev)
              }}
              disabled={history.length === 0}
            >
              ← Trang trước
            </button>
            <button
              type='button'
              onClick={() => {
                if (data?.nextCursor) {
                  setHistory((h) => [...h, cursor ?? ''])
                  setCursor(data.nextCursor ?? undefined)
                }
              }}
              disabled={!data?.nextCursor}
            >
              Trang sau {isFetching ? '…' : '→'}
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={logoutOpen}
        title='Đăng xuất VoucherHub?'
        message='Bạn có chắc muốn kết thúc phiên đăng nhập trên thiết bị này không?'
        cancelLabel='Ở lại'
        confirmLabel='Đăng xuất'
        danger
        onCancel={() => setLogoutOpen(false)}
        onConfirm={() => {
          setLogoutOpen(false)
          auth?.logout()
        }}
      />
    </section>
  )
}

const avatarStyle: CSSProperties = {
  display: 'grid',
  width: 46,
  height: 46,
  margin: '0 0 10px',
  placeItems: 'center',
  borderRadius: '50%',
  background: '#ede9fe',
  color: '#4338ca',
  fontWeight: 900
}

const pageHeadingStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 20,
  fontFamily: fonts.display,
  fontSize: 40,
  fontWeight: 800,
  letterSpacing: '-0.03em',
  color: colors.ink
}

const linkStyle: CSSProperties = {
  color: colors.ink,
  fontWeight: 600
}

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  padding: '18px 20px',
  marginBottom: 12,
  background: colors.surface,
  border: `1px solid ${colors.hairline}`,
  borderRadius: radius.xl,
  boxShadow: shadows.card,
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 14,
  color: colors.ink,
  textAlign: 'left'
}

const alertStyle: CSSProperties = {
  padding: '12px 16px',
  borderRadius: radius.md,
  background: colors.dangerSurface,
  border: `1px solid ${colors.dangerSurface}`,
  color: colors.onDangerSurface,
  fontSize: 14
}

const emptyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 8,
  padding: 40,
  background: colors.surface,
  border: `1px solid ${colors.hairline}`,
  borderRadius: radius.xl,
  boxShadow: shadows.card,
  color: colors.ink
}

export default OrdersPage
