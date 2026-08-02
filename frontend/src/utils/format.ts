/**
 * Shared formatting helpers for the customer-facing voucher pages.
 *
 * Prices arrive from the API as Decimal strings (e.g. `"150000.00"`); these
 * helpers parse and present them. The catalogue uses Vietnamese Dong (VND), the
 * platform's demo currency.
 */

/** Currency formatter for Vietnamese Dong (no fractional digits). */
const VND_FORMATTER = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
})

/**
 * Parses a price value (Decimal string or number) into a finite number,
 * returning 0 for missing / unparseable input so the UI never renders `NaN`.
 */
export function parsePrice(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

/** Formats a price value as a VND currency string (e.g. `150.000 ₫`). */
export function formatCurrency(value: string | number | null | undefined): string {
  return VND_FORMATTER.format(parsePrice(value))
}

/**
 * Computes the integer discount percentage between an original and sale price.
 * Returns 0 when the original price is non-positive or when the sale price is
 * not actually lower (guards against negative/meaningless percentages).
 */
export function discountPercent(
  originalPrice: string | number | null | undefined,
  salePrice: string | number | null | undefined
): number {
  const original = parsePrice(originalPrice)
  const sale = parsePrice(salePrice)
  if (original <= 0 || sale >= original) return 0
  return Math.round(((original - sale) / original) * 100)
}

/** Formats an ISO date string as a locale date (e.g. `31/12/2025`). */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/** Formats an ISO date range as `start – end` (used for sale/usage periods). */
export function formatDateRange(start: string | null | undefined, end: string | null | undefined): string {
  const from = formatDate(start)
  const to = formatDate(end)
  if (from && to) return `${from} – ${to}`
  return from || to
}

/**
 * Formats an ISO date string as a date with the time of day
 * (e.g. `31/12/2025 14:30`). Returns an empty string for missing/invalid input.
 */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Human-friendly label for a status enum value. Converts an UPPER_SNAKE_CASE
 * status (e.g. `PENDING_PAYMENT`) to Title Case words (e.g. `Pending Payment`).
 */
export function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    ACTIVE: 'Đang hoạt động',
    INACTIVE: 'Ngừng hoạt động',
    LOCKED: 'Đã khóa',
    APPROVED: 'Đã duyệt',
    REJECTED: 'Bị từ chối',
    DRAFT: 'Bản nháp',
    PENDING: 'Đang chờ',
    PENDING_APPROVAL: 'Chờ duyệt',
    PENDING_PAYMENT: 'Chờ thanh toán',
    PAID: 'Đã thanh toán',
    CANCELLED: 'Đã hủy',
    REFUNDED: 'Đã hoàn tiền',
    PAUSED: 'Tạm dừng',
    USED: 'Đã sử dụng',
    UNUSED: 'Chưa sử dụng',
    EXPIRED: 'Đã hết hạn',
    CUSTOMER: 'Khách hàng',
    PARTNER: 'Đối tác',
    ADMIN: 'Quản trị viên'
  }
  if (labels[status]) return labels[status]
  return status
    .toLowerCase()
    .split('_')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ')
}
