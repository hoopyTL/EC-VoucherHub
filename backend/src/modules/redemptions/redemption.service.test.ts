import { ApprovalStatus, OperatingStatus, UsageResult, VoucherCodeStatus } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock, txMock } = vi.hoisted(() => {
  const tx = {
    issuedVoucherCode: { findUnique: vi.fn(), updateMany: vi.fn() },
    usageLog: { create: vi.fn() }
  }
  return {
    txMock: tx,
    prismaMock: {
      partner: { findUnique: vi.fn() },
      branch: { findUnique: vi.fn() },
      issuedVoucherCode: { findUnique: vi.fn() },
      $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx))
    }
  }
})

vi.mock('~/configs/prisma', () => ({ default: prismaMock }))

import { redeemVoucherCode, verifyVoucherCode } from './redemption.service'

const NOW = new Date('2026-08-15T00:00:00.000Z')
const partner = {
  id: 'partner-a',
  approvalStatus: ApprovalStatus.APPROVED,
  operatingStatus: OperatingStatus.ACTIVE
}
const branch = { id: 1, name: 'Branch A', partnerId: partner.id }

function issuedCode(overrides: Record<string, unknown> = {}) {
  return {
    id: 'code-id',
    code: 'CODE-001',
    status: VoucherCodeStatus.UNUSED,
    remainingUses: 1,
    expiresAt: new Date('2026-09-30T00:00:00.000Z'),
    owner: { fullName: 'Customer A' },
    voucherProduct: {
      partnerId: partner.id,
      name: 'Voucher A',
      usageStart: new Date('2026-08-01T00:00:00.000Z'),
      usageEnd: new Date('2026-09-30T00:00:00.000Z'),
      voucherProductBranches: [{ branchId: branch.id }]
    },
    ...overrides
  }
}

describe('TASK013 voucher verification and redemption', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    prismaMock.partner.findUnique.mockResolvedValue(partner)
    prismaMock.branch.findUnique.mockResolvedValue(branch)
    prismaMock.issuedVoucherCode.findUnique.mockResolvedValue(issuedCode())
    txMock.issuedVoucherCode.findUnique.mockResolvedValue(issuedCode())
    txMock.issuedVoucherCode.updateMany.mockResolvedValue({ count: 1 })
    txMock.usageLog.create.mockResolvedValue({ id: 10, usedAt: NOW })
  })

  it('returns INVALID_CODE when the code does not exist', async () => {
    prismaMock.issuedVoucherCode.findUnique.mockResolvedValue(null)
    await expect(verifyVoucherCode('user-a', { code: 'missing', branchId: 1 })).resolves.toMatchObject({
      valid: false,
      result: UsageResult.INVALID_CODE
    })
  })

  it('forbids a branch owned by another partner', async () => {
    prismaMock.branch.findUnique.mockResolvedValue({ ...branch, partnerId: 'partner-b' })
    await expect(verifyVoucherCode('user-a', { code: 'CODE-001', branchId: 1 })).rejects.toMatchObject({
      statusCode: 403
    })
  })

  it('forbids a voucher code owned by another partner', async () => {
    prismaMock.issuedVoucherCode.findUnique.mockResolvedValue(
      issuedCode({ voucherProduct: { ...issuedCode().voucherProduct, partnerId: 'partner-b' } })
    )
    await expect(verifyVoucherCode('user-a', { code: 'CODE-001', branchId: 1 })).rejects.toMatchObject({
      statusCode: 403
    })
  })

  it.each([
    [VoucherCodeStatus.USED, UsageResult.ALREADY_USED],
    [VoucherCodeStatus.EXPIRED, UsageResult.EXPIRED],
    [VoucherCodeStatus.LOCKED, UsageResult.LOCKED],
    [VoucherCodeStatus.CANCELLED, UsageResult.LOCKED]
  ])('rejects code status %s during verification', async (status, result) => {
    prismaMock.issuedVoucherCode.findUnique.mockResolvedValue(issuedCode({ status }))
    await expect(verifyVoucherCode('user-a', { code: 'CODE-001', branchId: 1 })).resolves.toMatchObject({
      valid: false,
      result
    })
  })

  it('rejects a code at a branch outside its applicability', async () => {
    prismaMock.issuedVoucherCode.findUnique.mockResolvedValue(
      issuedCode({
        voucherProduct: { ...issuedCode().voucherProduct, voucherProductBranches: [{ branchId: 99 }] }
      })
    )
    await expect(verifyVoucherCode('user-a', { code: 'CODE-001', branchId: 1 })).resolves.toMatchObject({
      valid: false,
      result: UsageResult.WRONG_BRANCH
    })
  })

  it('redeems a single-use code, marks it used and writes a usage log', async () => {
    const result = await redeemVoucherCode('user-a', { code: ' CODE-001 ', branchId: 1 })
    expect(txMock.issuedVoucherCode.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ remainingUses: 1, status: VoucherCodeStatus.UNUSED }),
        data: { remainingUses: 0, status: VoucherCodeStatus.USED }
      })
    )
    expect(txMock.usageLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ result: UsageResult.SUCCESS, branchId: 1, actorUserId: 'user-a' })
    })
    expect(result).toMatchObject({ status: VoucherCodeStatus.USED, remainingUses: 0 })
  })

  it('keeps a multi-use code unused until its final use', async () => {
    txMock.issuedVoucherCode.findUnique.mockResolvedValue(issuedCode({ remainingUses: 3 }))
    await expect(redeemVoucherCode('user-a', { code: 'CODE-001', branchId: 1 })).resolves.toMatchObject({
      status: VoucherCodeStatus.UNUSED,
      remainingUses: 2
    })
  })

  it('rejects a concurrent redemption when the conditional update loses the race', async () => {
    txMock.issuedVoucherCode.updateMany.mockResolvedValue({ count: 0 })
    await expect(redeemVoucherCode('user-a', { code: 'CODE-001', branchId: 1 })).rejects.toMatchObject({
      statusCode: 409
    })
    expect(txMock.usageLog.create).not.toHaveBeenCalled()
  })
})
