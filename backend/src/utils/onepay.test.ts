import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('OnePay signing helpers', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('ONEPAY_MERCHANT', 'TESTONEPAY')
    vi.stubEnv('ONEPAY_ACCESS_CODE', '6BEB2546')
    vi.stubEnv('ONEPAY_HASH_SECRET', '6D0870CDE5F24F34F3915FB0045120DB')
    vi.stubEnv('ONEPAY_URL', 'https://mtf.onepay.vn/paygate/vpcpay.op')
    vi.stubEnv('ONEPAY_RETURN_URL', 'http://localhost:5173/payment-result')
  })

  it('creates a signed payment URL whose callback verifies successfully', async () => {
    const { createOnePayUrl, verifyOnePayReturn } = await import('./onepay')

    const urlString = createOnePayUrl({
      orderId: 'order-123',
      amount: 150000,
      ipAddr: '10.0.0.1'
    })
    const url = new URL(urlString)

    expect(url.origin + url.pathname).toBe('https://mtf.onepay.vn/paygate/vpcpay.op')
    expect(url.searchParams.get('vpc_Merchant')).toBe('TESTONEPAY')
    expect(url.searchParams.get('vpc_AccessCode')).toBe('6BEB2546')
    expect(url.searchParams.get('vpc_Amount')).toBe('15000000') // 150000 * 100
    expect(url.searchParams.get('vpc_SecureHash')).toBeDefined()

    const queryParams: Record<string, string> = {}
    url.searchParams.forEach((v, k) => {
      queryParams[k] = v
    })

    expect(verifyOnePayReturn(queryParams)).toBe(true)
  })

  it('rejects a callback with a tampered amount', async () => {
    const { createOnePayUrl, verifyOnePayReturn } = await import('./onepay')

    const urlString = createOnePayUrl({
      orderId: 'order-123',
      amount: 150000,
      ipAddr: '10.0.0.1'
    })
    const url = new URL(urlString)
    const queryParams: Record<string, string> = {}
    url.searchParams.forEach((v, k) => {
      queryParams[k] = v
    })

    // Tamper amount
    queryParams.vpc_Amount = '1000'
    expect(verifyOnePayReturn(queryParams)).toBe(false)
  })

  it('rejects a callback with missing secure hash', async () => {
    const { verifyOnePayReturn } = await import('./onepay')
    expect(verifyOnePayReturn({ vpc_Amount: '10000' })).toBe(false)
  })
})
