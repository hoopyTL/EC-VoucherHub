import { describe, expect, it } from 'vitest'

import { createVoucherSchema, voucherApprovalSchema } from './voucher.schema'

const validVoucher = {
  categoryId: 1,
  name: 'Voucher mẫu',
  description: 'Mô tả voucher',
  originalPrice: 150000,
  salePrice: 100000,
  saleStart: '2026-08-20T00:00:00.000Z',
  saleEnd: '2026-09-20T00:00:00.000Z',
  usageStart: '2026-08-20T00:00:00.000Z',
  usageEnd: '2026-10-20T00:00:00.000Z',
  totalQuantity: 10,
  isMultiUse: false,
  usesPerCode: null,
  branchIds: [1, 2]
}

describe('TASK007 voucher validation', () => {
  it('accepts a complete valid voucher', () => {
    expect(createVoucherSchema.safeParse(validVoucher).success).toBe(true)
  })

  it('rejects a sale price greater than or equal to the original price', () => {
    const result = createVoucherSchema.safeParse({ ...validVoucher, salePrice: 150000 })
    expect(result.success).toBe(false)
  })

  it('rejects invalid sale and usage periods', () => {
    const result = createVoucherSchema.safeParse({
      ...validVoucher,
      saleEnd: validVoucher.saleStart,
      usageEnd: validVoucher.usageStart
    })
    expect(result.success).toBe(false)
  })

  it('requires usesPerCode only for multi-use vouchers', () => {
    expect(createVoucherSchema.safeParse({ ...validVoucher, isMultiUse: true, usesPerCode: null }).success).toBe(false)
    expect(createVoucherSchema.safeParse({ ...validVoucher, isMultiUse: true, usesPerCode: 3 }).success).toBe(true)
  })

  it('rejects duplicate branch identifiers', () => {
    expect(createVoucherSchema.safeParse({ ...validVoucher, branchIds: [1, 1] }).success).toBe(false)
  })

  it('requires a reason when admin rejects or revokes approval', () => {
    expect(voucherApprovalSchema.safeParse({ action: 'reject' }).success).toBe(false)
    expect(voucherApprovalSchema.safeParse({ action: 'reject', reason: 'Sai nội dung' }).success).toBe(true)
  })
})
