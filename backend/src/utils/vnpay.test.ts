import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('VNPay signing helpers', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VNP_TMNCODE', 'TESTCODE')
    vi.stubEnv('VNP_HASHSECRET', 'test-secret')
    vi.stubEnv('VNP_URL', 'https://sandbox.example/pay')
    vi.stubEnv('VNP_RETURN_URL', 'https://voucher.example/payment-result')
  })

  it('creates a signed payment URL whose callback verifies successfully', async () => {
    const { createVNPayUrl, verifyVNPayReturn } = await import('./vnpay')
    const url = new URL(createVNPayUrl('127.0.0.1', 'order-1', 125000, 'Thanh toan order-1'))
    const params = Object.fromEntries(url.searchParams.entries())

    expect(url.origin + url.pathname).toBe('https://sandbox.example/pay')
    expect(params.vnp_TmnCode).toBe('TESTCODE')
    expect(params.vnp_Amount).toBe('12500000')
    expect(params.vnp_TxnRef).toBe('order-1')
    expect(params.vnp_ReturnUrl).toBe('https://voucher.example/payment-result')
    expect(verifyVNPayReturn(params)).toBe(true)
  })

  it('rejects a callback after a signed value is changed', async () => {
    const { createVNPayUrl, verifyVNPayReturn } = await import('./vnpay')
    const url = new URL(createVNPayUrl('127.0.0.1', 'order-2', 50000, 'Order 2'))
    const params = Object.fromEntries(url.searchParams.entries())
    params.vnp_Amount = '1'

    expect(verifyVNPayReturn(params)).toBe(false)
  })

  it('ignores unsupported callback values and rejects a missing signature', async () => {
    const { verifyVNPayReturn } = await import('./vnpay')
    expect(verifyVNPayReturn({ vnp_Amount: ['100'], vnp_SecureHashType: 'SHA512' })).toBe(false)
  })
})
