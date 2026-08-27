import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getFavoriteVoucherIds } from '../../services/favorites'
import { getVoucherDetail } from '../../services/voucher.service'
import { VoucherCard } from '../../components/voucher/VoucherCard'
import { ConfirmDialog, ContentSkeleton } from '../../components/ui'
import { useAuth } from '../../hooks/useAuth'
import { useState, type CSSProperties } from 'react'

export function FavoritesPage() {
  const ids = getFavoriteVoucherIds()
  const { user, logout } = useAuth()
  const [logoutOpen, setLogoutOpen] = useState(false)
  const favorites = useQuery({
    queryKey: ['favorite-vouchers', ids],
    queryFn: () => Promise.all(ids.map(getVoucherDetail)),
    enabled: ids.length > 0
  })

  const initials = (user?.name ?? 'N').trim().charAt(0).toLocaleUpperCase('vi') || 'N'

  return (
    <section className='my-vouchers-page customer-account-layout favorites-page'>
      <aside className='customer-account-sidebar' aria-label='Khu vực tài khoản'>
        <div aria-hidden='true' className='customer-account-avatar' style={avatarStyle}>
          {initials}
        </div>
        <strong>Tài khoản của tôi</strong>
        <p>Quản lý thông tin, lịch sử mua hàng và voucher của bạn.</p>
        <nav aria-label='Điều hướng tài khoản'>
          <Link to='/profile'>Thông tin tài khoản</Link>
          <Link to='/orders'>Lịch sử mua hàng</Link>
          <Link to='/my-vouchers'>Voucher của tôi</Link>
          <Link className='is-current' to='/favorites'>
            Yêu thích
          </Link>
          <Link to='/profile?tab=security'>Đổi mật khẩu</Link>
        </nav>
        <div className='customer-account-member-badge'>Thành viên Bạc · 1.250 điểm</div>
        <button type='button' className='customer-account-logout' onClick={() => setLogoutOpen(true)}>
          Đăng xuất
        </button>
      </aside>
      <div className='customer-account-content'>
        <div className='my-vouchers-heading'>
          <h1>Voucher yêu thích</h1>
        </div>
        <p>Lưu lại những ưu đãi bạn quan tâm để xem và mua nhanh hơn.</p>
        {favorites.isLoading && <ContentSkeleton rows={3} label='Đang tải voucher yêu thích' />}
        {ids.length === 0 && (
          <div className='favorites-empty'>
            <span aria-hidden='true'>♡</span>
            <h2>Bạn chưa có voucher yêu thích</h2>
            <p>Nhấn biểu tượng trái tim trên voucher để lưu lại tại đây.</p>
            <Link to='/search'>Khám phá voucher</Link>
          </div>
        )}
        {favorites.isError && <div role='alert'>Không thể tải voucher yêu thích. Vui lòng thử lại.</div>}
        {favorites.data && (
          <div className='favorites-grid'>
            {favorites.data.map((voucher) => (
              <VoucherCard key={voucher.id} voucher={voucher} />
            ))}
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
          logout()
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

export default FavoritesPage
