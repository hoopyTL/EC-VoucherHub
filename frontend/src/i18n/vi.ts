/**
 * Vietnamese translation bundle (Phase 3 — i18n).
 *
 * Must stay key-for-key in sync with `en.ts`.
 */
import type { TranslationBundle } from './en'

export const vi: TranslationBundle = {
  nav: {
    home: 'Trang chủ',
    browse: 'Khám phá',
    cart: 'Giỏ hàng',
    wishlist: 'Yêu thích',
    points: 'Điểm',
    referrals: 'Giới thiệu',
    orders: 'Đơn hàng',
    myCodes: 'Mã của tôi',
    partnerWorkspace: 'Không gian Đối tác',
    adminConsole: 'Bảng Quản trị',
    account: 'Tài khoản',
    logIn: 'Đăng nhập',
    logOut: 'Đăng xuất',
    signUp: 'Đăng ký'
  },
  home: {
    eyebrow: 'Sàn voucher giảm giá',
    titleLine1: 'Ưu đãi đáng',
    titleLine2: 'chia sẻ.',
    subtitle:
      'Duyệt và mua voucher giảm giá từ các đối tác nhà hàng, spa, rạp phim và thương hiệu du lịch. Thanh toán an toàn, nhận mã riêng, sử dụng tại cửa hàng.',
    browseCta: 'Khám phá voucher',
    createAccount: 'Tạo tài khoản',
    partnerWorkspace: 'Không gian đối tác',
    adminConsole: 'Bảng quản trị',
    statVouchers: 'Voucher tuyển chọn',
    statPartners: 'Đối tác tin cậy',
    statCategories: 'Danh mục',
    statCheckout: 'Thanh toán an toàn'
  },
  auth: {
    accountEyebrow: 'Tài khoản',
    welcomeBack: 'Chào mừng trở lại',
    welcomeSubtitle: 'Nhập thông tin đăng nhập để tiếp tục.',
    emailOrPhone: 'Email hoặc số điện thoại',
    password: 'Mật khẩu',
    forgotPassword: 'Quên mật khẩu?',
    logIn: 'Đăng nhập',
    noAccount: 'Chưa có tài khoản?',
    signUp: 'Đăng ký',
    loginRequiredNotice: 'Vui lòng đăng nhập để tiếp tục đến trang đó.'
  },
  browse: {
    title: 'Khám phá voucher',
    subtitle: 'Tìm ưu đãi về ẩm thực, spa, giải trí, du lịch và nhiều hơn nữa.',
    searchPlaceholder: 'Tìm voucher…',
    emptyResults: 'Không có voucher nào khớp với tìm kiếm. Hãy thử điều chỉnh bộ lọc.'
  },
  common: {
    loading: 'Đang tải…',
    retry: 'Thử lại',
    save: 'Lưu',
    saved: 'Đã lưu',
    language: 'Ngôn ngữ'
  }
}

export default vi
