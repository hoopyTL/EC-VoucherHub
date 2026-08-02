/**
 * Sidebar — contextual navigation for the admin and partner workspaces.
 *
 * Renders a vertical navigation menu whose items depend on the active
 * workspace ("admin" or "partner"). Used by the admin/partner layout shells
 * alongside the global Header/Footer.
 */
import { NavLink } from 'react-router-dom'
import type { CSSProperties } from 'react'

export type SidebarVariant = 'admin' | 'partner'

interface SidebarItem {
  to: string
  label: string
}

const ADMIN_ITEMS: SidebarItem[] = [
  { to: '/admin', label: 'Tổng quan' },
  { to: '/admin/users', label: 'Người dùng' },
  { to: '/admin/partners', label: 'Duyệt đối tác' },
  { to: '/admin/vouchers', label: 'Duyệt voucher' },
  { to: '/admin/orders', label: 'Đơn hàng' }
]

const PARTNER_ITEMS: SidebarItem[] = [
  { to: '/partner', label: 'Tổng quan' },
  { to: '/partner/profile', label: 'Hồ sơ' },
  { to: '/partner/branches', label: 'Chi nhánh' },
  { to: '/partner/vouchers', label: 'Voucher' },
  { to: '/partner/redeem', label: 'Xác nhận sử dụng' },
  { to: '/partner/reports', label: 'Báo cáo' }
]

const itemBaseStyle: CSSProperties = {
  display: 'block',
  textDecoration: 'none',
  color: 'inherit',
  padding: '0.6rem 0.85rem',
  borderRadius: 6,
  fontSize: '0.95rem'
}

export interface SidebarProps {
  variant: SidebarVariant
}

export function Sidebar({ variant }: SidebarProps) {
  const items = variant === 'admin' ? ADMIN_ITEMS : PARTNER_ITEMS
  const heading = variant === 'admin' ? 'Quản trị hệ thống' : 'Không gian đối tác'

  return (
    <aside
      className='workspace-sidebar'
      style={{
        width: 220,
        flexShrink: 0,
        borderRight: '1px solid rgba(0, 0, 0, 0.1)',
        padding: '1rem 0.75rem'
      }}
    >
      <h2
        style={{
          fontSize: '0.8rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'rgba(0, 0, 0, 0.55)',
          margin: '0 0 0.75rem 0.85rem'
        }}
      >
        {heading}
      </h2>
      <nav aria-label={`${variant} navigation`} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === `/${variant}`}
            style={({ isActive }) => ({
              ...itemBaseStyle,
              fontWeight: isActive ? 700 : 500,
              background: isActive ? 'rgba(26, 115, 232, 0.12)' : 'transparent'
            })}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar
