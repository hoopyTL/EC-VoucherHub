import crypto from 'crypto'

/**
 * Sinh mã voucher ngẫu nhiên bảo mật (CSPRNG).
 * Định dạng: 12 ký tự viết hoa (ví dụ: A1B2C3D4E5F6).
 */
export const generateVoucherCode = (): string => {
  // 6 bytes = 12 ký tự hex
  return crypto.randomBytes(6).toString('hex').toUpperCase()
}
