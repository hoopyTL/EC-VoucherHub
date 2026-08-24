/**
 * Temporary contracts used by the migrated UI and its deterministic design
 * preview. They intentionally do not describe the EC-VoucherHub backend API.
 * Replace these with imports from `@voucher/shared` when API integration starts.
 */

export const UserRole = {
  CUSTOMER: 'CUSTOMER',
  PARTNER: 'PARTNER',
  STAFF: 'STAFF',
  ADMIN: 'ADMIN'
} as const
export type UserRole = (typeof UserRole)[keyof typeof UserRole]

export const AccountStatus = {
  ACTIVE: 'ACTIVE',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  LOCKED: 'LOCKED'
} as const
export type AccountStatus = (typeof AccountStatus)[keyof typeof AccountStatus]

export const VoucherStatus = {
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  PAUSED: 'PAUSED',
  CANCELLED: 'CANCELLED',
  REJECTED: 'REJECTED'
} as const
export type VoucherStatus = (typeof VoucherStatus)[keyof typeof VoucherStatus]

export const OrderStatus = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED'
} as const
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus]

export const VoucherCodeStatus = {
  ACTIVE: 'ACTIVE',
  USED: 'USED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED'
} as const
export type VoucherCodeStatus = (typeof VoucherCodeStatus)[keyof typeof VoucherCodeStatus]

export interface RegisterCustomerRequest {
  email?: string
  phone?: string
  password: string
  name: string
  referralCode?: string
}

export interface RegisterPartnerRequest {
  email: string
  phone?: string
  password: string
  businessName: string
  businessRegNumber: string
  taxId: string
  representativeName: string
  representativeContact: string
  branches: {
    name: string
    address: string
    region: string
    contact: string
  }[]
}

export interface LoginRequest {
  emailOrPhone: string
  password: string
}

export interface AuthResponse {
  token: string
  user: {
    id: string
    name: string
    role: UserRole
  }
  csrfToken?: string
}

export interface CreateVoucherRequest {
  title: string
  description: string
  category: string
  originalPrice: number
  salePrice: number
  totalQuantity: number
  salePeriodStart: string
  salePeriodEnd: string
  usagePeriodStart: string
  usagePeriodEnd: string
  terms?: string
  imageUrl?: string
  branchIds: string[]
  isMultiUse?: boolean
  usesPerCode?: number | null
}

export interface VoucherSearchParams {
  keyword?: string
  category?: string
  region?: string
  minPrice?: number
  maxPrice?: number
  minDiscount?: number
  partnerId?: string
  page?: number
  limit?: number
}

export interface AddToCartRequest {
  voucherId: string
  quantity: number
}

export interface CreateOrderRequest {
  selectedCartItemIds?: number[]
  paymentMethod?: string
  giftRecipient?: { name?: string; email?: string; phone?: string }
  recipientName?: string
  recipientEmail?: string
  recipientPhone?: string
  pointsToRedeem?: number
}

export interface PaymentRequest {
  paymentMethod: 'simulated_success' | 'simulated_failure'
}

export interface VerifyCodeRequest {
  code: string
}

export interface RedeemCodeRequest {
  code: string
  branchId: string
}
