/**
 * Header — primary navigation as a floating glassmorphic pill "dock".
 *
 * Restyled to the VoucherHub design system: a centered, rounded, frosted bar
 * that hovers on the canvas. The active route is indicated by a solid white
 * pill chip behind the link; the primary CTA is an ink pill. Navigation adapts
 * to the authenticated user's role (Req 23.2).
 */
import { FormEvent, useState, type CSSProperties } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { colors, fonts, radius, glass } from '../../theme/tokens'
import { ConfirmDialog } from '../ui'
import { ArrowLeft, Gift, Home, LogOut, ShoppingCart } from 'lucide-react'
import { getVoucherFilterOptions } from '../../services/voucher.service'
import { getCart } from '../../services/orders'
import { SearchInput } from '../ui'

interface NavItem {
  to: string
  label: string
}

const navLinkBase: CSSProperties = {
  textDecoration: 'none',
  color: colors.slate,
  padding: '8px 12px',
  borderRadius: radius.md,
  fontFamily: fonts.display,
  fontSize: 14,
  fontWeight: 600,
  letterSpacing: '0.01em',
  transition: 'background 0.15s ease, color 0.15s ease'
}

/** A nav link that renders a solid white chip + ink text when active. */
function renderNavLink({ to, label }: NavItem) {
  return (
    <NavLink
      key={to}
      to={to}
      end={to === '/'}
      style={({ isActive }) => ({
        ...navLinkBase,
        color: isActive ? colors.ink : colors.slate,
        background: isActive ? colors.surface : 'transparent',
        boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'
      })}
    >
      {to === '/' && (
        <Home size={16} strokeWidth={1.8} aria-hidden='true' style={{ marginRight: 7, verticalAlign: '-3px' }} />
      )}
      {label}
    </NavLink>
  )
}

export function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, user, logout } = useAuth()
  const { t } = useTranslation()
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const filterOptions = useQuery({
    queryKey: ['vouchers', 'filter-options'],
    queryFn: getVoucherFilterOptions,
    staleTime: 5 * 60 * 1000
  })
  const cartQuery = useQuery({
    queryKey: ['cart'],
    queryFn: getCart,
    enabled: isAuthenticated && user?.role === 'CUSTOMER',
    staleTime: 30 * 1000
  })
  const cartQuantity = cartQuery.data?.items.reduce((total, item) => total + item.quantity, 0) ?? 0
  const initial = (user?.name?.trim().charAt(0) || 'K').toLocaleUpperCase('vi')
  const compactCommerceHeader =
    location.pathname === '/cart' ||
    location.pathname === '/checkout' ||
    location.pathname === '/my-vouchers' ||
    location.pathname === '/profile' ||
    location.pathname === '/login' ||
    location.pathname.startsWith('/orders')

  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
    const query = keyword.trim()
    navigate(query ? `/search?q=${encodeURIComponent(query)}` : '/search')
  }

  const publicLinks: NavItem[] = [{ to: '/search', label: '☰  Danh mục' }]

  const roleLinks: NavItem[] = []
  // Only surface role-specific destinations once the session is confirmed
  // authenticated. During the initial refresh-probe `user` may be populated
  // from the persisted profile while `isAuthenticated` is still false — gating
  // on `isAuthenticated` prevents showing Cart/Orders/My Codes to a visitor who
  // is not (yet) logged in.
  if (isAuthenticated && user?.role === 'CUSTOMER') {
    roleLinks.push({ to: '/my-vouchers', label: 'Voucher của tôi' })
  } else if (isAuthenticated && (user?.role === 'PARTNER' || user?.role === 'STAFF')) {
    roleLinks.push({
      to: user.role === 'STAFF' ? '/partner/redeem' : '/partner',
      label: user.role === 'STAFF' ? t('nav.staffWorkspace') : t('nav.partnerWorkspace')
    })
  } else if (isAuthenticated && user?.role === 'ADMIN') {
    roleLinks.push({ to: '/admin', label: t('nav.adminConsole') })
  }

  return (
    <header
      className={`customer-header${compactCommerceHeader ? ' customer-header--compact' : ''}`}
      style={{
        position: 'relative',
        zIndex: 1,
        display: 'block',
        padding: '10px 0 0',
        ...glass,
        borderTop: 'none',
        borderLeft: 'none',
        borderRight: 'none',
        borderBottom: `1px solid ${colors.hairline}`,
        boxShadow: 'none',
        background: 'rgba(255,255,255,0.97)'
      }}
    >
      <div className='customer-header__row'>
        {/* Wordmark */}
        <Link
          to='/'
          style={{
            textDecoration: 'none',
            color: colors.ink,
            fontFamily: fonts.display,
            fontWeight: 800,
            fontSize: 21,
            letterSpacing: '-0.02em',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <span
            aria-hidden='true'
            style={{
              width: 32,
              height: 32,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              color: colors.onAccent,
              background: colors.accent
            }}
          >
            <Gift size={18} strokeWidth={2} />
          </span>
          <span className='customer-header__wordmark'>
            VoucherHub<small>Tiết kiệm nhiều hơn mỗi ngày</small>
          </span>
        </Link>

        {compactCommerceHeader && location.pathname !== '/' && (
          <Link
            to='/'
            className='customer-header__home-back'
            aria-label='Quay lại trang chủ'
            title='Quay lại trang chủ'
          >
            <ArrowLeft size={19} strokeWidth={2} aria-hidden='true' />
            <span>Trang chủ</span>
          </Link>
        )}

        {!compactCommerceHeader && (
          <form className='customer-header__search' onSubmit={submitSearch} role='search'>
            <SearchInput
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder='Tìm kiếm thương hiệu, voucher, ưu đãi...'
              aria-label='Tìm kiếm voucher'
              style={{ width: '100%', minWidth: 0 }}
            />
            <button className='customer-header__search-submit' type='submit'>
              Tìm kiếm
            </button>
          </form>
        )}

        {/* Secondary catalogue navigation */}
        {!compactCommerceHeader && (
          <nav
            aria-label='Điều hướng chính'
            style={{
              display: 'flex',
              alignItems: 'center',
              gridColumn: '1 / -1',
              order: 4,
              gap: 8,
              padding: '10px 0 0',
              borderTop: `1px solid ${colors.hairline}`,
              background: colors.surface,
              overflowX: 'auto'
            }}
          >
            {publicLinks.map(renderNavLink)}
            <NavLink to='/search?sort=discount' style={{ ...navLinkBase, color: '#ef4444' }}>
              ♨ Ưu đãi hot
            </NavLink>
            {(filterOptions.data?.categories ?? []).slice(0, 7).map((category) => (
              <NavLink key={category} to={`/search?category=${encodeURIComponent(category)}`} style={navLinkBase}>
                {category}
              </NavLink>
            ))}
            {roleLinks.map(renderNavLink)}
          </nav>
        )}

        {/* Account actions */}
        <div
          className='customer-header__actions'
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}
        >
          {isAuthenticated && user ? (
            <>
              {user.role === 'CUSTOMER' && (
                <NavLink
                  to='/cart'
                  aria-label={cartQuantity > 0 ? `Mở giỏ hàng, đang có ${cartQuantity} voucher` : 'Mở giỏ hàng'}
                  title={cartQuantity > 0 ? `Giỏ hàng (${cartQuantity})` : 'Giỏ hàng'}
                  className='customer-header__cart'
                  style={({ isActive }) => ({
                    position: 'relative',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 42,
                    height: 42,
                    borderRadius: radius.md,
                    color: isActive ? colors.accentHover : colors.ink,
                    background: isActive ? colors.accentSurface : colors.surface,
                    border: `1px solid ${isActive ? colors.accent : colors.hairline}`,
                    boxShadow: isActive ? '0 6px 16px rgba(228, 77, 38, 0.10)' : 'none'
                  })}
                >
                  <ShoppingCart size={20} strokeWidth={1.8} aria-hidden='true' />
                  {cartQuantity > 0 && (
                    <span className='customer-header__cart-badge' aria-hidden='true'>
                      {cartQuantity > 99 ? '99+' : cartQuantity}
                    </span>
                  )}
                </NavLink>
              )}
              <NavLink
                to='/profile'
                aria-label='Mở tài khoản'
                title={user.name || t('nav.account')}
                style={() => ({
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 42,
                  height: 42,
                  borderRadius: radius.full,
                  color: colors.accentHover,
                  background: colors.accentSurface,
                  border: `1px solid ${colors.accent}`,
                  fontFamily: fonts.display,
                  fontWeight: 800
                })}
              >
                {initial}
              </NavLink>
              <button
                type='button'
                className='customer-header__logout'
                aria-label='Đăng xuất'
                title='Đăng xuất'
                onClick={() => setLogoutOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 42,
                  height: 42,
                  padding: 0,
                  borderRadius: radius.md,
                  border: `1px solid ${colors.hairline}`,
                  background: colors.surface,
                  color: colors.ink,
                  cursor: 'pointer',
                  fontFamily: fonts.display,
                  fontSize: 14,
                  fontWeight: 600
                }}
              >
                <LogOut size={19} strokeWidth={1.8} aria-hidden='true' />
              </button>
            </>
          ) : (
            <>
              <NavLink to='/login' style={navLinkBase}>
                {t('nav.logIn')}
              </NavLink>
              <NavLink
                to='/register'
                style={{
                  textDecoration: 'none',
                  padding: '10px 20px',
                  borderRadius: radius.full,
                  background: colors.ink,
                  color: colors.onInk,
                  fontFamily: fonts.display,
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: '0.01em'
                }}
              >
                {t('nav.signUp')}
              </NavLink>
            </>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={logoutOpen}
        title={t('logout.title')}
        message={t('logout.message')}
        cancelLabel={t('logout.cancel')}
        confirmLabel={t('logout.confirm')}
        danger
        onCancel={() => setLogoutOpen(false)}
        onConfirm={() => {
          setLogoutOpen(false)
          logout()
        }}
      />
    </header>
  )
}

export default Header
