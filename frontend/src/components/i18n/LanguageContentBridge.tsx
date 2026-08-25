import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * A compatibility bridge for legacy screens which still contain literal UI
 * copy. New screens should use `t()` directly; this bridge keeps the language
 * switch honest while those screens are progressively migrated. It only
 * translates product-independent interface copy — brands and voucher content
 * are deliberately left untouched.
 */
const viToEn: Record<string, string> = {
  'Trang chủ': 'Home',
  'Khám phá': 'Browse',
  'Giỏ hàng': 'Cart',
  'Tài khoản': 'Account',
  'Đăng nhập': 'Log in',
  'Đăng xuất': 'Sign out',
  'Đăng ký': 'Sign up',
  'Quay lại': 'Back',
  'Quay lại tìm kiếm': 'Back to search',
  'Tổng quan': 'Overview',
  'Người dùng': 'Users',
  'Đối tác': 'Partners',
  'Chi nhánh': 'Branches',
  'Nhân viên': 'Staff',
  'Kho voucher': 'Voucher inventory',
  'Quản lý voucher': 'Voucher management',
  'Duyệt đối tác': 'Partner approvals',
  'Duyệt voucher': 'Voucher approvals',
  'Đơn hàng': 'Orders',
  'Báo cáo': 'Reports',
  'Lịch sử giao dịch': 'Transaction history',
  'Nhật ký hệ thống': 'System audit logs',
  'Hồ sơ doanh nghiệp': 'Business profile',
  'Xác nhận sử dụng': 'Redeem voucher',
  'Thêm đối tác': 'Add partner',
  'Thêm chi nhánh': 'Add branch',
  'Thêm nhân viên': 'Add staff',
  'Tạo voucher': 'Create voucher',
  'Sửa voucher': 'Edit voucher',
  'Lưu voucher': 'Save voucher',
  Lưu: 'Save',
  Hủy: 'Cancel',
  Xóa: 'Delete',
  'Chỉnh sửa': 'Edit',
  'Xem chi tiết': 'View details',
  Đóng: 'Close',
  'Tìm kiếm': 'Search',
  'Xóa lọc': 'Clear filters',
  'Bộ lọc': 'Filters',
  'Tất cả': 'All',
  'Danh mục': 'Category',
  'Khu vực': 'Region',
  'Giá thấp nhất': 'Minimum price',
  'Giá cao nhất': 'Maximum price',
  'Giảm tối thiểu %': 'Minimum discount %',
  'Sắp xếp': 'Sort',
  'Mới nhất': 'Newest',
  'Giá tăng dần': 'Price: low to high',
  'Giá giảm dần': 'Price: high to low',
  'Giảm giá nhiều nhất': 'Highest discount',
  'Đang tải': 'Loading',
  'Thử lại': 'Retry',
  'Không có dữ liệu': 'No data',
  'Không tìm thấy dữ liệu': 'No data found',
  'Không thể tải dữ liệu.': 'Unable to load data.',
  'Thông tin cá nhân': 'Personal information',
  'Bảo mật & mật khẩu': 'Security & password',
  'Thông tin hồ sơ': 'Profile information',
  'Đổi mật khẩu': 'Change password',
  'Họ và tên': 'Full name',
  'Số điện thoại': 'Phone number',
  'Địa chỉ': 'Address',
  'Mật khẩu': 'Password',
  Email: 'Email',
  'Vai trò': 'Role',
  'Trạng thái': 'Status',
  'Đang hoạt động': 'Active',
  'Tạm khóa': 'Suspended',
  'Đã lưu thành công': 'Saved successfully',
  'Giỏ hàng của bạn': 'Your cart',
  'Tiến hành thanh toán': 'Proceed to checkout',
  'Chọn phương thức thanh toán': 'Choose a payment method',
  'Thanh toán': 'Payment',
  'Hoàn tất': 'Complete',
  'Chờ thanh toán': 'Awaiting payment',
  'Đã mua': 'Purchased',
  'Lịch sử': 'History',
  'Lịch sử đơn hàng': 'Order history',
  'Đã thanh toán': 'Paid',
  'Đã hủy': 'Cancelled',
  'Hủy đơn': 'Cancel order',
  'Tổng cộng': 'Total',
  'Số lượng': 'Quantity',
  'Thêm vào giỏ': 'Add to cart',
  'Mua ngay': 'Buy now',
  'Mô tả': 'Description',
  'Điều khoản và điều kiện': 'Terms and conditions',
  'Chi nhánh áp dụng': 'Applicable branches',
  'Đánh giá từ khách hàng': 'Customer reviews',
  'Hiển thị QR': 'Show QR',
  'Mã voucher': 'Voucher code',
  'Chưa sử dụng': 'Unused',
  'Đã sử dụng': 'Used',
  'Hết hạn': 'Expired',
  'Doanh thu': 'Revenue',
  'Doanh thu voucher': 'Voucher revenue',
  'Hiệu quả voucher': 'Voucher performance',
  Ngày: 'Day',
  Tuần: 'Week',
  Tháng: 'Month',
  Năm: 'Year',
  'Khách hàng': 'Customers',
  'Lượt đã bán': 'Sold',
  'Đã phát hành': 'Issued',
  'Đã dùng': 'Redeemed',
  'Tỷ lệ dùng': 'Redemption rate',
  'Xác nhận': 'Confirm',
  Có: 'Yes',
  Không: 'No',
  'Tiếp tục': 'Continue',
  'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối và thử lại.':
    'Cannot reach the server. Check your connection and try again.',
  'Không thể thêm voucher vào giỏ hàng. Vui lòng thử lại.':
    'Unable to add this voucher to your cart. Please try again.',
  'Không tìm thấy voucher': 'Voucher not found',
  'Đã xảy ra lỗi': 'Something went wrong',
  'Voucher này không còn được bán hoặc không tồn tại.': 'This voucher is no longer on sale or does not exist.',
  'Không thể tải thông tin voucher. Vui lòng thử lại.': 'Unable to load voucher information. Please try again.',
  'Hết hàng': 'Sold out',
  'Số lượng còn lại': 'Remaining quantity',
  'Voucher chưa có chi nhánh đang hoạt động.': 'This voucher has no active branch yet.',
  'Voucher chưa có điều khoản và điều kiện riêng.': 'This voucher has no specific terms and conditions yet.',
  'Tìm theo tiêu đề hoặc mô tả': 'Search by title or description',
  'Tất cả đối tác': 'All partners',
  'Giá thấp nhất không được lớn hơn giá cao nhất.': 'Minimum price cannot be greater than maximum price.',
  'Ưu đãi đáng để sẻ chia.': 'Deals worth sharing.',
  'Khám phá voucher ẩm thực, làm đẹp, du lịch và trải nghiệm từ các đối tác được tuyển chọn.':
    'Discover food, beauty, travel and experience vouchers from selected partners.',
  'Ưu đãi từ Internet': 'Deals from the web',
  'Ưu đãi đang diễn ra từ các thương hiệu': 'Live offers from brands',
  'Dữ liệu được đồng bộ từ website chính thức của nhà cung cấp. Chọn một ưu đãi để xem đầy đủ điều kiện tại nguồn.':
    'Data is synchronized from the provider’s official website. Select an offer to view its full terms at the source.',
  'Xem ưu đãi': 'View offer',
  'Đã xóa đánh giá.': 'Review deleted.',
  'Không thể xóa đánh giá. Vui lòng thử lại.': 'Unable to delete the review. Please try again.',
  'Bạn có chắc chắn muốn xóa đánh giá này không?': 'Are you sure you want to delete this review?',
  'Viết đánh giá': 'Write a review',
  'Đóng form': 'Close form',
  'lượt đánh giá': 'reviews',
  'Đang tải đánh giá...': 'Loading reviews...',
  'Không thể tải danh sách đánh giá. Vui lòng thử lại sau.': 'Unable to load reviews. Please try again later.',
  'Chưa có đánh giá nào cho voucher này.': 'There are no reviews for this voucher yet.',
  'Chỉnh sửa đánh giá': 'Edit review',
  'Xóa đánh giá': 'Delete review',
  Trước: 'Previous',
  Sau: 'Next',
  'Quên mật khẩu?': 'Forgot password?',
  'Quay lại đăng nhập': 'Back to login',
  'Gửi yêu cầu khôi phục': 'Send reset request',
  'Đã nhớ mật khẩu?': 'Remembered your password?',
  'Đăng ký khách hàng': 'Customer registration',
  'Đăng ký đối tác': 'Partner registration',
  'Thông tin đăng nhập': 'Login information',
  'Thông tin doanh nghiệp': 'Business information',
  'Tên pháp lý doanh nghiệp': 'Legal business name',
  'Người đại diện': 'Representative',
  'Họ tên người đại diện': 'Representative full name',
  'Tên chi nhánh': 'Branch name',
  'Gửi hồ sơ đăng ký': 'Submit registration',
  'Đã có tài khoản?': 'Already have an account?',
  'Đặt hàng': 'Place order',
  'Tóm tắt đơn hàng': 'Order summary',
  'Đơn giá': 'Unit price',
  'Người nhận quà (không bắt buộc)': 'Gift recipient (optional)',
  'Tên người nhận': 'Recipient name',
  'Email người nhận': 'Recipient email',
  'Số điện thoại người nhận': 'Recipient phone',
  'Không thể đặt hàng. Vui lòng thử lại.': 'Unable to place the order. Please try again.',
  'Giỏ hàng của bạn đang trống.': 'Your cart is empty.',
  'Không thể tải giỏ hàng. Vui lòng thử lại.': 'Unable to load your cart. Please try again.',
  'Không tìm thấy đơn hàng': 'Order not found',
  'Không thể tải đơn hàng này. Vui lòng thử lại sau.': 'Unable to load this order. Please try again later.',
  'Quay lại đơn hàng': 'Back to orders',
  'Đặt lúc': 'Placed at',
  'Người nhận quà': 'Gift recipient',
  'Voucher trong đơn': 'Vouchers in this order',
  'Thanh toán qua VNPay': 'Pay with VNPay',
  'Thanh toán qua thẻ quốc tế (Stripe)': 'Pay with international card (Stripe)',
  'Thông tin thanh toán': 'Payment information',
  'Mã đối soát:': 'Reference code:',
  'Chưa có thanh toán thành công': 'No successful payment yet',
  'Đang tải lịch sử thanh toán': 'Loading payment history',
  'Không thể tải hồ sơ đối tác.': 'Unable to load partner profile.',
  'Lưu thay đổi': 'Save changes',
  'Tên doanh nghiệp': 'Business name',
  'Số điện thoại tài khoản': 'Account phone number',
  'Mật khẩu ban đầu': 'Initial password',
  'Chi nhánh được phân công': 'Assigned branches',
  'Tạo tài khoản nhân viên': 'Create staff account',
  'Thông tin tài khoản': 'Account information',
  'Chờ duyệt': 'Pending approval',
  'Đang bán': 'On sale',
  'Tạm dừng': 'Paused',
  'Đưa về nháp': 'Move to draft',
  'Không có thao tác': 'No available action'
}

const enToVi = Object.fromEntries(Object.entries(viToEn).map(([vi, en]) => [en, vi]))

function translateExact(value: string, dictionary: Record<string, string>, language: string) {
  const leading = value.match(/^\s*/)?.[0] ?? ''
  const trailing = value.match(/\s*$/)?.[0] ?? ''
  const core = value.trim()
  if (dictionary[core]) return `${leading}${dictionary[core]}${trailing}`
  if (language === 'en') {
    const dynamic = core
      .replace(/^Đơn #/u, 'Order #')
      .replace(/^Còn (\d+)/u, 'Remaining $1')
      .replace(/^Đã bán (\d+)/u, 'Sold $1')
      .replace(/^Đặt lúc /u, 'Placed at ')
      .replace(/^(\d+) voucher$/u, '$1 voucher(s)')
    return dynamic === core ? value : `${leading}${dynamic}${trailing}`
  }
  const dynamic = core
    .replace(/^Order #/u, 'Đơn #')
    .replace(/^Remaining (\d+)/u, 'Còn $1')
    .replace(/^Sold (\d+)/u, 'Đã bán $1')
    .replace(/^Placed at /u, 'Đặt lúc ')
    .replace(/^(\d+) voucher\(s\)$/u, '$1 voucher')
  return dynamic === core ? value : `${leading}${dynamic}${trailing}`
}

function translateTree(root: HTMLElement, dictionary: Record<string, string>, language: string) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  while (walker.nextNode()) nodes.push(walker.currentNode as Text)
  for (const node of nodes) {
    const parent = node.parentElement
    if (!parent || ['SCRIPT', 'STYLE', 'TEXTAREA', 'OPTION'].includes(parent.tagName)) continue
    const translated = translateExact(node.nodeValue ?? '', dictionary, language)
    if (translated !== node.nodeValue) node.nodeValue = translated
  }
  for (const element of root.querySelectorAll<HTMLElement>('[placeholder], [title], [aria-label]')) {
    for (const attribute of ['placeholder', 'title', 'aria-label']) {
      const current = element.getAttribute(attribute)
      if (!current) continue
      const translated = translateExact(current, dictionary, language)
      if (translated !== current) element.setAttribute(attribute, translated)
    }
  }
}

export function LanguageContentBridge() {
  const { i18n } = useTranslation()

  useEffect(() => {
    const root = document.getElementById('root')
    if (!root) return
    const isEnglish = i18n.language.startsWith('en')
    const dictionary = isEnglish ? viToEn : enToVi
    const apply = () => translateTree(root, dictionary, isEnglish ? 'en' : 'vi')
    apply()
    const observer = new MutationObserver(() => apply())
    observer.observe(root, { subtree: true, childList: true, characterData: true })
    return () => observer.disconnect()
  }, [i18n.language])

  return null
}
