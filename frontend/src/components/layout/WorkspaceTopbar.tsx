import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, CheckCircle2, HelpCircle, LogOut, Mail, Menu, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../hooks/useAuth'
import { ConfirmDialog, IconButton, SearchInput } from '../ui'
import { listPendingPartners } from '../../services/admin'

export function WorkspaceTopbar({
  variant,
  onToggleNavigation
}: {
  variant: 'admin' | 'partner'
  onToggleNavigation: () => void
}) {
  const { user, logout } = useAuth()
  const { t } = useTranslation()
  const [logoutOpen, setLogoutOpen] = useState(false)
  const isStaffWorkspace = variant === 'partner' && user?.role === 'STAFF'
  const initial = (user?.name?.trim().charAt(0) || 'V').toLocaleUpperCase('vi')
  const pendingPartnersQuery = useQuery({
    queryKey: ['admin-partners-pending-count'],
    queryFn: () => listPendingPartners({ page: 1, limit: 1 }),
    enabled: variant === 'admin',
    staleTime: 60_000
  })
  const pendingPartnerCount = pendingPartnersQuery.data?.pagination.total ?? 0

  return (
    <header className='workspace-topbar'>
      {!isStaffWorkspace && (
        <IconButton label='Mở điều hướng' onClick={onToggleNavigation}>
          <Menu size={20} aria-hidden='true' />
        </IconButton>
      )}
      {isStaffWorkspace ? (
        <div className='workspace-topbar__context'>
          <span aria-hidden='true'>
            <CheckCircle2 size={19} />
          </span>
          <div>
            <strong>{t('workspace.redeem')}</strong>
            <small>{t('workspace.staffTopbarSubtitle')}</small>
          </div>
        </div>
      ) : (
        <SearchInput
          aria-label={t('common.search')}
          placeholder={
            variant === 'admin' ? 'Tìm người dùng, voucher, đơn hàng, đối tác...' : 'Tìm voucher, mã voucher...'
          }
          style={{ flex: '0 1 520px' }}
        />
      )}
      <div className='workspace-topbar__actions'>
        {variant === 'partner' && !isStaffWorkspace && (
          <Link className='workspace-topbar__primary' to='/partner/vouchers/new'>
            <Plus size={17} aria-hidden='true' /> Tạo voucher
          </Link>
        )}
        {!isStaffWorkspace && (
          <>
            <Link
              className='workspace-topbar__notice'
              to={variant === 'admin' ? '/admin/audit-logs' : '/partner'}
              aria-label='Xem thông báo và hoạt động gần đây'
              title='Thông báo và hoạt động gần đây'
            >
              <Bell size={18} aria-hidden='true' />
            </Link>
            <Link
              className='workspace-topbar__notice'
              to={variant === 'admin' ? '/admin/partners' : '/faq'}
              aria-label={variant === 'admin' ? 'Xem yêu cầu đối tác' : 'Mở trung tâm hỗ trợ'}
              title={variant === 'admin' ? 'Yêu cầu đối tác' : 'Trung tâm hỗ trợ'}
            >
              <Mail size={18} aria-hidden='true' />
              {variant === 'admin' && pendingPartnerCount > 0 && (
                <b>{pendingPartnerCount > 99 ? '99+' : pendingPartnerCount}</b>
              )}
            </Link>
          </>
        )}
        {!isStaffWorkspace && (
          <Link to='/faq' aria-label='Trợ giúp' title='Trợ giúp' className='workspace-topbar__help'>
            <HelpCircle size={19} aria-hidden='true' />
          </Link>
        )}
        <Link className='workspace-topbar__profile' to='/profile' aria-label='Mở hồ sơ'>
          <span>{initial}</span>
          <div>
            <strong>{user?.name || 'VoucherHub'}</strong>
            <small>{variant === 'admin' ? 'Quản trị viên' : isStaffWorkspace ? 'Nhân viên' : 'Đối tác'}</small>
          </div>
        </Link>
        {isStaffWorkspace && (
          <button
            type='button'
            className='workspace-topbar__logout'
            aria-label='Đăng xuất'
            title='Đăng xuất'
            onClick={() => setLogoutOpen(true)}
          >
            <LogOut size={20} aria-hidden='true' />
          </button>
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
          logout()
        }}
      />
    </header>
  )
}

export default WorkspaceTopbar
