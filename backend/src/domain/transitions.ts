import { OrderStatus, VoucherCodeStatus, VoucherStatus } from '@voucher/shared'
import type { StateMachine } from './state-machine'

// nhap → cho_duyet → da_duyet → dang_ban → tam_ngung / ngung_ban
// tu_choi → nhap (sửa lại);  da_duyet → tu_choi (thu hồi duyệt);  tam_ngung ⇄ dang_ban
export const voucherTransitions: StateMachine<VoucherStatus> = {
  [VoucherStatus.DRAFT]: [VoucherStatus.PENDING_REVIEW],
  [VoucherStatus.PENDING_REVIEW]: [VoucherStatus.APPROVED, VoucherStatus.REJECTED],
  [VoucherStatus.APPROVED]: [VoucherStatus.ON_SALE, VoucherStatus.REJECTED],
  [VoucherStatus.REJECTED]: [VoucherStatus.DRAFT],
  [VoucherStatus.ON_SALE]: [VoucherStatus.PAUSED, VoucherStatus.DISCONTINUED],
  [VoucherStatus.PAUSED]: [VoucherStatus.ON_SALE, VoucherStatus.DISCONTINUED],
  [VoucherStatus.DISCONTINUED]: [] // terminal — retire vĩnh viễn, bán lại = record mới
}

// cho_thanh_toan → da_thanh_toan → da_hoan_tien;  cho_thanh_toan → da_huy (nhánh)
export const orderTransitions: StateMachine<OrderStatus> = {
  [OrderStatus.PENDING_PAYMENT]: [OrderStatus.PAID, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.REFUNDED],
  [OrderStatus.CANCELLED]: [], // terminal
  [OrderStatus.REFUNDED]: [] // terminal
}

// chua_su_dung → da_su_dung / het_han / bi_huy / bi_khoa
// bi_khoa → chua_su_dung (mở khóa) / het_han (quá hạn khi khóa) / bi_huy (hủy trực tiếp)
export const voucherCodeTransitions: StateMachine<VoucherCodeStatus> = {
  [VoucherCodeStatus.UNUSED]: [
    VoucherCodeStatus.USED,
    VoucherCodeStatus.EXPIRED,
    VoucherCodeStatus.CANCELLED,
    VoucherCodeStatus.LOCKED
  ],
  [VoucherCodeStatus.LOCKED]: [VoucherCodeStatus.UNUSED, VoucherCodeStatus.EXPIRED, VoucherCodeStatus.CANCELLED],
  [VoucherCodeStatus.USED]: [], // terminal
  [VoucherCodeStatus.EXPIRED]: [], // terminal
  [VoucherCodeStatus.CANCELLED]: [] // terminal
}
