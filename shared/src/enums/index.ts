export const UserStatus = {
  ACTIVE: 'ACTIVE',
  LOCKED: 'LOCKED'
} as const
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus]

export const ApprovalStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED'
} as const
export type ApprovalStatus = (typeof ApprovalStatus)[keyof typeof ApprovalStatus]

export const OperatingStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED'
} as const
export type OperatingStatus = (typeof OperatingStatus)[keyof typeof OperatingStatus]

export const VoucherStatus = {
  DRAFT: 'DRAFT',
  PENDING_REVIEW: 'PENDING_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  ON_SALE: 'ON_SALE',
  PAUSED: 'PAUSED',
  DISCONTINUED: 'DISCONTINUED'
} as const
export type VoucherStatus = (typeof VoucherStatus)[keyof typeof VoucherStatus]

export const OrderStatus = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED'
} as const
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus]

export const VoucherCodeStatus = {
  UNUSED: 'UNUSED',
  USED: 'USED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
  LOCKED: 'LOCKED'
} as const
export type VoucherCodeStatus = (typeof VoucherCodeStatus)[keyof typeof VoucherCodeStatus]

export const UsageResult = {
  SUCCESS: 'SUCCESS',
  INVALID_CODE: 'INVALID_CODE',
  EXPIRED: 'EXPIRED',
  ALREADY_USED: 'ALREADY_USED',
  WRONG_BRANCH: 'WRONG_BRANCH',
  LOCKED: 'LOCKED'
} as const
export type UsageResult = (typeof UsageResult)[keyof typeof UsageResult]
