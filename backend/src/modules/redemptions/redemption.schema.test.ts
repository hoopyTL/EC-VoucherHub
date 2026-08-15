import { describe, expect, it } from 'vitest'

import {
  voucherCodeActionSchema,
  voucherCodeParamSchema,
  voucherCodeRedemptionBodySchema,
  voucherCodeVerificationQuerySchema
} from './redemption.schema'

describe('TASK013 redemption validation', () => {
  it('trims a voucher code and coerces a valid branch id', () => {
    expect(voucherCodeActionSchema.parse({ code: '  CODE-001  ', branchId: '7' })).toEqual({
      code: 'CODE-001',
      branchId: 7
    })
  })

  it('rejects an empty or overlong voucher code', () => {
    expect(voucherCodeParamSchema.safeParse({ code: '   ' }).success).toBe(false)
    expect(voucherCodeParamSchema.safeParse({ code: 'A'.repeat(33) }).success).toBe(false)
  })

  it('rejects invalid branch ids in query and body', () => {
    expect(voucherCodeVerificationQuerySchema.safeParse({ branchId: 0 }).success).toBe(false)
    expect(voucherCodeRedemptionBodySchema.safeParse({ branchId: 'abc' }).success).toBe(false)
  })
})
