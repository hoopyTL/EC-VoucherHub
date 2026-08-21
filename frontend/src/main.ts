import './styles.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL ?? '/api'
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL ?? 'admin@voucherhub.com'

type ApiResponse<T> = { success: true; data: T } | { success: false; error: string; details?: unknown }
type OrderStatus = 'PENDING_PAYMENT' | 'PAID' | 'CANCELLED' | 'REFUNDED'
type CodeStatus = 'UNUSED' | 'USED' | 'EXPIRED' | 'CANCELLED' | 'LOCKED'
type UserStatus = 'ACTIVE' | 'LOCKED'
type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
type OperatingStatus = 'ACTIVE' | 'SUSPENDED'
type VoucherStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'ON_SALE' | 'PAUSED' | 'DISCONTINUED'
type UsageResult = 'SUCCESS' | 'INVALID_CODE' | 'EXPIRED' | 'ALREADY_USED' | 'WRONG_BRANCH' | 'LOCKED'
type ContentStatus = 'draft' | 'published' | 'archived'
type ContentType = 'banner' | 'announcement' | 'policy' | 'faq'
type Language = 'vi' | 'en'
type ViewName =
  | 'dashboard'
  | 'orders'
  | 'users'
  | 'partners'
  | 'vouchers'
  | 'codes'
  | 'logs'
  | 'content'
  | 'audit'
  | 'coverage'

type ListPayload<T> = { items: T[]; nextCursor: string | null }

type AdminOrder = {
  id: string
  status: OrderStatus
  totalAmount: number
  paymentMethod: string
  paidAt: string | null
  createdAt: string
  customer: { email: string | null; phone: string | null; fullName: string }
  items: Array<{
    voucherName: string
    quantity: number
    unitPrice: number
    lineTotal: number
    remainingQuantity: number
    totalQuantity: number
  }>
  codes: Array<{ code: string; status: CodeStatus; remainingUses: number; expiresAt: string }>
}

type Dashboard = {
  totals: {
    users: number
    partners: number
    vouchers: number
    orders: number
    paidRevenue: number
    issuedCodes: number
    usedCodes: number
    cancelledCodes: number
    successfulRedemptions: number
    contentItems: number
    auditLogs: number
  }
  ordersByStatus: Array<{ status: OrderStatus; count: number }>
  topVouchers: Array<{ voucherProductId: string; name: string; partnerName: string; soldQuantity: number }>
  recentOrders: AdminOrder[]
}

type AdminUser = {
  id: string
  email: string | null
  phone: string | null
  fullName: string
  status: UserStatus
  roleName: string
  orders: number
  issuedCodes: number
  usageLogs: number
  createdAt: string
}

type AdminPartner = {
  id: string
  legalName: string
  taxCode: string
  representative: string
  approvalStatus: ApprovalStatus
  operatingStatus: OperatingStatus
  rejectReason: string | null
  owner: { email: string | null; phone: string | null; fullName: string }
  branches: number
  vouchers: number
  createdAt: string
}

type AdminVoucher = {
  id: string
  name: string
  description: string
  partnerName: string
  partnerApprovalStatus: ApprovalStatus
  partnerOperatingStatus: OperatingStatus
  categoryName: string | null
  originalPrice: number
  salePrice: number
  remainingQuantity: number
  totalQuantity: number
  status: VoucherStatus
  rejectReason: string | null
  saleStart: string
  saleEnd: string
  usageStart: string
  usageEnd: string
  orders: number
  issuedCodes: number
  branches: number
  createdAt: string
}

type AdminCode = {
  id: string
  code: string
  status: CodeStatus
  remainingUses: number
  issuedAt: string
  expiresAt: string
  orderId: string
  orderStatus: OrderStatus
  orderTotalAmount: number
  owner: { email: string | null; phone: string | null; fullName: string }
  voucherName: string
  partnerName: string
}

type AdminLog = {
  id: number
  result: UsageResult
  usedAt: string
  code: string
  codeStatus: CodeStatus
  voucherName: string
  branchName: string
  branchRegion: string
  partnerName: string
  actor: { email: string | null; phone: string | null; fullName: string }
}

type AdminContent = {
  id: string
  type: ContentType
  title: string
  body: string
  status: ContentStatus
  displayFrom: string | null
  displayTo: string | null
  createdAt: string
  updatedAt: string
  author: { email: string | null; phone: string | null; fullName: string }
}

type AdminAuditLog = {
  id: number
  action: string
  entityType: string
  entityId: string | null
  metadata: unknown
  createdAt: string
  actor: { email: string | null; phone: string | null; fullName: string } | null
}

const rootElement = document.querySelector<HTMLDivElement>('#root')
if (!rootElement) throw new Error('Root element not found')
const root = rootElement

let dashboard: Dashboard | null = null
let orders: AdminOrder[] = []
let users: AdminUser[] = []
let partners: AdminPartner[] = []
let vouchers: AdminVoucher[] = []
let codes: AdminCode[] = []
let logs: AdminLog[] = []
let contentItems: AdminContent[] = []
let auditLogs: AdminAuditLog[] = []
let selectedOrderId: string | null = null
let searchText = ''
let statusFilter = ''
let loading = false
let message = ''
let language: Language = (localStorage.getItem('voucherhub-language') as Language | null) ?? 'vi'

const navItems: Array<{ view: ViewName; labelKey: string }> = [
  { view: 'dashboard', labelKey: 'navDashboard' },
  { view: 'orders', labelKey: 'navOrders' },
  { view: 'users', labelKey: 'navUsers' },
  { view: 'partners', labelKey: 'navPartners' },
  { view: 'vouchers', labelKey: 'navVouchers' },
  { view: 'codes', labelKey: 'navCodes' },
  { view: 'logs', labelKey: 'navUsageLogs' },
  { view: 'content', labelKey: 'navContent' },
  { view: 'audit', labelKey: 'navAudit' },
  { view: 'coverage', labelKey: 'navCoverage' }
]

const copy = {
  vi: {
    navDashboard: 'Tổng quan',
    navOrders: 'Đơn hàng',
    navUsers: 'Người dùng',
    navPartners: 'Đối tác',
    navVouchers: 'Voucher',
    navCodes: 'Mã voucher',
    navUsageLogs: 'Nhật ký dùng',
    navContent: 'Nội dung',
    navAudit: 'Kiểm toán',
    navCoverage: 'TV4',
    brandSub: 'Vận hành TV4',
    heroEyebrow: 'Bảng điều phối TV4',
    heroTitle: 'Vận hành VoucherHub bằng dữ liệu thật',
    heroBody:
      'Console đọc trực tiếp PostgreSQL qua Prisma: dashboard, đơn hàng, người dùng, đối tác, voucher, mã voucher, nội dung và audit log.',
    healthReady: 'DB/API',
    healthLoading: 'Đang tải DB',
    searchPlaceholder: 'Tìm theo tên, email, mã, đối tác...',
    allStatuses: 'Tất cả trạng thái',
    reload: 'Làm mới',
    fetchErrorPrefix: 'Không tải được dữ liệu từ database/API',
    fetchErrorHint: 'Kiểm tra backend có đang chạy ở',
    dbUnavailable: 'Database chưa sẵn sàng. Hãy bật PostgreSQL/Docker, chạy migrate và seed rồi bấm Làm mới.',
    noOverview: 'Chưa có dữ liệu tổng quan từ database.',
    paidRevenue: 'Doanh thu đã thanh toán',
    paidRevenueHint: 'Tính trên đơn PAID',
    orders: 'Đơn hàng',
    allOrderStatuses: 'Tất cả trạng thái',
    voucherCodes: 'Mã voucher',
    usedCancelled: 'đã dùng, đã hủy',
    redemptions: 'Lượt sử dụng',
    usageLogsSource: 'Từ usage_logs',
    content: 'Nội dung',
    contentHint: 'FR-21 content_items',
    auditLog: 'Audit log',
    auditHint: 'FR-23 audit_logs',
    users: 'Người dùng',
    usersHint: 'Lấy từ bảng users',
    partnersVouchers: 'Đối tác / voucher',
    partners: 'Đối tác',
    dbSource: 'Lấy từ DB hiện có',
    orderStatus: 'Trạng thái đơn hàng',
    topVouchers: 'Voucher bán chạy',
    noSales: 'Chưa có dữ liệu bán hàng.',
    recentOrders: 'Đơn gần đây từ database',
    openOrders: 'Mở quản lý đơn',
    manageOrders: 'Quản lý đơn hàng',
    manageOrdersDesc: 'Tra cứu đơn, hủy đơn chờ thanh toán và hoàn tiền đơn hợp lệ trên database.',
    order: 'Đơn',
    customer: 'Khách hàng',
    status: 'Trạng thái',
    total: 'Tổng tiền',
    createdAt: 'Ngày tạo',
    actions: 'Thao tác',
    cancel: 'Hủy',
    refund: 'Hoàn tiền',
    details: 'Chi tiết',
    contact: 'Liên hệ',
    payment: 'Thanh toán',
    paidAt: 'Đã trả lúc',
    products: 'Sản phẩm',
    issuedCodes: 'Mã đã phát hành',
    expires: 'Hết hạn',
    remainingUses: 'Còn lượt',
    noCodesInOrder: 'Đơn chưa phát hành mã.',
    chooseOrder: 'Chọn một đơn hàng để xem chi tiết.',
    noOrders: 'Không có đơn hàng phù hợp.',
    usersTitle: 'Người dùng và phân quyền',
    usersDesc: 'Đọc từ users/roles, hỗ trợ khóa và mở khóa tài khoản.',
    role: 'Vai trò',
    codeCount: 'Mã',
    lock: 'Khóa',
    unlock: 'Mở khóa',
    noUsers: 'Không có người dùng phù hợp.',
    partnersTitle: 'Đối tác và chi nhánh',
    partnersDesc: 'Duyệt hồ sơ, khóa hoạt động và xem số chi nhánh/voucher từ DB.',
    owner: 'Chủ sở hữu',
    approval: 'Duyệt',
    operating: 'Hoạt động',
    branches: 'Chi nhánh',
    approve: 'Duyệt',
    reject: 'Từ chối',
    suspend: 'Tạm dừng',
    reactivate: 'Mở lại',
    taxCode: 'MST',
    noPartners: 'Không có đối tác phù hợp.',
    vouchersTitle: 'Duyệt và vận hành voucher',
    vouchersDesc: 'Kiểm soát vòng đời voucher theo trạng thái trong database.',
    price: 'Giá',
    inventory: 'Tồn kho',
    soldCodes: 'Bán/mã',
    original: 'Gốc',
    publish: 'Bán',
    pause: 'Tạm ngưng',
    noCategory: 'Không danh mục',
    noVouchers: 'Không có voucher phù hợp.',
    codesTitle: 'Mã voucher đã phát hành',
    codesDesc: 'Theo dõi vòng đời mã, chủ sở hữu, đơn hàng và ngày hết hạn.',
    noCodes: 'Không có mã voucher phù hợp.',
    usageTitle: 'Nhật ký sử dụng voucher',
    usageDesc: 'Đọc từ usage_logs để phục vụ truy vết TV4.',
    time: 'Thời điểm',
    code: 'Mã',
    branch: 'Chi nhánh',
    actor: 'Người xử lý',
    result: 'Kết quả',
    noUsageLogs: 'Chưa có usage log phù hợp.',
    contentTitle: 'Quản lý nội dung',
    contentDesc: 'CRUD tối thiểu cho banner, thông báo, chính sách và FAQ; mọi thay đổi đều ghi audit.',
    createSampleContent: 'Tạo thông báo mẫu',
    author: 'Tác giả',
    updatedAt: 'Cập nhật',
    displayWindow: 'Hiển thị',
    publishContent: 'Xuất bản',
    draftContent: 'Lưu nháp',
    archiveContent: 'Lưu trữ',
    noContent: 'Chưa có nội dung phù hợp.',
    auditTitle: 'Nhật ký kiểm toán',
    auditDesc: 'Ghi lại thao tác quản trị quan trọng: khóa user, duyệt đối tác/voucher, hủy/hoàn đơn và content.',
    entity: 'Entity',
    metadata: 'Metadata',
    noAuditLogs: 'Chưa có audit log phù hợp.',
    coverageTitle: 'TV4 - Console dùng database có sẵn',
    coverageDesc: 'Không còn fallback mock. Mọi số liệu trên màn hình này đến từ PostgreSQL qua Prisma và API backend.',
    source: 'Nguồn',
    demoFlow: 'Luồng demo để chấm TV4',
    demoStep1: 'Mở Tổng quan để chứng minh doanh thu, đơn, user, đối tác, voucher đều aggregate từ DB.',
    demoStep2: 'Mở Đơn hàng, hủy đơn PENDING_PAYMENT hoặc hoàn tiền đơn PAID có mã chưa dùng.',
    demoStep3: 'Mở Đối tác và Voucher để duyệt, từ chối, tạm dừng hoặc đưa voucher lên đang bán.',
    demoStep4: 'Mở Mã voucher và Nhật ký để truy vết phát hành, sử dụng, chi nhánh và người xử lý.',
    demoStep5: 'Mở Nội dung để xuất bản/lưu trữ content, sau đó mở Audit để thấy log mới.',
    createdContentTitle: 'Thông báo vận hành',
    createdContentBody: 'Nội dung mẫu tạo từ console TV4 để kiểm chứng CRUD và audit log.',
    createContentSuccess: 'Đã tạo nội dung mẫu.',
    publishContentSuccess: 'Đã xuất bản nội dung.',
    draftContentSuccess: 'Đã đưa nội dung về bản nháp.',
    archiveContentSuccess: 'Đã lưu trữ nội dung.',
    orderCancelSuccess: 'Đã hủy đơn thành công.',
    orderRefundSuccess: 'Đã hoàn tiền đơn thành công.',
    userStatusSuccess: 'Đã cập nhật trạng thái người dùng.',
    partnerApprovalSuccess: 'Đã cập nhật duyệt đối tác.',
    partnerOperatingSuccess: 'Đã cập nhật hoạt động đối tác.',
    voucherApprovalSuccess: 'Đã cập nhật duyệt voucher.',
    voucherStatusSuccess: 'Đã cập nhật trạng thái voucher.',
    actionFailed: 'Thao tác thất bại'
  },
  en: {
    navDashboard: 'Dashboard',
    navOrders: 'Orders',
    navUsers: 'Users',
    navPartners: 'Partners',
    navVouchers: 'Vouchers',
    navCodes: 'Voucher codes',
    navUsageLogs: 'Usage logs',
    navContent: 'Content',
    navAudit: 'Audit',
    navCoverage: 'TV4',
    brandSub: 'TV4 operations',
    heroEyebrow: 'TV4 operations console',
    heroTitle: 'Operate VoucherHub with live database data',
    heroBody:
      'This console reads PostgreSQL through Prisma: dashboard, orders, users, partners, vouchers, voucher codes, content, and audit logs.',
    healthReady: 'DB/API',
    healthLoading: 'Loading DB',
    searchPlaceholder: 'Search by name, email, code, partner...',
    allStatuses: 'All statuses',
    reload: 'Refresh',
    fetchErrorPrefix: 'Could not load data from database/API',
    fetchErrorHint: 'Check that the backend is running at',
    dbUnavailable: 'Database is not ready. Start PostgreSQL/Docker, run migrate and seed, then refresh.',
    noOverview: 'No dashboard data from the database yet.',
    paidRevenue: 'Paid revenue',
    paidRevenueHint: 'Based on PAID orders',
    orders: 'Orders',
    allOrderStatuses: 'All statuses',
    voucherCodes: 'Voucher codes',
    usedCancelled: 'used, cancelled',
    redemptions: 'Redemptions',
    usageLogsSource: 'From usage_logs',
    content: 'Content',
    contentHint: 'FR-21 content_items',
    auditLog: 'Audit log',
    auditHint: 'FR-23 audit_logs',
    users: 'Users',
    usersHint: 'From users table',
    partnersVouchers: 'Partners / vouchers',
    partners: 'Partners',
    dbSource: 'From current DB',
    orderStatus: 'Order status',
    topVouchers: 'Top vouchers',
    noSales: 'No sales data yet.',
    recentOrders: 'Recent database orders',
    openOrders: 'Open orders',
    manageOrders: 'Order management',
    manageOrdersDesc: 'Search orders, cancel pending orders, and refund eligible paid orders in the database.',
    order: 'Order',
    customer: 'Customer',
    status: 'Status',
    total: 'Total',
    createdAt: 'Created',
    actions: 'Actions',
    cancel: 'Cancel',
    refund: 'Refund',
    details: 'Details',
    contact: 'Contact',
    payment: 'Payment',
    paidAt: 'Paid at',
    products: 'Products',
    issuedCodes: 'Issued codes',
    expires: 'Expires',
    remainingUses: 'Remaining uses',
    noCodesInOrder: 'This order has no issued codes.',
    chooseOrder: 'Select an order to view details.',
    noOrders: 'No matching orders.',
    usersTitle: 'Users and permissions',
    usersDesc: 'Reads users/roles and supports locking or unlocking accounts.',
    role: 'Role',
    codeCount: 'Codes',
    lock: 'Lock',
    unlock: 'Unlock',
    noUsers: 'No matching users.',
    partnersTitle: 'Partners and branches',
    partnersDesc: 'Review profiles, suspend operations, and inspect branch/voucher counts from DB.',
    owner: 'Owner',
    approval: 'Approval',
    operating: 'Operating',
    branches: 'Branches',
    approve: 'Approve',
    reject: 'Reject',
    suspend: 'Suspend',
    reactivate: 'Reactivate',
    taxCode: 'Tax code',
    noPartners: 'No matching partners.',
    vouchersTitle: 'Voucher approval and operations',
    vouchersDesc: 'Control voucher lifecycle using database-backed statuses.',
    price: 'Price',
    inventory: 'Inventory',
    soldCodes: 'Sold/codes',
    original: 'Original',
    publish: 'Publish',
    pause: 'Pause',
    noCategory: 'No category',
    noVouchers: 'No matching vouchers.',
    codesTitle: 'Issued voucher codes',
    codesDesc: 'Track code lifecycle, owner, order, and expiry date.',
    noCodes: 'No matching voucher codes.',
    usageTitle: 'Voucher usage logs',
    usageDesc: 'Reads usage_logs for TV4 traceability.',
    time: 'Time',
    code: 'Code',
    branch: 'Branch',
    actor: 'Actor',
    result: 'Result',
    noUsageLogs: 'No matching usage logs.',
    contentTitle: 'Content management',
    contentDesc: 'Minimal CRUD for banners, announcements, policies, and FAQ; every change writes audit logs.',
    createSampleContent: 'Create sample notice',
    author: 'Author',
    updatedAt: 'Updated',
    displayWindow: 'Display',
    publishContent: 'Publish',
    draftContent: 'Draft',
    archiveContent: 'Archive',
    noContent: 'No matching content.',
    auditTitle: 'Audit trail',
    auditDesc: 'Tracks important admin actions: user locks, partner/voucher reviews, order cancel/refund, and content.',
    entity: 'Entity',
    metadata: 'Metadata',
    noAuditLogs: 'No matching audit logs.',
    coverageTitle: 'TV4 - Console using existing database',
    coverageDesc: 'No mock fallback. Every number on this screen comes from PostgreSQL through Prisma and the API.',
    source: 'Source',
    demoFlow: 'TV4 grading demo flow',
    demoStep1: 'Open Dashboard to prove revenue, orders, users, partners, and vouchers aggregate from DB.',
    demoStep2: 'Open Orders, cancel a PENDING_PAYMENT order or refund a PAID order with unused codes.',
    demoStep3: 'Open Partners and Vouchers to approve, reject, suspend, or publish vouchers.',
    demoStep4: 'Open Voucher codes and Usage logs to trace issuance, usage, branch, and actor.',
    demoStep5: 'Open Content to publish/archive content, then open Audit to see the new log.',
    createdContentTitle: 'Operations notice',
    createdContentBody: 'Sample content created from the TV4 console to verify CRUD and audit logs.',
    createContentSuccess: 'Sample content created.',
    publishContentSuccess: 'Content published.',
    draftContentSuccess: 'Content moved back to draft.',
    archiveContentSuccess: 'Content archived.',
    orderCancelSuccess: 'Order cancelled successfully.',
    orderRefundSuccess: 'Order refunded successfully.',
    userStatusSuccess: 'User status updated.',
    partnerApprovalSuccess: 'Partner review updated.',
    partnerOperatingSuccess: 'Partner operating status updated.',
    voucherApprovalSuccess: 'Voucher review updated.',
    voucherStatusSuccess: 'Voucher status updated.',
    actionFailed: 'Action failed'
  }
} satisfies Record<Language, Record<string, string>>

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function e(value: unknown) {
  return escapeHtml(value)
}

function t(key: string) {
  const dictionary = copy[language] as Record<string, string>
  return dictionary[key] ?? key
}

function currentView(): ViewName {
  const hash = window.location.hash.replace('#', '')
  return navItems.some((item) => item.view === hash) ? (hash as ViewName) : 'dashboard'
}

function currency(value: number) {
  return new Intl.NumberFormat(language === 'vi' ? 'vi-VN' : 'en-US', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(value)
}

function dateTime(value: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value))
}

function statusLabel(status: string) {
  const labels: Record<Language, Record<string, string>> = {
    vi: {
      ACTIVE: 'Hoạt động',
      LOCKED: 'Bị khóa',
      SUSPENDED: 'Tạm dừng',
      PENDING: 'Chờ duyệt',
      APPROVED: 'Đã duyệt',
      REJECTED: 'Từ chối',
      DRAFT: 'Nháp',
      PENDING_REVIEW: 'Chờ duyệt',
      ON_SALE: 'Đang bán',
      PAUSED: 'Tạm ngưng',
      DISCONTINUED: 'Ngừng bán',
      PENDING_PAYMENT: 'Chờ thanh toán',
      PAID: 'Đã thanh toán',
      CANCELLED: 'Đã hủy',
      REFUNDED: 'Đã hoàn tiền',
      UNUSED: 'Chưa dùng',
      USED: 'Đã dùng',
      EXPIRED: 'Hết hạn',
      SUCCESS: 'Thành công',
      INVALID_CODE: 'Mã sai',
      ALREADY_USED: 'Đã dùng',
      WRONG_BRANCH: 'Sai chi nhánh',
      draft: 'Bản nháp',
      published: 'Đã xuất bản',
      archived: 'Đã lưu trữ',
      banner: 'Banner',
      announcement: 'Thông báo',
      policy: 'Chính sách',
      faq: 'FAQ'
    },
    en: {
      ACTIVE: 'Active',
      LOCKED: 'Locked',
      SUSPENDED: 'Suspended',
      PENDING: 'Pending',
      APPROVED: 'Approved',
      REJECTED: 'Rejected',
      DRAFT: 'Draft',
      PENDING_REVIEW: 'Pending review',
      ON_SALE: 'On sale',
      PAUSED: 'Paused',
      DISCONTINUED: 'Discontinued',
      PENDING_PAYMENT: 'Pending payment',
      PAID: 'Paid',
      CANCELLED: 'Cancelled',
      REFUNDED: 'Refunded',
      UNUSED: 'Unused',
      USED: 'Used',
      EXPIRED: 'Expired',
      SUCCESS: 'Success',
      INVALID_CODE: 'Invalid code',
      ALREADY_USED: 'Already used',
      WRONG_BRANCH: 'Wrong branch',
      draft: 'Draft',
      published: 'Published',
      archived: 'Archived',
      banner: 'Banner',
      announcement: 'Announcement',
      policy: 'Policy',
      faq: 'FAQ'
    }
  }
  return labels[language][status] ?? status
}

function badge(status: string) {
  return `<span class="badge ${status.toLowerCase()}">${e(statusLabel(status))}</span>`
}

function contact(person: { email: string | null; phone: string | null; fullName: string }) {
  return `${e(person.fullName)}<span>${e(person.email ?? person.phone ?? '-')}</span>`
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', 'X-Admin-Email': ADMIN_EMAIL },
      ...init
    })
  } catch (error) {
    throw new Error(`${error instanceof Error ? error.message : 'Network error'}. ${t('fetchErrorHint')} ${API_BASE}.`)
  }

  const payload = (await response.json()) as ApiResponse<T>
  if (!payload.success) {
    if (payload.error.includes('Database is unavailable')) throw new Error(t('dbUnavailable'))
    throw new Error(payload.error)
  }
  return payload.data
}

async function patchAction<T>(path: string, body?: unknown) {
  return api<T>(path, {
    method: 'PATCH',
    body: JSON.stringify(body ?? {})
  })
}

async function postAction<T>(path: string, body?: unknown) {
  return api<T>(path, {
    method: 'POST',
    body: JSON.stringify(body ?? {})
  })
}

async function deleteAction<T>(path: string) {
  return api<T>(path, { method: 'DELETE' })
}

function queryFor(view: ViewName) {
  const params = new URLSearchParams()
  const activeView = currentView()
  if (
    activeView === view &&
    statusFilter &&
    ['orders', 'users', 'partners', 'vouchers', 'codes', 'content'].includes(view)
  ) {
    params.set('status', statusFilter)
  }
  if (activeView === view && searchText && view !== 'dashboard' && view !== 'coverage') params.set('q', searchText)
  params.set('limit', '100')
  return params.toString()
}

async function loadAll() {
  loading = true
  message = ''
  render()

  try {
    const [dashboardData, orderData, userData, partnerData, voucherData, codeData, logData, contentData, auditData] =
      await Promise.all([
        api<Dashboard>('/admin/dashboard'),
        api<ListPayload<AdminOrder>>(`/admin/orders?${queryFor('orders')}`),
        api<ListPayload<AdminUser>>(`/admin/users?${queryFor('users')}`),
        api<ListPayload<AdminPartner>>(`/admin/partners?${queryFor('partners')}`),
        api<ListPayload<AdminVoucher>>(`/admin/vouchers?${queryFor('vouchers')}`),
        api<ListPayload<AdminCode>>(`/admin/codes?${queryFor('codes')}`),
        api<ListPayload<AdminLog>>(`/admin/usage-logs?${queryFor('logs')}`),
        api<ListPayload<AdminContent>>(`/admin/content?${queryFor('content')}`),
        api<ListPayload<AdminAuditLog>>(`/admin/audit-logs?${queryFor('audit')}`)
      ])

    dashboard = dashboardData
    orders = orderData.items
    users = userData.items
    partners = partnerData.items
    vouchers = voucherData.items
    codes = codeData.items
    logs = logData.items
    contentItems = contentData.items
    auditLogs = auditData.items
    selectedOrderId =
      selectedOrderId && orders.some((order) => order.id === selectedOrderId)
        ? selectedOrderId
        : (orders[0]?.id ?? null)
  } catch (error) {
    dashboard = null
    orders = []
    users = []
    partners = []
    vouchers = []
    codes = []
    logs = []
    contentItems = []
    auditLogs = []
    selectedOrderId = null
    message = `${t('fetchErrorPrefix')}: ${error instanceof Error ? error.message : 'Unknown error'}`
  } finally {
    loading = false
    render()
  }
}

async function runAction(action: () => Promise<unknown>, successMessage: string) {
  loading = true
  message = ''
  render()

  try {
    await action()
    message = successMessage
    await loadAll()
  } catch (error) {
    message = error instanceof Error ? error.message : t('actionFailed')
    loading = false
    render()
  }
}

function metricCard(label: string, value: string, hint: string) {
  return `
    <article class="metric">
      <span>${e(label)}</span>
      <strong>${e(value)}</strong>
      <small>${e(hint)}</small>
    </article>
  `
}

function renderFilters() {
  const view = currentView()
  const statusOptions: Partial<Record<ViewName, string[]>> = {
    orders: ['PENDING_PAYMENT', 'PAID', 'CANCELLED', 'REFUNDED'],
    users: ['ACTIVE', 'LOCKED'],
    partners: ['PENDING', 'APPROVED', 'REJECTED'],
    vouchers: ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ON_SALE', 'PAUSED', 'DISCONTINUED'],
    codes: ['UNUSED', 'USED', 'EXPIRED', 'CANCELLED', 'LOCKED'],
    content: ['draft', 'published', 'archived']
  }
  const options = statusOptions[view] ?? []
  if (!options.length && !['logs', 'audit'].includes(view)) return ''

  return `
    <div class="filters global-filters">
      <input id="search-input" value="${e(searchText)}" placeholder="${e(t('searchPlaceholder'))}" />
      ${
        options.length
          ? `<select id="status-filter">
              <option value="">${e(t('allStatuses'))}</option>
              ${options.map((item) => `<option value="${item}" ${statusFilter === item ? 'selected' : ''}>${e(statusLabel(item))}</option>`).join('')}
            </select>`
          : ''
      }
      <button id="reload-btn" class="icon-btn" aria-label="${e(t('reload'))}">R</button>
    </div>
  `
}

function renderDashboard() {
  if (!dashboard) return `<section class="panel empty">${e(t('noOverview'))}</section>`
  const total = dashboard.totals
  const maxStatus = Math.max(...dashboard.ordersByStatus.map((item) => item.count), 1)
  return `
    <section class="metrics" aria-label="Dashboard">
      ${metricCard(t('paidRevenue'), currency(total.paidRevenue), t('paidRevenueHint'))}
      ${metricCard(t('orders'), String(total.orders), t('allOrderStatuses'))}
      ${metricCard(t('voucherCodes'), String(total.issuedCodes), `${total.usedCodes} / ${total.cancelledCodes} ${t('usedCancelled')}`)}
      ${metricCard(t('redemptions'), String(total.successfulRedemptions), t('usageLogsSource'))}
      ${metricCard(t('content'), String(total.contentItems), t('contentHint'))}
      ${metricCard(t('auditLog'), String(total.auditLogs), t('auditHint'))}
      ${metricCard(t('users'), String(total.users), t('usersHint'))}
      ${metricCard(t('partnersVouchers'), `${total.partners} / ${total.vouchers}`, t('dbSource'))}
    </section>
    <div class="grid-two">
      <section class="panel">
        <div class="panel-title"><h2>${e(t('orderStatus'))}</h2></div>
        <div class="bars">
          ${dashboard.ordersByStatus
            .map(
              (item) => `
                <div class="bar-row">
                  <span>${e(statusLabel(item.status))}</span>
                  <div class="bar"><i style="width:${(item.count / maxStatus) * 100}%"></i></div>
                  <strong>${item.count}</strong>
                </div>
              `
            )
            .join('')}
        </div>
      </section>
      <section class="panel">
        <div class="panel-title"><h2>${e(t('topVouchers'))}</h2></div>
        <div class="compact-list">
          ${
            dashboard.topVouchers.length
              ? dashboard.topVouchers
                  .map(
                    (voucher) => `
                      <div>
                        <strong>${e(voucher.name)}</strong>
                        <span>${e(voucher.partnerName)}</span>
                        <b>${voucher.soldQuantity}</b>
                      </div>
                    `
                  )
                  .join('')
              : `<p class="muted">${e(t('noSales'))}</p>`
          }
        </div>
      </section>
    </div>
    <section class="panel">
      <div class="panel-title">
        <h2>${e(t('recentOrders'))}</h2>
        <a class="text-link" href="#orders">${e(t('openOrders'))}</a>
      </div>
      <div class="compact-list">
        ${dashboard.recentOrders
          .map(
            (order) => `
              <div>
                <strong>${contact(order.customer)}</strong>
                <span>${e(order.id.slice(0, 14))} - ${e(statusLabel(order.status))}</span>
                <b>${currency(order.totalAmount)}</b>
              </div>
            `
          )
          .join('')}
      </div>
    </section>
  `
}

function renderOrders() {
  const selected = orders.find((order) => order.id === selectedOrderId)
  return `
    <div class="grid-orders">
      <section class="panel orders-panel">
        <div class="panel-title">
          <div>
            <h2>${e(t('manageOrders'))}</h2>
            <p>${e(t('manageOrdersDesc'))}</p>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>${e(t('order'))}</th><th>${e(t('customer'))}</th><th>${e(t('status'))}</th><th>${e(t('total'))}</th><th>${e(t('createdAt'))}</th><th>${e(t('actions'))}</th></tr></thead>
            <tbody>
              ${
                orders.length
                  ? orders
                      .map(
                        (order) => `
                          <tr class="${selectedOrderId === order.id ? 'selected' : ''}">
                            <td><button class="link-btn" data-select-order="${e(order.id)}">${e(order.id.slice(0, 12))}</button></td>
                            <td><strong>${contact(order.customer)}</strong></td>
                            <td>${badge(order.status)}</td>
                            <td>${currency(order.totalAmount)}</td>
                            <td>${dateTime(order.createdAt)}</td>
                            <td class="row-actions">
                              <button data-cancel-order="${e(order.id)}" ${order.status !== 'PENDING_PAYMENT' ? 'disabled' : ''}>${e(t('cancel'))}</button>
                              <button data-refund-order="${e(order.id)}" ${order.status !== 'PAID' ? 'disabled' : ''}>${e(t('refund'))}</button>
                            </td>
                          </tr>
                        `
                      )
                      .join('')
                  : `<tr><td colspan="6" class="empty">${e(t('noOrders'))}</td></tr>`
              }
            </tbody>
          </table>
        </div>
      </section>
      <section class="panel detail-panel">
        ${
          selected
            ? `
              <div class="panel-title">
                <h2>${e(t('details'))} ${e(selected.id.slice(0, 12))}</h2>
                ${badge(selected.status)}
              </div>
              <dl class="detail-grid">
                <div><dt>${e(t('customer'))}</dt><dd>${e(selected.customer.fullName)}</dd></div>
                <div><dt>${e(t('contact'))}</dt><dd>${e(selected.customer.email ?? selected.customer.phone ?? '-')}</dd></div>
                <div><dt>${e(t('payment'))}</dt><dd>${e(selected.paymentMethod)}</dd></div>
                <div><dt>${e(t('paidAt'))}</dt><dd>${dateTime(selected.paidAt)}</dd></div>
              </dl>
              <h3>${e(t('products'))}</h3>
              <div class="line-list">
                ${selected.items
                  .map(
                    (item) => `
                      <div>
                        <strong>${e(item.voucherName)}</strong>
                        <span>${item.quantity} x ${currency(item.unitPrice)} - ${item.remainingQuantity}/${item.totalQuantity}</span>
                        <b>${currency(item.lineTotal)}</b>
                      </div>
                    `
                  )
                  .join('')}
              </div>
              <h3>${e(t('issuedCodes'))}</h3>
              <div class="code-list">
                ${
                  selected.codes.length
                    ? selected.codes
                        .map(
                          (code) => `
                            <div>
                              <code>${e(code.code)}</code>
                              ${badge(code.status)}
                              <small>${e(t('expires'))}: ${dateTime(code.expiresAt)} - ${e(t('remainingUses'))}: ${code.remainingUses}</small>
                            </div>
                          `
                        )
                        .join('')
                    : `<p class="muted">${e(t('noCodesInOrder'))}</p>`
                }
              </div>
            `
            : `<div class="empty">${e(t('chooseOrder'))}</div>`
        }
      </section>
    </div>
  `
}

function renderUsers() {
  return `
    <section class="panel">
      <div class="panel-title"><h2>${e(t('usersTitle'))}</h2><p>${e(t('usersDesc'))}</p></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>${e(t('users'))}</th><th>${e(t('role'))}</th><th>${e(t('status'))}</th><th>${e(t('orders'))}</th><th>${e(t('codeCount'))}</th><th>${e(t('createdAt'))}</th><th>${e(t('actions'))}</th></tr></thead>
          <tbody>
            ${
              users
                .map(
                  (user) => `
                  <tr>
                    <td><strong>${contact(user)}</strong></td>
                    <td>${e(user.roleName)}</td>
                    <td>${badge(user.status)}</td>
                    <td>${user.orders}</td>
                    <td>${user.issuedCodes}</td>
                    <td>${dateTime(user.createdAt)}</td>
                    <td><button data-user-status="${e(user.id)}" data-next-status="${user.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE'}">${e(user.status === 'ACTIVE' ? t('lock') : t('unlock'))}</button></td>
                  </tr>
                `
                )
                .join('') || `<tr><td colspan="7" class="empty">${e(t('noUsers'))}</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </section>
  `
}

function renderPartners() {
  return `
    <section class="panel">
      <div class="panel-title"><h2>${e(t('partnersTitle'))}</h2><p>${e(t('partnersDesc'))}</p></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>${e(t('partners'))}</th><th>${e(t('owner'))}</th><th>${e(t('approval'))}</th><th>${e(t('operating'))}</th><th>${e(t('branches'))}</th><th>Voucher</th><th>${e(t('actions'))}</th></tr></thead>
          <tbody>
            ${
              partners
                .map(
                  (partner) => `
                  <tr>
                    <td><strong>${e(partner.legalName)}</strong><span>${e(t('taxCode'))} ${e(partner.taxCode)} - ${e(partner.representative)}</span></td>
                    <td><strong>${contact(partner.owner)}</strong></td>
                    <td>${badge(partner.approvalStatus)}</td>
                    <td>${badge(partner.operatingStatus)}</td>
                    <td>${partner.branches}</td>
                    <td>${partner.vouchers}</td>
                    <td class="row-actions">
                      <button data-partner-approval="${e(partner.id)}" data-approval="APPROVED" ${partner.approvalStatus === 'APPROVED' ? 'disabled' : ''}>${e(t('approve'))}</button>
                      <button data-partner-approval="${e(partner.id)}" data-approval="REJECTED" ${partner.approvalStatus === 'REJECTED' ? 'disabled' : ''}>${e(t('reject'))}</button>
                      <button data-partner-operating="${e(partner.id)}" data-operating="${partner.operatingStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'}">${e(partner.operatingStatus === 'ACTIVE' ? t('suspend') : t('reactivate'))}</button>
                    </td>
                  </tr>
                `
                )
                .join('') || `<tr><td colspan="7" class="empty">${e(t('noPartners'))}</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </section>
  `
}

function renderVouchers() {
  return `
    <section class="panel">
      <div class="panel-title"><h2>${e(t('vouchersTitle'))}</h2><p>${e(t('vouchersDesc'))}</p></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Voucher</th><th>${e(t('partners'))}</th><th>${e(t('price'))}</th><th>${e(t('inventory'))}</th><th>${e(t('status'))}</th><th>${e(t('soldCodes'))}</th><th>${e(t('actions'))}</th></tr></thead>
          <tbody>
            ${
              vouchers
                .map(
                  (voucher) => `
                  <tr>
                    <td><strong>${e(voucher.name)}</strong><span>${e(voucher.categoryName ?? t('noCategory'))} - ${dateTime(voucher.saleStart)} - ${dateTime(voucher.saleEnd)}</span></td>
                    <td><strong>${e(voucher.partnerName)}</strong><span>${e(statusLabel(voucher.partnerApprovalStatus))} - ${e(statusLabel(voucher.partnerOperatingStatus))}</span></td>
                    <td><strong>${currency(voucher.salePrice)}</strong><span>${e(t('original'))} ${currency(voucher.originalPrice)}</span></td>
                    <td>${voucher.remainingQuantity}/${voucher.totalQuantity}<span>${voucher.branches} ${e(t('branches').toLowerCase())}</span></td>
                    <td>${badge(voucher.status)}</td>
                    <td>${voucher.orders}/${voucher.issuedCodes}</td>
                    <td class="row-actions">
                      <button data-voucher-approval="${e(voucher.id)}" data-voucher-approval-status="APPROVED" ${voucher.status === 'APPROVED' ? 'disabled' : ''}>${e(t('approve'))}</button>
                      <button data-voucher-approval="${e(voucher.id)}" data-voucher-approval-status="REJECTED" ${voucher.status === 'REJECTED' ? 'disabled' : ''}>${e(t('reject'))}</button>
                      <button data-voucher-status="${e(voucher.id)}" data-voucher-status-next="ON_SALE" ${voucher.status === 'ON_SALE' ? 'disabled' : ''}>${e(t('publish'))}</button>
                      <button data-voucher-status="${e(voucher.id)}" data-voucher-status-next="PAUSED" ${voucher.status === 'PAUSED' ? 'disabled' : ''}>${e(t('pause'))}</button>
                    </td>
                  </tr>
                `
                )
                .join('') || `<tr><td colspan="7" class="empty">${e(t('noVouchers'))}</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </section>
  `
}

function renderCodes() {
  return `
    <section class="panel">
      <div class="panel-title"><h2>${e(t('codesTitle'))}</h2><p>${e(t('codesDesc'))}</p></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>${e(t('code'))}</th><th>Voucher</th><th>${e(t('owner'))}</th><th>${e(t('order'))}</th><th>${e(t('status'))}</th><th>${e(t('expires'))}</th></tr></thead>
          <tbody>
            ${
              codes
                .map(
                  (code) => `
                  <tr>
                    <td><code>${e(code.code)}</code><span>${dateTime(code.issuedAt)}</span></td>
                    <td><strong>${e(code.voucherName)}</strong><span>${e(code.partnerName)}</span></td>
                    <td><strong>${contact(code.owner)}</strong></td>
                    <td><strong>${e(code.orderId.slice(0, 12))}</strong><span>${e(statusLabel(code.orderStatus))} - ${currency(code.orderTotalAmount)}</span></td>
                    <td>${badge(code.status)}<span>${e(t('remainingUses'))}: ${code.remainingUses}</span></td>
                    <td>${dateTime(code.expiresAt)}</td>
                  </tr>
                `
                )
                .join('') || `<tr><td colspan="6" class="empty">${e(t('noCodes'))}</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </section>
  `
}

function renderLogs() {
  return `
    <section class="panel">
      <div class="panel-title"><h2>${e(t('usageTitle'))}</h2><p>${e(t('usageDesc'))}</p></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>${e(t('time'))}</th><th>${e(t('code'))}</th><th>Voucher</th><th>${e(t('branch'))}</th><th>${e(t('actor'))}</th><th>${e(t('result'))}</th></tr></thead>
          <tbody>
            ${
              logs
                .map(
                  (log) => `
                  <tr>
                    <td>${dateTime(log.usedAt)}</td>
                    <td><code>${e(log.code)}</code><span>${e(statusLabel(log.codeStatus))}</span></td>
                    <td>${e(log.voucherName)}</td>
                    <td><strong>${e(log.branchName)}</strong><span>${e(log.partnerName)} - ${e(log.branchRegion)}</span></td>
                    <td><strong>${contact(log.actor)}</strong></td>
                    <td>${badge(log.result)}</td>
                  </tr>
                `
                )
                .join('') || `<tr><td colspan="6" class="empty">${e(t('noUsageLogs'))}</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </section>
  `
}

function renderContent() {
  return `
    <section class="panel">
      <div class="panel-title">
        <div>
          <h2>${e(t('contentTitle'))}</h2>
          <p>${e(t('contentDesc'))}</p>
        </div>
        <button id="create-content-btn">${e(t('createSampleContent'))}</button>
      </div>
      <div class="content-grid">
        ${
          contentItems
            .map(
              (item) => `
                <article class="content-card">
                  <div>
                    ${badge(item.status)}
                    <span class="content-type">${e(statusLabel(item.type))}</span>
                  </div>
                  <h3>${e(item.title)}</h3>
                  <p>${e(item.body)}</p>
                  <dl class="mini-meta">
                    <div><dt>${e(t('author'))}</dt><dd>${e(item.author.fullName)}</dd></div>
                    <div><dt>${e(t('updatedAt'))}</dt><dd>${dateTime(item.updatedAt)}</dd></div>
                    <div><dt>${e(t('displayWindow'))}</dt><dd>${dateTime(item.displayFrom)} - ${dateTime(item.displayTo)}</dd></div>
                  </dl>
                  <div class="row-actions">
                    <button data-content-publish="${e(item.id)}" ${item.status === 'published' ? 'disabled' : ''}>${e(t('publishContent'))}</button>
                    <button data-content-draft="${e(item.id)}" ${item.status === 'draft' ? 'disabled' : ''}>${e(t('draftContent'))}</button>
                    <button data-content-archive="${e(item.id)}" ${item.status === 'archived' ? 'disabled' : ''}>${e(t('archiveContent'))}</button>
                  </div>
                </article>
              `
            )
            .join('') || `<div class="empty">${e(t('noContent'))}</div>`
        }
      </div>
    </section>
  `
}

function metadataSummary(value: unknown) {
  if (!value) return '-'
  const raw = JSON.stringify(value)
  return raw.length > 120 ? `${raw.slice(0, 117)}...` : raw
}

function renderAudit() {
  return `
    <section class="panel">
      <div class="panel-title">
        <div>
          <h2>${e(t('auditTitle'))}</h2>
          <p>${e(t('auditDesc'))}</p>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>${e(t('time'))}</th><th>${e(t('actor'))}</th><th>Action</th><th>${e(t('entity'))}</th><th>${e(t('metadata'))}</th></tr></thead>
          <tbody>
            ${
              auditLogs
                .map(
                  (log) => `
                    <tr>
                      <td>${dateTime(log.createdAt)}</td>
                      <td><strong>${log.actor ? contact(log.actor) : 'System<span>-</span>'}</strong></td>
                      <td><code>${e(log.action)}</code></td>
                      <td><strong>${e(log.entityType)}</strong><span>${e(log.entityId ?? '-')}</span></td>
                      <td><span>${e(metadataSummary(log.metadata))}</span></td>
                    </tr>
                  `
                )
                .join('') || `<tr><td colspan="5" class="empty">${e(t('noAuditLogs'))}</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </section>
  `
}

function renderCoverage() {
  function count(v: unknown) {
    if (Array.isArray(v)) return v.length
    if (typeof v === 'number') return v
    return 0
  }

  const checks = [
    ['FR-17', t('usersTitle'), count(users), 'users + roles'],
    ['FR-18', t('partnersTitle'), count(partners), 'partners + branches'],
    ['FR-19', t('vouchersTitle'), count(vouchers), 'voucher_products'],
    ['FR-20', t('manageOrders'), count(orders), 'orders + order_items'],
    ['FR-21', t('contentTitle'), count(contentItems), 'content_items'],
    ['FR-22', t('navDashboard'), dashboard ? 1 : 0, 'aggregate from DB'],
    ['FR-23', t('auditTitle'), count(auditLogs), 'audit_logs'],
    ['BR-04/05', t('voucherCodes'), count(codes), 'issued_voucher_codes'],
    ['KPI-04', t('paidRevenue'), dashboard?.totals?.paidRevenue ?? 0, 'paid revenue']
  ]
  return `
    <section class="panel integration-hero">
      <div>
        <h2>${e(t('coverageTitle'))}</h2>
        <p>${e(t('coverageDesc'))}</p>
      </div>
      <span class="badge paid">DB/API</span>
    </section>
    <section class="panel">
      <div class="check-grid">
        ${checks
          .map(
            ([code, title, count, source]) => `
              <article class="check-card">
                <strong>${e(code)} - ${e(title)}</strong>
                <span>${e(t('source'))}: ${e(source)}</span>
                <b>${e(count)}</b>
              </article>
            `
          )
          .join('')}
      </div>
    </section>
    <section class="panel">
      <div class="panel-title"><h2>${e(t('demoFlow'))}</h2></div>
      <ol class="script-list">
        <li>${e(t('demoStep1'))}</li>
        <li>${e(t('demoStep2'))}</li>
        <li>${e(t('demoStep3'))}</li>
        <li>${e(t('demoStep4'))}</li>
        <li>${e(t('demoStep5'))}</li>
      </ol>
    </section>
  `
}

function renderCurrentView() {
  const view = currentView()
  if (view === 'orders') return renderOrders()
  if (view === 'users') return renderUsers()
  if (view === 'partners') return renderPartners()
  if (view === 'vouchers') return renderVouchers()
  if (view === 'codes') return renderCodes()
  if (view === 'logs') return renderLogs()
  if (view === 'content') return renderContent()
  if (view === 'audit') return renderAudit()
  if (view === 'coverage') return renderCoverage()
  return renderDashboard()
}

function render() {
  const view = currentView()
  root.innerHTML = `
    <main class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <span>VH</span>
          <div>
            <strong>VoucherHub</strong>
            <small>${e(t('brandSub'))}</small>
          </div>
        </div>
        <nav>
          ${navItems.map((item) => `<a class="${view === item.view ? 'active' : ''}" href="#${item.view}">${e(t(item.labelKey))}</a>`).join('')}
        </nav>
      </aside>
      <section class="workspace">
        <header class="topbar">
          <div class="hero-copy">
            <p>${e(t('heroEyebrow'))}</p>
            <h1>${e(t('heroTitle'))}</h1>
            <span>${e(t('heroBody'))}</span>
          </div>
          <div class="toolbar">
            <div class="language-toggle" aria-label="Language">
              <button class="${language === 'vi' ? 'active' : ''}" data-language="vi">VI</button>
              <button class="${language === 'en' ? 'active' : ''}" data-language="en">EN</button>
            </div>
            <span class="health ${loading ? 'loading' : ''}">${loading ? e(t('healthLoading')) : e(t('healthReady'))}</span>
          </div>
        </header>
        ${renderFilters()}
        ${message ? `<div class="notice" role="status">${e(message)}</div>` : ''}
        ${renderCurrentView()}
      </section>
    </main>
  `
  bindEvents()
}

function bindEvents() {
  document.querySelectorAll<HTMLButtonElement>('[data-language]').forEach((button) => {
    button.addEventListener('click', () => {
      const nextLanguage = button.dataset.language
      if (nextLanguage === 'vi' || nextLanguage === 'en') {
        language = nextLanguage
        localStorage.setItem('voucherhub-language', language)
        render()
      }
    })
  })
  document.querySelector<HTMLButtonElement>('#reload-btn')?.addEventListener('click', () => void loadAll())
  document.querySelector<HTMLInputElement>('#search-input')?.addEventListener('input', (event) => {
    searchText = (event.currentTarget as HTMLInputElement).value.trim()
    void loadAll()
  })
  document.querySelector<HTMLSelectElement>('#status-filter')?.addEventListener('change', (event) => {
    statusFilter = (event.currentTarget as HTMLSelectElement).value
    void loadAll()
  })
  document.querySelectorAll<HTMLButtonElement>('[data-select-order]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedOrderId = button.dataset.selectOrder ?? null
      render()
    })
  })
  document.querySelectorAll<HTMLButtonElement>('[data-cancel-order]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.cancelOrder
      if (id) void runAction(() => patchAction(`/admin/orders/${id}/cancel`), t('orderCancelSuccess'))
    })
  })
  document.querySelectorAll<HTMLButtonElement>('[data-refund-order]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.refundOrder
      if (id) void runAction(() => patchAction(`/admin/orders/${id}/refund`), t('orderRefundSuccess'))
    })
  })
  document.querySelectorAll<HTMLButtonElement>('[data-user-status]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.userStatus
      const status = button.dataset.nextStatus
      if (id && status)
        void runAction(() => patchAction(`/admin/users/${id}/status`, { status }), t('userStatusSuccess'))
    })
  })
  document.querySelectorAll<HTMLButtonElement>('[data-partner-approval]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.partnerApproval
      const approvalStatus = button.dataset.approval
      if (id && approvalStatus) {
        void runAction(
          () =>
            patchAction(`/admin/partners/${id}/approval`, {
              approvalStatus,
              rejectReason: 'Khong dat dieu kien duyet TV4'
            }),
          t('partnerApprovalSuccess')
        )
      }
    })
  })
  document.querySelectorAll<HTMLButtonElement>('[data-partner-operating]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.partnerOperating
      const operatingStatus = button.dataset.operating
      if (id && operatingStatus) {
        void runAction(
          () => patchAction(`/admin/partners/${id}/operating-status`, { operatingStatus }),
          t('partnerOperatingSuccess')
        )
      }
    })
  })
  document.querySelectorAll<HTMLButtonElement>('[data-voucher-approval]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.voucherApproval
      const status = button.dataset.voucherApprovalStatus
      if (id && status) {
        void runAction(
          () => patchAction(`/admin/vouchers/${id}/approval`, { status, rejectReason: 'Voucher chua dat yeu cau TV4' }),
          t('voucherApprovalSuccess')
        )
      }
    })
  })
  document.querySelectorAll<HTMLButtonElement>('[data-voucher-status]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.voucherStatus
      const status = button.dataset.voucherStatusNext
      if (id && status)
        void runAction(() => patchAction(`/admin/vouchers/${id}/status`, { status }), t('voucherStatusSuccess'))
    })
  })
  document.querySelector<HTMLButtonElement>('#create-content-btn')?.addEventListener('click', () => {
    void runAction(
      () =>
        postAction('/admin/content', {
          type: 'announcement',
          title: `${t('createdContentTitle')} ${new Date().toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US')}`,
          body: t('createdContentBody'),
          status: 'draft'
        }),
      t('createContentSuccess')
    )
  })
  document.querySelectorAll<HTMLButtonElement>('[data-content-publish]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.contentPublish
      if (id)
        void runAction(() => patchAction(`/admin/content/${id}`, { status: 'published' }), t('publishContentSuccess'))
    })
  })
  document.querySelectorAll<HTMLButtonElement>('[data-content-draft]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.contentDraft
      if (id) void runAction(() => patchAction(`/admin/content/${id}`, { status: 'draft' }), t('draftContentSuccess'))
    })
  })
  document.querySelectorAll<HTMLButtonElement>('[data-content-archive]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.contentArchive
      if (id) void runAction(() => deleteAction(`/admin/content/${id}`), t('archiveContentSuccess'))
    })
  })
}

window.addEventListener('hashchange', () => {
  statusFilter = ''
  searchText = ''
  render()
})

render()
void loadAll()
