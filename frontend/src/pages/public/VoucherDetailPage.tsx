/**
 * VoucherDetailPage — public voucher detail view (task 12.1).
 *
 * Fetches a single voucher via TanStack Query (keyed on the route id) and shows
 * all the information required by Requirement 12: title, description, original
 * & sale price, discount percentage, sale period, usage period, applicable
 * branches, remaining quantity, partner name and terms & conditions.
 *
 * A 404 from the backend (voucher missing or not published) renders a friendly
 * "not found" state with a link back to the catalogue.
 *
 * _Requirements: 12.1, 12.2, 11.1_
 */
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../components/ui/Button'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { useToast } from '../../components/ui'
import { PriceDisplay } from '../../components/voucher/PriceDisplay'
import { FlashSaleBadge } from '../../components/voucher/FlashSaleBadge'
import { ReviewSection } from '../../components/voucher/ReviewSection'
import { VoucherImage } from '../../components/voucher/VoucherImage'
import { formatDateRange } from '../../utils/format'
import { useAuth } from '../../hooks/useAuth'
import { addToCart, prepareBuyNow } from '../../services/orders'
import { saveCheckoutSelection } from '../../services/checkout-selection'
import { getVoucherDetail, type VoucherDetailResponse } from '../../services/voucher.service'
import { colors, fonts, radius, shadows } from '../../theme/tokens'

/** Per-voucher cart quantity ceiling (mirrors the backend limit). */
const MAX_QUANTITY = 10

/** Returns true when the error represents a 404 (voucher not found/published). */
function isNotFound(error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status
  return status === 404
}

/** Structured backend error body. */
interface ApiErrorBody {
  error?: { code?: string; message?: string }
}

/** Derive a user-facing message from a failed add-to-cart call. */
function resolveAddToCartError(err: unknown): string {
  const response = (err as { response?: { data?: ApiErrorBody } })?.response
  const message = response?.data?.error?.message
  if (message) return message
  if (!response) {
    return 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối và thử lại.'
  }
  return 'Không thể thêm voucher vào giỏ hàng. Vui lòng thử lại.'
}

const sectionTitleStyle: CSSProperties = {
  margin: '0 0 10px',
  fontFamily: fonts.display,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: colors.slate
}

const cardStyle: CSSProperties = {
  padding: 24,
  borderRadius: radius.xl,
  border: `1px solid ${colors.hairline}`,
  background: colors.surface,
  boxShadow: shadows.card
}

const bodyTextStyle: CSSProperties = {
  margin: 0,
  color: colors.slate,
  fontFamily: fonts.body,
  lineHeight: 1.6
}

const purchasePanelStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: 16,
  padding: 24,
  borderRadius: radius.xl,
  border: `1px solid ${colors.hairline}`,
  background: colors.surface,
  boxShadow: 'none',
  position: 'sticky',
  top: 96,
  alignSelf: 'start',
  maxHeight: 'calc(100vh - 120px)',
  overflow: 'visible'
}

const stepperStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  border: `1px solid ${colors.hairline}`,
  borderRadius: radius.md,
  overflow: 'hidden'
}

const stepperBtnStyle = (disabled: boolean): CSSProperties => ({
  width: 38,
  height: 38,
  border: 'none',
  background: colors.surface,
  color: disabled ? colors.slateMuted : colors.ink,
  fontSize: 20,
  lineHeight: 1,
  cursor: disabled ? 'not-allowed' : 'pointer'
})

const qtyValueStyle: CSSProperties = {
  minWidth: 40,
  textAlign: 'center',
  fontFamily: fonts.display,
  fontSize: 16,
  fontWeight: 700,
  color: colors.ink
}

export function VoucherDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { isAuthenticated, user } = useAuth()

  const [quantity, setQuantity] = useState(1)
  const addAnimationOrigin = useRef<{ x: number; y: number; imageUrl?: string | null } | null>(null)

  function animateVoucherToCart() {
    const origin = addAnimationOrigin.current
    const cartTarget = document.querySelector<HTMLElement>('.customer-header__cart')
    if (!origin || !cartTarget || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const target = cartTarget.getBoundingClientRect()
    const flyer = document.createElement(origin.imageUrl ? 'img' : 'span')
    flyer.className = 'voucher-add-to-cart-flyer'
    if (flyer instanceof HTMLImageElement && origin.imageUrl) {
      flyer.src = origin.imageUrl
      flyer.alt = ''
    } else {
      flyer.textContent = 'VH'
    }
    flyer.style.left = `${origin.x - 28}px`
    flyer.style.top = `${origin.y - 28}px`
    document.body.appendChild(flyer)

    const translateX = target.left + target.width / 2 - origin.x
    const translateY = target.top + target.height / 2 - origin.y
    const flight = flyer.animate(
      [
        { transform: 'translate3d(0,0,0) scale(1)', opacity: 1 },
        {
          transform: `translate3d(${translateX * 0.48}px, ${translateY * 0.24 - 70}px, 0) scale(.82)`,
          opacity: 0.96,
          offset: 0.46
        },
        { transform: `translate3d(${translateX}px, ${translateY}px, 0) scale(.2)`, opacity: 0.2 }
      ],
      { duration: 720, easing: 'cubic-bezier(.22,.75,.2,1)', fill: 'forwards' }
    )
    flight.onfinish = () => {
      flyer.remove()
      cartTarget.classList.remove('is-cart-bumping')
      void cartTarget.offsetWidth
      cartTarget.classList.add('is-cart-bumping')
      window.setTimeout(() => cartTarget.classList.remove('is-cart-bumping'), 520)
    }
  }

  const query = useQuery<VoucherDetailResponse>({
    queryKey: ['voucher', id],
    queryFn: () => getVoucherDetail(id as string),
    enabled: Boolean(id)
  })

  const addMutation = useMutation({
    mutationFn: (qty: number) => addToCart(id as string, qty),
    onSuccess: (cart) => {
      // Refresh any cart views with the authoritative server response.
      queryClient.setQueryData(['cart'], cart)
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      animateVoucherToCart()
    },
    onError: (err) => {
      toast.error(resolveAddToCartError(err))
    }
  })

  const buyNowMutation = useMutation({
    mutationFn: (qty: number) => prepareBuyNow(id as string, qty),
    onSuccess: ({ cart, cartItemId }) => {
      queryClient.setQueryData(['cart'], cart)
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      saveCheckoutSelection([cartItemId])
      navigate('/checkout')
    },
    onError: (err) => {
      toast.error(resolveAddToCartError(err))
    }
  })

  if (query.isLoading) {
    return (
      <div style={{ padding: '64px 0' }}>
        <LoadingSpinner size='lg' label='Đang tải voucher' />
      </div>
    )
  }

  if (query.isError) {
    const notFound = isNotFound(query.error)
    return (
      <section style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ marginTop: 0 }}>{notFound ? 'Không tìm thấy voucher' : 'Đã xảy ra lỗi'}</h1>
        <p style={{ color: colors.slate }}>
          {notFound
            ? 'Voucher này không còn được bán hoặc không tồn tại.'
            : 'Không thể tải thông tin voucher. Vui lòng thử lại.'}
        </p>
        <Link to='/search' style={{ color: colors.ink, fontWeight: 600 }}>
          ← Quay lại tìm kiếm
        </Link>
      </section>
    )
  }

  const voucher = query.data!
  const activeBranches = voucher.voucherBranches.map((vb) => vb.branch).filter((branch) => branch.isActive)

  const remaining = voucher.remainingQuantity
  const soldOut = remaining <= 0
  // Customers buy; an authenticated non-customer (partner/admin) cannot.
  const isCustomer = !isAuthenticated || user?.role === 'CUSTOMER'
  const maxSelectable = Math.min(MAX_QUANTITY, Math.max(remaining, 0))

  // Flash sale: when active, the effective price replaces the sale price in the
  // header (original stays struck-through; discount re-derived from prices).
  const flashActive = Boolean(voucher.flashSale?.active && voucher.flashSale.flashSaleEnd)
  const effectiveSalePrice = flashActive ? (voucher.flashSale!.effectivePrice as number) : voucher.salePrice

  function handleAddToCart(event: ReactMouseEvent<HTMLButtonElement>) {
    // Gate on auth: send guests to login, returning here afterwards (PAGE-03).
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/vouchers/${voucher.id}` } } })
      return
    }
    const source = event.currentTarget.getBoundingClientRect()
    addAnimationOrigin.current = {
      x: source.left + source.width / 2,
      y: source.top + source.height / 2,
      imageUrl: voucher.imageUrl
    }
    addMutation.mutate(quantity)
  }

  function handleBuyNow() {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/vouchers/${voucher.id}` } } })
      return
    }
    buyNowMutation.mutate(quantity)
  }

  return (
    <article
      className='voucher-detail-layout'
      style={{
        gap: 20,
        maxWidth: 1180,
        margin: '0 auto'
      }}
    >
      <nav className='voucher-detail-nav'>
        <Link to='/search' style={{ fontSize: 13, fontFamily: fonts.display, fontWeight: 600, color: colors.slate }}>
          ← Quay lại tìm kiếm
        </Link>
      </nav>

      <header className='voucher-detail-summary' style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div
          className='voucher-detail-brand-row'
          style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 8,
              background: colors.accent,
              color: colors.onAccent,
              fontSize: 14,
              fontWeight: 800
            }}
          >
            {voucher.partner.businessName.charAt(0).toUpperCase()}
          </div>
          <span style={{ fontSize: 20, fontWeight: 800, fontFamily: fonts.display, color: colors.ink }}>
            {voucher.partner.businessName}
          </span>
          <span aria-hidden='true' style={{ color: '#9ca3af', fontSize: 18 }}>
            •
          </span>
          <span style={{ fontSize: 12, color: colors.slate, fontWeight: 600 }}>Mã voucher</span>
        </div>

        <h1
          style={{
            margin: 0,
            fontFamily: fonts.display,
            fontSize: 'clamp(28px, 2.5vw, 40px)',
            fontWeight: 800,
            letterSpacing: '-0.04em',
            lineHeight: 1.08,
            color: colors.ink
          }}
        >
          {voucher.title}
        </h1>

        <div
          className='voucher-detail-score-row'
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            color: colors.slate,
            fontSize: 13
          }}
        >
          <span style={{ color: '#f59e0b', letterSpacing: '0.12em', fontSize: 18 }}>★★★★★</span>
          <span style={{ fontWeight: 700, color: colors.ink }}>4.9/5</span>
          <span>·</span>
          <span>2.345 đánh giá</span>
        </div>

        {flashActive && (
          <div>
            <FlashSaleBadge endsAt={voucher.flashSale!.flashSaleEnd as string} onExpire={() => query.refetch()} />
          </div>
        )}

        <div className='voucher-detail-price-box' style={{ display: 'grid', gap: 10 }}>
          <PriceDisplay
            originalPrice={voucher.originalPrice}
            salePrice={effectiveSalePrice}
            discountPercentage={flashActive ? undefined : voucher.discountPercentage}
            size='lg'
          />
        </div>

        <div
          className='voucher-detail-feature-grid'
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}
        >
          <div
            style={{
              display: 'grid',
              gap: 6,
              padding: '12px 14px',
              borderRadius: 12,
              background: '#f7f8ff',
              border: `1px solid ${colors.hairline}`
            }}
          >
            <span style={{ fontSize: 12, color: colors.slate }}>Giảm đến</span>
            <strong style={{ fontSize: 18, fontFamily: fonts.display, color: colors.accentHover }}>
              {voucher.discountPercentage}%
            </strong>
          </div>
          <div
            style={{
              display: 'grid',
              gap: 6,
              padding: '12px 14px',
              borderRadius: 12,
              background: '#f7f8ff',
              border: `1px solid ${colors.hairline}`
            }}
          >
            <span style={{ fontSize: 12, color: colors.slate }}>Giá trị</span>
            <strong style={{ fontSize: 18, fontFamily: fonts.display, color: colors.ink }}>
              {Number(voucher.salePrice).toLocaleString('vi-VN')}đ
            </strong>
          </div>
          <div
            style={{
              display: 'grid',
              gap: 6,
              padding: '12px 14px',
              borderRadius: 12,
              background: '#f7f8ff',
              border: `1px solid ${colors.hairline}`
            }}
          >
            <span style={{ fontSize: 12, color: colors.slate }}>Còn lại</span>
            <strong style={{ fontSize: 18, fontFamily: fonts.display, color: colors.ink }}>
              {voucher.remainingQuantity}
            </strong>
          </div>
        </div>
      </header>

      {/* Purchase panel — quantity selector + add to cart (Req 13.1) */}
      <section
        className='voucher-detail-purchase'
        style={{ ...purchasePanelStyle, display: 'flex', flexDirection: 'column', gap: 18 }}
        aria-label='Mua voucher'
      >
        <h3 style={{ margin: 0, fontSize: 22, fontFamily: fonts.display, fontWeight: 800, color: colors.ink }}>
          Thông tin mua voucher
        </h3>
        {isCustomer ? (
          <>
            <div style={{ display: 'grid', gap: 8 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: '#f7f8ff',
                  border: `1px solid ${colors.hairline}`
                }}
              >
                <span style={{ fontSize: 13, color: colors.slate }}>Giảm 50%</span>
                <strong style={{ fontSize: 18, fontFamily: fonts.display, color: colors.ink }}>
                  {Number(voucher.salePrice).toLocaleString('vi-VN')}đ
                </strong>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: '#f7f8ff',
                  border: `1px solid ${colors.hairline}`
                }}
              >
                <span style={{ fontSize: 13, color: colors.slate }}>Tối đa</span>
                <strong style={{ fontSize: 18, fontFamily: fonts.display, color: colors.ink }}>
                  {Number(voucher.originalPrice).toLocaleString('vi-VN')}đ
                </strong>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: colors.slate, fontWeight: 700 }}>Số lượng</span>
              <div style={stepperStyle}>
                <button
                  type='button'
                  aria-label='Giảm số lượng'
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={soldOut || quantity <= 1}
                  style={stepperBtnStyle(soldOut || quantity <= 1)}
                >
                  −
                </button>
                <span aria-live='polite' style={qtyValueStyle}>
                  {soldOut ? 0 : quantity}
                </span>
                <button
                  type='button'
                  aria-label='Tăng số lượng'
                  onClick={() => setQuantity((q) => Math.min(maxSelectable, q + 1))}
                  disabled={soldOut || quantity >= maxSelectable}
                  style={stepperBtnStyle(soldOut || quantity >= maxSelectable)}
                >
                  +
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
              <Button
                variant='primary'
                size='lg'
                disabled={soldOut || buyNowMutation.isPending}
                isLoading={buyNowMutation.isPending}
                onClick={handleBuyNow}
              >
                {soldOut ? 'Hết hàng' : 'Mua ngay'}
              </Button>
              <Button
                variant='secondary'
                size='lg'
                disabled={soldOut || addMutation.isPending}
                isLoading={addMutation.isPending}
                onClick={handleAddToCart}
              >
                {soldOut ? 'Hết hàng' : 'Thêm vào giỏ'}
              </Button>
            </div>
          </>
        ) : (
          <p style={{ ...bodyTextStyle, fontSize: 14 }}>
            Tài khoản vai trò {user?.role?.toLowerCase()} không thể mua voucher. Chỉ khách hàng được phép mua.
          </p>
        )}
      </section>

      {voucher.imageUrl && (
        <div
          className='voucher-detail-media'
          style={{
            borderRadius: radius.xl,
            overflow: 'hidden',
            border: `1px solid ${colors.hairline}`,
            boxShadow: shadows.card,
            background: colors.surfaceMuted
          }}
        >
          <VoucherImage
            src={voucher.imageUrl}
            alt={voucher.title}
            style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      )}

      <section className='voucher-detail-description' style={cardStyle}>
        <h2 style={sectionTitleStyle}>Mô tả</h2>
        <p style={{ ...bodyTextStyle, whiteSpace: 'pre-line' }}>{voucher.description}</p>
      </section>

      <div
        className='voucher-detail-facts'
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16
        }}
      >
        <section style={cardStyle}>
          <h2 style={sectionTitleStyle}>Thời gian mở bán</h2>
          <p style={bodyTextStyle}>{formatDateRange(voucher.salePeriodStart, voucher.salePeriodEnd)}</p>
        </section>

        <section style={cardStyle}>
          <h2 style={sectionTitleStyle}>Thời gian sử dụng</h2>
          <p style={bodyTextStyle}>{formatDateRange(voucher.usagePeriodStart, voucher.usagePeriodEnd)}</p>
        </section>

        <section style={cardStyle}>
          <h2 style={sectionTitleStyle}>Số lượng còn lại</h2>
          <p style={bodyTextStyle}>
            {voucher.remainingQuantity} / {voucher.totalQuantity}
          </p>
        </section>
      </div>

      <section className='voucher-detail-wide' style={cardStyle}>
        <h2 style={sectionTitleStyle}>Chi nhánh áp dụng</h2>
        {activeBranches.length === 0 ? (
          <p style={bodyTextStyle}>Voucher chưa có chi nhánh đang hoạt động.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18, ...bodyTextStyle }}>
            {activeBranches.map((branch) => (
              <li key={branch.id} style={{ marginBottom: 6 }}>
                <strong style={{ color: colors.ink }}>{branch.name}</strong> — {branch.address} ({branch.region})
                {branch.contact ? `, ${branch.contact}` : ''}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className='voucher-detail-wide' style={cardStyle}>
        <h2 style={sectionTitleStyle}>Điều khoản và điều kiện</h2>
        <p style={{ ...bodyTextStyle, whiteSpace: 'pre-line' }}>
          {voucher.terms?.trim() ? voucher.terms : 'Voucher chưa có điều khoản và điều kiện riêng.'}
        </p>
      </section>

      <ReviewSection voucherId={voucher.id} voucherTitle={voucher.title} />
    </article>
  )
}

export default VoucherDetailPage
