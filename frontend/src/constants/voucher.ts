/**
 * Static catalogue constants shared by the customer-facing voucher pages.
 *
 * The backend stores `category` as a free-form string and `region` on each
 * branch, but the design fixes the demo taxonomy to a known set (see the design
 * document "Seed Data Strategy"). The browse-page filter controls offer these
 * canonical values so customers get predictable dropdowns rather than having to
 * type exact strings.
 */

/** Voucher categories offered in the catalogue (design "Seed Data Strategy"). */
export const VOUCHER_CATEGORIES = [
  'Ẩm Thực',
  'Buffet',
  'Spa & Làm đẹp',
  'Massage Nam Nữ',
  'Giải Trí & Thể Thao',
  'Tour du lịch',
  'Hotel & Resort',
  'Nha Khoa'
] as const

/** Regions a partner branch can belong to (design "Seed Data Strategy"). */
export const VOUCHER_REGIONS = ['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ'] as const

export type VoucherCategory = (typeof VOUCHER_CATEGORIES)[number]
export type VoucherRegion = (typeof VOUCHER_REGIONS)[number]
