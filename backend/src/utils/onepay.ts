import crypto from 'crypto'

export const ONEPAY_MERCHANT = process.env.ONEPAY_MERCHANT || 'TESTONEPAY'
export const ONEPAY_ACCESS_CODE = process.env.ONEPAY_ACCESS_CODE || '6BEB2546'
export const ONEPAY_HASH_SECRET = process.env.ONEPAY_HASH_SECRET || '6D0870CDE5F24F34F3915FB0045120DB'
export const ONEPAY_URL = process.env.ONEPAY_URL || 'https://mtf.onepay.vn/paygate/vpcpay.op'
export const ONEPAY_RETURN_URL = process.env.ONEPAY_RETURN_URL || 'http://localhost:5173/payment-result'

/**
 * Tạo URL thanh toán OnePay Sandbox (Nội địa / Napas ATM).
 */
export function createOnePayUrl(input: { orderId: string; amount: number; ipAddr?: string }): string {
  const cleanId = input.orderId.replace(/-/g, '')
  const params: Record<string, string> = {
    vpc_Version: '2',
    vpc_Command: 'pay',
    vpc_AccessCode: ONEPAY_ACCESS_CODE,
    vpc_Merchant: ONEPAY_MERCHANT,
    vpc_Locale: 'vn',
    vpc_ReturnURL: ONEPAY_RETURN_URL,
    vpc_MerchTxnRef: cleanId,
    vpc_OrderInfo: `Don hang ${cleanId.slice(0, 12)}`,
    vpc_Amount: String(input.amount * 100), // OnePay VND tính theo xu (nhân 100)
    vpc_TicketNo: input.ipAddr || '127.0.0.1',
    vpc_Currency: 'VND'
  }

  const sortedKeys = Object.keys(params).sort()
  const rawData = sortedKeys
    .filter((k) => k.startsWith('vpc_') && params[k] !== '')
    .map((k) => `${k}=${params[k]}`)
    .join('&')

  const secretBuffer = Buffer.from(ONEPAY_HASH_SECRET, 'hex')
  const secureHash = crypto.createHmac('sha256', secretBuffer).update(rawData).digest('hex').toUpperCase()

  params.vpc_SecureHash = secureHash
  const queryString = new URLSearchParams(params).toString()
  return `${ONEPAY_URL}?${queryString}`
}

/**
 * Phục hồi UUID chuẩn từ 32 ký tự hex hoặc mã tham chiếu của OnePay MerchTxnRef.
 */
export function restoreOrderIdFromTxnRef(txnRef: string): string {
  const parts = (txnRef || '').split('_')
  const clean = parts[0].replace(/[^a-zA-Z0-9]/g, '')
  if (clean.length === 32) {
    return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20, 32)}`
  }
  return parts[0]
}

/**
 * Xác minh chữ ký phản hồi từ OnePay (Return URL / IPN).
 */
export function verifyOnePayReturn(queryParams: Record<string, string | string[] | undefined>): boolean {
  const secureHash = queryParams.vpc_SecureHash
  if (!secureHash || typeof secureHash !== 'string') return false

  const params: Record<string, string> = {}
  for (const [k, v] of Object.entries(queryParams)) {
    if (k.startsWith('vpc_') && k !== 'vpc_SecureHash' && typeof v === 'string') {
      params[k] = v
    }
  }

  const sortedKeys = Object.keys(params).sort()
  const rawData = sortedKeys
    .filter((k) => k.startsWith('vpc_') && params[k] !== '')
    .map((k) => `${k}=${params[k]}`)
    .join('&')

  const secretBuffer = Buffer.from(ONEPAY_HASH_SECRET, 'hex')
  const expectedHash = crypto.createHmac('sha256', secretBuffer).update(rawData).digest('hex').toUpperCase()

  return secureHash.toUpperCase() === expectedHash
}
