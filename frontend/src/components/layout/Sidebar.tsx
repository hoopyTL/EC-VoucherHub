import { NavLink } from 'react-router-dom'
import type { CSSProperties } from 'react'
import { useAuth } from '../../hooks/useAuth'
import {
  Building2,
  CheckCircle2,
  ClipboardList,
  FileText,
  LayoutDashboard,
  MapPin,
  PackageCheck,
  ScrollText,
  TrendingUp,
  UserCog,
  UserRound,
  Users,
  type LucideIcon
} from 'lucide-react'

export type SidebarVariant = 'admin' | 'partner'
interface SidebarItem {
  to: string
  label: string
  icon: LucideIcon
}
const ADMIN_ITEMS: SidebarItem[] = [
  { to: '/admin', label: 'Tổng quan', icon: LayoutDashboard },
  { to: '/admin/users', label: 'Người dùng', icon: Users },
  { to: '/admin/partners', label: 'Duyệt đối tác', icon: Building2 },
  { to: '/admin/vouchers', label: 'Duyệt voucher', icon: PackageCheck },
  { to: '/admin/orders', label: 'Đơn hàng', icon: ClipboardList },
  { to: '/admin/content', label: 'Quản lý nội dung', icon: FileText },
  { to: '/admin/audit-logs', label: 'Nhật ký hệ thống', icon: ScrollText }
]
const PARTNER_ITEMS: SidebarItem[] = [
  { to: '/partner', label: 'Tổng quan', icon: LayoutDashboard },
  { to: '/partner/profile', label: 'Hồ sơ doanh nghiệp', icon: UserRound },
  { to: '/partner/branches', label: 'Chi nhánh', icon: MapPin },
  { to: '/partner/vouchers', label: 'Kho voucher', icon: PackageCheck },
  { to: '/partner/staff', label: 'Nhân viên', icon: UserCog },
  { to: '/partner/redeem', label: 'Xác nhận sử dụng', icon: CheckCircle2 },
  { to: '/partner/reports', label: 'Báo cáo', icon: TrendingUp }
]
export interface SidebarProps {
  variant: SidebarVariant
}
export function Sidebar({ variant }: SidebarProps) {
  const { user } = useAuth()
  const items =
    variant === 'admin'
      ? ADMIN_ITEMS
      : user?.role === 'STAFF'
        ? PARTNER_ITEMS.filter((item) => item.to === '/partner/redeem')
        : PARTNER_ITEMS
  const accent = 'var(--accent)'
  return (
    <aside
      className='workspace-sidebar'
      style={{
        width: 248,
        flexShrink: 0,
        padding: '22px 14px',
        color: '#fff',
        background: 'linear-gradient(180deg, var(--accent-deep) 0%, var(--accent) 100%)',
        boxShadow: '12px 0 35px rgba(24,20,42,.08)'
      }}
    >
      <div style={{ margin: '0 10px 22px' }}>
        <span style={{ display: 'block', fontSize: 16, fontWeight: 800 }}>
          {variant === 'admin' ? 'Trung tâm vận hành' : 'Không gian đối tác'}
        </span>
        <span
          style={{
            display: 'block',
            color: 'rgba(255,255,255,.58)',
            fontSize: 11,
            marginTop: 5,
            letterSpacing: '.08em',
            textTransform: 'uppercase'
          }}
        >
          {variant === 'admin' ? 'VoucherHub Admin' : 'Merchant Studio'}
        </span>
      </div>
      <nav aria-label={`${variant} navigation`} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === `/${variant}`}
              style={({ isActive }) => ({
                ...itemStyle,
                color: '#fff',
                background: isActive ? 'rgba(255,255,255,.18)' : 'transparent',
                boxShadow: isActive ? `inset 3px 0 0 ${accent}` : 'none',
                opacity: isActive ? 1 : 0.78
              })}
            >
              <span aria-hidden='true' style={{ width: 28, display: 'inline-flex', justifyContent: 'center' }}>
                <Icon size={19} strokeWidth={1.8} />
              </span>
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>
      <div
        style={{
          margin: '28px 10px 0',
          padding: 14,
          borderRadius: 14,
          background: 'rgba(255,255,255,.07)',
          border: '1px solid rgba(255,255,255,.09)'
        }}
      >
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.55)' }}>HỆ THỐNG</span>
        <div style={{ marginTop: 7, fontSize: 13 }}>
          <span style={{ color: '#49e0b6' }}>●</span> Dữ liệu trực tuyến
        </div>
      </div>
    </aside>
  )
}
const itemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  textDecoration: 'none',
  padding: '11px 12px',
  borderRadius: 12,
  fontSize: 14,
  fontWeight: 650,
  transition: 'background 160ms ease, transform 160ms ease, color 160ms ease'
}
export default Sidebar
