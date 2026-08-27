import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios'

const NOW = '2026-08-02T08:00:00.000Z'
const SALE_START = '2026-07-01T00:00:00.000Z'
const SALE_END = '2026-12-31T23:59:59.000Z'

const BRANCHES = [
  {
    id: 'branch-d1',
    name: 'VoucherHub Quận 1',
    address: '12 Nguyễn Huệ, Quận 1, TP.HCM',
    region: 'TP.HCM',
    contact: '028 3822 1234',
    isActive: true,
    partnerId: 'partner-1',
    createdAt: NOW,
    updatedAt: NOW
  },
  {
    id: 'branch-d2',
    name: 'VoucherHub Thảo Điền',
    address: '48 Xuân Thủy, TP. Thủ Đức, TP.HCM',
    region: 'TP.HCM',
    contact: '028 3744 5678',
    isActive: true,
    partnerId: 'partner-1',
    createdAt: NOW,
    updatedAt: NOW
  }
]

function voucher(
  id: string,
  title: string,
  category: string,
  originalPrice: number,
  salePrice: number,
  soldQuantity: number
) {
  return {
    id,
    title,
    description: `${title} với quy trình sử dụng đơn giản tại các chi nhánh áp dụng.`,
    category,
    originalPrice: String(originalPrice),
    salePrice: String(salePrice),
    totalQuantity: 100,
    soldQuantity,
    salePeriodStart: SALE_START,
    salePeriodEnd: SALE_END,
    usagePeriodStart: SALE_START,
    usagePeriodEnd: SALE_END,
    terms: 'Áp dụng một lần. Không quy đổi thành tiền mặt.',
    imageUrl: null,
    status: 'APPROVED',
    rejectionReason: null,
    partnerId: 'partner-1',
    createdAt: NOW,
    updatedAt: NOW,
    partner: { businessName: 'Saigon Select' },
    voucherBranches: BRANCHES.map((branch, index) => ({
      id: `link-${id}-${index + 1}`,
      voucherId: id,
      branchId: branch.id,
      branch
    }))
  }
}

const VOUCHERS = [
  voucher('voucher-1', 'Buffet tối dành cho hai người', 'Ẩm thực', 1200000, 790000, 68),
  voucher('voucher-2', 'Liệu trình spa thư giãn 90 phút', 'Làm đẹp', 950000, 620000, 42),
  voucher('voucher-3', 'Staycation cuối tuần tại Sài Gòn', 'Du lịch', 2800000, 1990000, 31),
  voucher('voucher-4', 'Combo cà phê rang xay thủ công', 'Đồ uống', 420000, 289000, 55),
  voucher('voucher-5', 'Vé xem phim và bắp nước', 'Giải trí', 320000, 219000, 73),
  voucher('voucher-6', 'Lớp làm gốm cho người mới', 'Trải nghiệm', 700000, 490000, 24)
].map((item, index) => ({ ...item, imageUrl: `/assets/voucher-catalogue-sprite.png?cell=${index}` }))

const CART = {
  items: [
    {
      id: 'cart-item-1',
      voucherId: 'voucher-1',
      title: VOUCHERS[0].title,
      imageUrl: VOUCHERS[0].imageUrl,
      unitPrice: 790000,
      quantity: 1,
      subtotal: 790000
    },
    {
      id: 'cart-item-2',
      voucherId: 'voucher-4',
      title: VOUCHERS[3].title,
      imageUrl: VOUCHERS[3].imageUrl,
      unitPrice: 289000,
      quantity: 2,
      subtotal: 578000
    }
  ],
  total: 1368000
}

const ORDER_ITEMS = CART.items.map((item) => ({
  id: `order-${item.id}`,
  orderId: 'order-demo-001',
  voucherId: item.voucherId,
  quantity: item.quantity,
  unitPrice: String(item.unitPrice),
  subtotal: String(item.subtotal),
  voucher: { id: item.voucherId, title: item.title }
}))

const ORDER = {
  id: 'order-demo-001',
  userId: 'customer-preview',
  totalAmount: String(CART.total),
  status: 'PAID',
  recipientName: 'Nguyễn Minh Anh',
  recipientEmail: 'minhanh@example.com',
  recipientPhone: '0901234567',
  createdAt: NOW,
  updatedAt: NOW,
  orderItems: ORDER_ITEMS
}

const CODES = [
  {
    id: 'code-1',
    code: 'VH-DEMO-2026',
    status: 'ACTIVE',
    voucherId: 'voucher-1',
    orderId: ORDER.id,
    ownerId: ORDER.userId,
    redeemedAt: null,
    redemptionBranchId: null,
    expiresAt: SALE_END,
    createdAt: NOW,
    updatedAt: NOW,
    voucher: {
      id: 'voucher-1',
      title: VOUCHERS[0].title,
      description: VOUCHERS[0].description,
      category: VOUCHERS[0].category,
      usagePeriodStart: SALE_START,
      usagePeriodEnd: SALE_END,
      terms: VOUCHERS[0].terms
    },
    order: { id: ORDER.id, createdAt: NOW, status: ORDER.status }
  }
]

const PARTNER_VOUCHERS = {
  vouchers: VOUCHERS.slice(0, 5).map((item, index) => ({
    id: item.id,
    name: item.title,
    description: item.description,
    imageUrl: item.imageUrl,
    categoryId: index + 1,
    category: { id: index + 1, name: item.category },
    originalPrice: item.originalPrice,
    salePrice: item.salePrice,
    totalQuantity: item.totalQuantity,
    remainingQuantity: item.totalQuantity - item.soldQuantity,
    soldQuantity: item.soldQuantity,
    issuedCodeCount: item.soldQuantity,
    usedCodeCount: Math.round(item.soldQuantity * 0.7),
    expiredCodeCount: 0,
    isMultiUse: false,
    usesPerCode: null,
    saleStart: item.salePeriodStart,
    saleEnd: item.salePeriodEnd,
    usageStart: item.usagePeriodStart,
    usageEnd: item.usagePeriodEnd,
    status: index === 1 ? 'DRAFT' : index === 2 ? 'PENDING_REVIEW' : 'ON_SALE',
    rejectReason: null,
    partnerId: item.partnerId,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    branches: BRANCHES
  })),
  pagination: { page: 1, limit: 100, total: 5 }
}

const USERS = {
  users: [
    {
      accountType: 'USER',
      id: 'user-1',
      email: 'minhanh@example.com',
      phone: '0901234567',
      name: 'Nguyễn Minh Anh',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      createdAt: NOW,
      updatedAt: NOW
    },
    {
      accountType: 'USER',
      id: 'user-2',
      email: 'admin@voucherhub.vn',
      phone: null,
      name: 'Trần Hoàng Nam',
      role: 'ADMIN',
      status: 'ACTIVE',
      createdAt: NOW,
      updatedAt: NOW
    }
  ],
  partners: [
    {
      accountType: 'PARTNER',
      id: 'partner-1',
      email: 'hello@saigonselect.vn',
      phone: '02838221234',
      name: 'Saigon Select',
      representativeName: 'Lê Thanh Hà',
      status: 'APPROVED',
      createdAt: NOW,
      updatedAt: NOW
    }
  ],
  pagination: { page: 1, limit: 20, userTotal: 2, partnerTotal: 1, total: 3 }
}

const PENDING_PARTNER = {
  id: 'partner-pending-1',
  ownerUserId: 'user-partner-pending-1',
  legalName: 'Ẩm Thực An Việt',
  taxCode: '0312345678',
  representative: 'Phạm Thu An',
  approvalStatus: 'PENDING',
  rejectReason: null,
  operatingStatus: 'ACTIVE',
  branches: BRANCHES,
  owner: {
    email: 'contact@anviet.vn',
    phone: '0908889999',
    fullName: 'Phạm Thu An'
  },
  createdAt: NOW,
  updatedAt: NOW
}

const DASHBOARD = {
  revenue: { total: 486000000, today: 12800000, thisWeek: 68400000, thisMonth: 172000000 },
  ordersByStatus: { PENDING_PAYMENT: 18, PAID: 246, CANCELLED: 9 },
  topVouchers: VOUCHERS.slice(0, 3).map((item) => ({
    voucherId: item.id,
    title: item.title,
    soldQuantity: item.soldQuantity,
    salePrice: Number(item.salePrice),
    partnerName: item.partner.businessName
  })),
  partnerPerformance: [
    { partnerId: 'partner-1', businessName: 'Saigon Select', voucherCount: 12, orderCount: 146, revenue: 286000000 },
    { partnerId: 'partner-2', businessName: 'An Việt', voucherCount: 8, orderCount: 82, revenue: 128000000 }
  ]
}

const ANALYTICS = {
  windowDays: 7,
  revenueSeries: [18, 24, 20, 31, 28, 39, 42].map((value, index) => ({
    date: `2026-07-${26 + index}`,
    revenue: value * 1000000,
    orders: value
  })),
  signupSeries: [4, 7, 5, 11, 8, 13, 10].map((signups, index) => ({
    date: `2026-07-${26 + index}`,
    signups
  })),
  categoryBreakdown: [
    { category: 'Ẩm thực', revenue: 186000000, unitsSold: 186 },
    { category: 'Du lịch', revenue: 144000000, unitsSold: 72 },
    { category: 'Làm đẹp', revenue: 96000000, unitsSold: 154 }
  ],
  funnel: { ordersCreated: 290, ordersPaid: 246, ordersCancelled: 9, paidConversionRate: 0.848 }
}

function response(config: InternalAxiosRequestConfig, data: unknown, status = 200): AxiosResponse {
  return {
    data,
    status,
    statusText: status === 200 ? 'OK' : 'Created',
    headers: {},
    config
  }
}

function pathFor(config: InternalAxiosRequestConfig): string {
  const raw = config.url ?? '/'
  return raw.split('?')[0].replace(/^\/api\/v1/, '')
}

function authPayload(path: string) {
  const role = path.includes('partner') ? 'PARTNER' : 'CUSTOMER'
  return {
    token: 'design-preview-token',
    user: { id: `${role.toLowerCase()}-preview`, name: 'Tài khoản xem trước', role }
  }
}

function publicPayload(path: string) {
  if (path === '/vouchers/filters') {
    return {
      categories: [...new Set(VOUCHERS.map((item) => item.category))],
      regions: ['TP.HCM', 'Hà Nội', 'Đà Nẵng'],
      partners: [{ id: 'partner-1', name: 'Saigon Select', logoUrl: null }]
    }
  }
  if (path === '/vouchers') {
    return { vouchers: VOUCHERS, pagination: { page: 1, limit: 12, total: VOUCHERS.length } }
  }
  if (/^\/vouchers\/[^/]+\/reviews$/.test(path)) {
    return {
      reviews: [],
      summary: { averageRating: 4.9, totalReviews: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
    }
  }
  if (path.startsWith('/vouchers/')) {
    const id = path.split('/').at(-1)
    const item = VOUCHERS.find((candidate) => candidate.id === id) ?? VOUCHERS[0]
    return { ...item, remainingQuantity: item.totalQuantity - item.soldQuantity, discountPercentage: 34 }
  }
  return undefined
}

function customerPayload(path: string, method: string) {
  if (path === '/cart' || path.startsWith('/cart/')) return CART
  if (path === '/orders' && method === 'get')
    return {
      items: Array.from({ length: 6 }, (_, index) => ({
        ...ORDER,
        id: `VH-2406${12 - index}-00${12 - index}`,
        totalAmount: String([245000, 50000, 580000, 25000, 370000, 69000][index]),
        status: ['PAID', 'PROCESSING', 'PAID', 'PENDING_PAYMENT', 'PAID', 'CANCELLED'][index],
        paymentMethod: ['ZaloPay', 'MoMo', 'VISA', 'VNPay', 'MoMo', 'Bank'][index],
        createdAt: new Date(Date.parse(NOW) - index * 86400000).toISOString()
      })),
      nextCursor: null
    }
  if (path === '/orders') return ORDER
  if (path.endsWith('/pay')) return { order: ORDER, issuedCodeCount: 3 }
  if (path.startsWith('/orders/')) return ORDER
  if (path === '/my-codes') return CODES
  if (path === '/my-vouchers')
    return VOUCHERS.slice(0, 5).map((item, index) => ({
      id: `owned-${index + 1}`,
      code: ['PIZZA40', 'HIGHLAND50', 'SHOPEE15', 'LAZADA12', 'TIKI20K'][index],
      status: 'UNUSED',
      remainingUses: 1,
      totalUses: 1,
      issuedAt: NOW,
      expiresAt: SALE_END,
      lastUsedAt: null,
      lastUsedBranch: null,
      order: { id: ORDER.id, createdAt: NOW },
      voucher: {
        id: item.id,
        name: item.title,
        description: item.description,
        imageUrl: item.imageUrl,
        partnerName: item.partner.businessName
      }
    }))
  if (path === '/reviews/eligible' || path === '/reviews/me') return []
  if (path.startsWith('/my-codes/')) return CODES[0]
  return undefined
}

function partnerPayload(path: string) {
  if (path === '/partner/branches') return BRANCHES
  if (path === '/voucher-code-branches') return BRANCHES
  if (path === '/partner/vouchers') return PARTNER_VOUCHERS
  if (path.includes('/partner/vouchers/')) return PARTNER_VOUCHERS.vouchers[0]
  if (/^\/voucher-codes\/[^/]+$/.test(path)) {
    return {
      code: CODES[0].code,
      status: CODES[0].status,
      valid: true,
      reason: null,
      remainingUses: 1,
      expiresAt: CODES[0].expiresAt,
      voucher: { id: CODES[0].voucherId, name: CODES[0].voucher.title, isMultiUse: false }
    }
  }
  if (/^\/voucher-codes\/[^/]+\/redemption$/.test(path)) {
    return { ...CODES[0], status: 'USED', redeemedAt: NOW, redemptionBranchId: BRANCHES[0].id }
  }
  return undefined
}

function adminPayload(path: string) {
  if (path === '/admin/dashboard/stats') return DASHBOARD
  if (path === '/admin/analytics') return ANALYTICS
  if (path === '/admin/users') return USERS
  if (path === '/admin/partners/pending') {
    return { partners: [PENDING_PARTNER], pagination: { page: 1, limit: 20, total: 1 } }
  }
  if (path === '/admin/vouchers/pending') {
    return { vouchers: [{ ...VOUCHERS[2], status: 'PENDING_APPROVAL' }], pagination: { page: 1, limit: 20, total: 1 } }
  }
  if (path.includes('/admin/partners/')) return PENDING_PARTNER
  if (path.includes('/admin/vouchers/')) return VOUCHERS[2]
  if (path.includes('/admin/users/')) return { id: path.split('/')[3], accountType: 'USER', status: 'LOCKED' }
  return undefined
}

/** Axios adapter used only when VITE_DESIGN_PREVIEW=true. No network is sent. */
export const designPreviewAdapter: AxiosAdapter = async (config) => {
  const path = pathFor(config)
  const method = (config.method ?? 'get').toLowerCase()
  const data = publicPayload(path) ?? customerPayload(path, method) ?? partnerPayload(path) ?? adminPayload(path)

  if (data !== undefined) return response(config, { success: true, data })
  if (path.startsWith('/auth/'))
    return response(config, { success: true, data: authPayload(path) }, method === 'post' ? 201 : 200)
  if (path === '/content') return response(config, { success: true, data: { items: [] } })
  return response(config, { success: true, data: {} })
}
