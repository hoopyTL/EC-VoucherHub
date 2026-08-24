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
import { useState, type CSSProperties } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { useToast } from '../../components/ui'
import { PriceDisplay } from '../../components/voucher/PriceDisplay'
import { FlashSaleBadge } from '../../components/voucher/FlashSaleBadge'
import { ReviewSection } from '../../components/voucher/ReviewSection'
import { formatDateRange } from '../../utils/format'
import { useAuth } from '../../hooks/useAuth'
import { addToCart, prepareBuyNow } from '../../services/orders'
import { saveCheckoutSelection } from '../../services/checkout-selection'
import { getVoucherDetail, type VoucherDetailResponse } from '../../services/voucher.service'
import { colors, fonts, radius, shadows } from '../../theme/tokens'

/** Per-voucher cart quantity ceiling (mirrors the backend limit). */
const MAX_QUANTITY = 10

/** Resolve the same cell from the demo catalogue sprite that VoucherCard uses. */
function spritePosition(imageUrl: string): string {
  const cell = Number(new URL(imageUrl, window.location.origin).searchParams.get('cell'))
  if (!Number.isFinite(cell) || cell < 0) return '0% 0%'
  return `${((cell % 10) * 100) / 9}% ${(Math.floor(cell / 10) * 100) / 6}%`
}

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
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: 16,
  padding: 24,
  borderRadius: radius.xl,
  border: `1px solid ${colors.hairline}`,
  background: colors.surface,
  boxShadow: shadows.card
}

const qtyLabelStyle: CSSProperties = {
  fontFamily: fonts.display,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: colors.slate
}

const stepperStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  border: `1px solid ${colors.hairline}`,
  borderRadius: radius.full,
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
      toast.success('Added to your cart.')
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

  function handleAddToCart() {
    // Gate on auth: send guests to login, returning here afterwards (PAGE-03).
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/vouchers/${voucher.id}` } } })
      return
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

      <header className='voucher-detail-summary' style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Badge variant='info'>{voucher.category}</Badge>
          <Badge variant={voucher.remainingQuantity > 0 ? 'success' : 'neutral'}>
            {voucher.remainingQuantity > 0 ? `Còn ${voucher.remainingQuantity}` : 'Hết hàng'}
          </Badge>
        </div>

        <h1
          style={{
            margin: 0,
            fontFamily: fonts.display,
            fontSize: 'clamp(32px, 5vw, 56px)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
            color: colors.ink
          }}
        >
          {voucher.title}
        </h1>
        <p style={{ margin: 0, color: colors.slate, fontFamily: fonts.body }}>
          Cung cấp bởi <strong style={{ color: colors.ink }}>{voucher.partner.businessName}</strong>
        </p>

        {flashActive && (
          <div>
            <FlashSaleBadge endsAt={voucher.flashSale!.flashSaleEnd as string} onExpire={() => query.refetch()} />
          </div>
        )}

        <PriceDisplay
          originalPrice={voucher.originalPrice}
          salePrice={effectiveSalePrice}
          discountPercentage={flashActive ? undefined : voucher.discountPercentage}
          size='lg'
        />
      </header>

      {/* Purchase panel — quantity selector + add to cart (Req 13.1) */}
      <section className='voucher-detail-purchase' style={purchasePanelStyle} aria-label='Mua voucher'>
        {isCustomer ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <span style={qtyLabelStyle}>Số lượng</span>
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
              <span style={{ fontSize: 13, color: colors.slateMuted, fontFamily: fonts.body }}>
                {soldOut ? 'Hết hàng' : `Còn ${remaining} · tối đa ${MAX_QUANTITY} mỗi đơn`}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Button
                variant='primary'
                size='lg'
                withArrow
                disabled={soldOut || buyNowMutation.isPending}
                isLoading={addMutation.isPending}
                onClick={handleAddToCart}
              >
                {soldOut ? 'Hết hàng' : 'Thêm vào giỏ'}
              </Button>
              <Button
                variant='secondary'
                size='lg'
                disabled={soldOut || addMutation.isPending}
                isLoading={buyNowMutation.isPending}
                onClick={handleBuyNow}
              >
                {soldOut ? 'Hết hàng' : 'Mua ngay'}
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
          {voucher.imageUrl.startsWith('/assets/voucher-catalogue-sprite.png') ? (
            <div
              role='img'
              aria-label={voucher.title}
              style={{
                width: '100%',
                minHeight: 440,
                backgroundImage: "url('/assets/voucher-catalogue-sprite.png')",
                backgroundSize: '1000% auto',
                backgroundPosition: spritePosition(voucher.imageUrl),
                backgroundRepeat: 'no-repeat'
              }}
            />
          ) : (
            <img
              src={voucher.imageUrl}
              alt={voucher.title}
              style={{
                display: 'block',
                width: '100%',
                height: '100%',
                minHeight: 440,
                objectFit: 'cover'
              }}
            />
          )}
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
