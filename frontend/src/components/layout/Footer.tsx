import { type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { CreditCard, Gift, Mail } from 'lucide-react'

const columns = [
  {
    title: 'Về chúng tôi',
    links: [
      ['Giới thiệu', '/faq'],
      ['Tuyển dụng', '/faq'],
      ['Liên hệ', '/faq']
    ]
  },
  {
    title: 'Hỗ trợ khách hàng',
    links: [
      ['Trung tâm hỗ trợ', '/faq'],
      ['Hướng dẫn sử dụng', '/faq'],
      ['Câu hỏi thường gặp', '/faq']
    ]
  },
  {
    title: 'Chính sách',
    links: [
      ['Điều khoản sử dụng', '/policy'],
      ['Chính sách bảo mật', '/policy'],
      ['Chính sách hoàn tiền', '/policy']
    ]
  },
  {
    title: 'Đối tác',
    links: [
      ['Đăng ký đối tác', '/partner/register'],
      ['Danh sách đối tác', '/search'],
      ['Đăng nhập đối tác', '/login']
    ]
  }
] as const

export function Footer() {
  const year = new Date().getFullYear()
  const preventUnsupportedSubmit = (event: FormEvent) => event.preventDefault()

  return (
    <footer className='customer-footer'>
      <section className='customer-footer__newsletter' aria-label='Nhận tin ưu đãi'>
        <div>
          <Mail size={22} aria-hidden='true' />
          <span>
            <strong>Đăng ký nhận ưu đãi độc quyền</strong>
            <small>Nhận voucher hot và thông tin khuyến mãi mới nhất.</small>
          </span>
        </div>
        <form onSubmit={preventUnsupportedSubmit}>
          <input type='email' aria-label='Email nhận ưu đãi' placeholder='Nhập email của bạn' />
          <button type='submit'>Đăng ký ngay</button>
        </form>
      </section>
      <div className='customer-footer__main'>
        <section className='customer-footer__brand'>
          <div className='customer-footer__logo'>
            <Gift size={19} aria-hidden='true' /> VoucherHub
          </div>
          <p>Nền tảng mua sắm voucher uy tín, kết nối khách hàng với các thương hiệu được tuyển chọn.</p>
          <div className='customer-footer__socials' aria-label='Mạng xã hội'>
            <a href='#' aria-label='Facebook'>
              f
            </a>
            <a href='#' aria-label='Instagram'>
              ◎
            </a>
            <a href='#' aria-label='Youtube'>
              ▶
            </a>
          </div>
          <small>© {year} VoucherHub. Bảo lưu mọi quyền.</small>
        </section>
        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <strong>{column.title}</strong>
            {column.links.map(([label, to]) => (
              <Link key={label} to={to}>
                {label}
              </Link>
            ))}
          </nav>
        ))}
        <section className='customer-footer__payments'>
          <strong>Phương thức thanh toán</strong>
          <div className='customer-footer__payment-logos' aria-label='Các phương thức thanh toán'>
            <span className='payment-vnpay'>VNPay</span>
            <span className='payment-onepay'>OnePAY</span>
            <span className='payment-paypal'>PayPal</span>
            <span className='payment-stripe'>stripe</span>
          </div>
          <small>Thanh toán an toàn và được mã hóa</small>
          <div className='customer-footer__commerce-badge'>
            <CreditCard size={18} aria-hidden='true' /> Bảo mật thanh toán
          </div>
        </section>
      </div>
    </footer>
  )
}

export default Footer
