import { Link } from 'react-router-dom'
import { Bell, HelpCircle, Mail, Menu, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../hooks/useAuth'
import { IconButton, SearchInput } from '../ui'
import { listPendingPartners } from '../../services/admin'

export function WorkspaceTopbar({
  variant,
  onToggleNavigation
}: {
  variant: 'admin' | 'partner'
  onToggleNavigation: () => void
}) {
  const { user } = useAuth()
  const { t } = useTranslation()
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
      <IconButton label='Mở điều hướng' onClick={onToggleNavigation}>
        <Menu size={20} aria-hidden='true' />
      </IconButton>
      <SearchInput
        aria-label={t('common.search')}
        placeholder={
          variant === 'admin' ? 'Tìm người dùng, voucher, đơn hàng, đối tác...' : 'Tìm voucher, mã voucher...'
        }
        style={{ flex: '0 1 520px' }}
      />
      <div className='workspace-topbar__actions'>
        {variant === 'partner' && (
          <Link className='workspace-topbar__primary' to='/partner/vouchers/new'>
            <Plus size={17} aria-hidden='true' /> Tạo voucher
          </Link>
        )}
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
        <Link to='/faq' aria-label='Trợ giúp' title='Trợ giúp' className='workspace-topbar__help'>
          <HelpCircle size={19} aria-hidden='true' />
        </Link>
        <Link className='workspace-topbar__profile' to='/profile' aria-label='Mở hồ sơ'>
          <span>{initial}</span>
          <div>
            <strong>{user?.name || 'VoucherHub'}</strong>
            <small>{variant === 'admin' ? 'Quản trị viên' : 'Đối tác'}</small>
          </div>
        </Link>
      </div>
    </header>
  )
}

export default WorkspaceTopbar
