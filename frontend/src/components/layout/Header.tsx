/**
 * Header — primary navigation as a floating glassmorphic pill "dock".
 *
 * Restyled to the VoucherHub design system: a centered, rounded, frosted bar
 * that hovers on the canvas. The active route is indicated by a solid white
 * pill chip behind the link; the primary CTA is an ink pill. Navigation adapts
 * to the authenticated user's role (Req 23.2).
 */
import { Link, NavLink } from 'react-router-dom'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { colors, fonts, radius, glass, shadows } from '../../theme/tokens'

interface NavItem {
  to: string
  label: string
}

const navLinkBase: CSSProperties = {
  textDecoration: 'none',
  color: colors.slate,
  padding: '8px 16px',
  borderRadius: radius.full,
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
      {label}
    </NavLink>
  )
}

export function Header() {
  const { isAuthenticated, user, logout } = useAuth()
  const { t } = useTranslation()

  const publicLinks: NavItem[] = [
    { to: '/', label: t('nav.home') },
    { to: '/search', label: t('nav.browse') }
  ]

  const roleLinks: NavItem[] = []
  // Only surface role-specific destinations once the session is confirmed
  // authenticated. During the initial refresh-probe `user` may be populated
  // from the persisted profile while `isAuthenticated` is still false — gating
  // on `isAuthenticated` prevents showing Cart/Orders/My Codes to a visitor who
  // is not (yet) logged in.
  if (isAuthenticated && user?.role === 'CUSTOMER') {
    roleLinks.push({ to: '/cart', label: t('nav.cart') }, { to: '/orders', label: t('nav.orders') })
  } else if (isAuthenticated && user?.role === 'PARTNER') {
    roleLinks.push({ to: '/partner', label: t('nav.partnerWorkspace') })
  } else if (isAuthenticated && user?.role === 'ADMIN') {
    roleLinks.push({ to: '/admin', label: t('nav.adminConsole') })
  }

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '16px 24px',
        ...glass,
        borderTop: 'none',
        borderLeft: 'none',
        borderRight: 'none',
        boxShadow: shadows.card,
        flexWrap: 'wrap'
      }}
    >
      {/* Wordmark */}
      <Link
        to='/'
        style={{
          textDecoration: 'none',
          color: colors.ink,
          fontFamily: fonts.display,
          fontWeight: 800,
          fontSize: 20,
          letterSpacing: '-0.02em',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6
        }}
      >
        VoucherHub
        <span aria-hidden='true' style={{ fontSize: 11, verticalAlign: 'super' }}>
          ®
        </span>
      </Link>

      {/* Centered pill dock */}
      <nav
        aria-label='Điều hướng chính'
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: 6,
          borderRadius: radius.full,
          background: colors.surfaceMuted,
          border: `1px solid ${colors.hairline}`,
          flexWrap: 'wrap'
        }}
      >
        {publicLinks.map(renderNavLink)}
        {roleLinks.map(renderNavLink)}
      </nav>

      {/* Account actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {isAuthenticated && user ? (
          <>
            <NavLink to='/profile' style={navLinkBase}>
              {user.name || t('nav.account')}
            </NavLink>
            <button
              type='button'
              onClick={logout}
              style={{
                padding: '10px 18px',
                borderRadius: radius.full,
                border: `1px solid ${colors.hairline}`,
                background: colors.surface,
                color: colors.ink,
                cursor: 'pointer',
                fontFamily: fonts.display,
                fontSize: 14,
                fontWeight: 600
              }}
            >
              {t('nav.logOut')}
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
    </header>
  )
}

export default Header
