// ─── Business Enums ─────────────────────────────────────────────────
// Mirror các Prisma enum, dùng trong service/validation layer
// (không import trực tiếp @prisma/client ở shared để giữ shared độc lập).

export enum OrderStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum VoucherStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ON_SALE = 'ON_SALE',
  PAUSED = 'PAUSED',
  DISCONTINUED = 'DISCONTINUED',
}

export enum VoucherCodeStatus {
  UNUSED = 'UNUSED',
  USED = 'USED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  LOCKED = 'LOCKED',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  LOCKED = 'LOCKED',
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum UserRole {
  KHACH_HANG = 'KHACH_HANG',
  DOI_TAC = 'DOI_TAC',
  QUAN_TRI_VIEN = 'QUAN_TRI_VIEN',
}
