import { ApprovalStatus, OperatingStatus, VoucherStatus } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    partner: { findUnique: vi.fn() },
    voucherProduct: { findUnique: vi.fn(), update: vi.fn() },
    issuedVoucherCode: { groupBy: vi.fn() }
  }
}))

vi.mock('~/configs/prisma', () => ({ default: prismaMock }))

import { changeVoucherStatus, getPartnerVoucher, reviewVoucher, submitVoucher } from './voucher.service'

const partner = {
  id: 'partner-a',
  approvalStatus: ApprovalStatus.APPROVED,
  operatingStatus: OperatingStatus.ACTIVE
}

function voucher(status: VoucherStatus, partnerId = partner.id) {
  return {
    id: 'voucher-1',
    partnerId,
    status,
    originalPrice: 150000,
    salePrice: 100000,
    saleStart: new Date('2026-08-20T00:00:00.000Z'),
    saleEnd: new Date('2026-09-20T00:00:00.000Z'),
    usageStart: new Date('2026-08-20T00:00:00.000Z'),
    usageEnd: new Date('2026-10-20T00:00:00.000Z'),
    totalQuantity: 10,
    remainingQuantity: 10,
    isMultiUse: false,
    usesPerCode: null,
    voucherProductBranches: []
  }
}

describe('TASK007 voucher ownership and lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.partner.findUnique.mockResolvedValue(partner)
    prismaMock.issuedVoucherCode.groupBy.mockResolvedValue([])
    prismaMock.voucherProduct.update.mockImplementation(({ data }: { data: object }) => Promise.resolve(data))
  })

  it('forbids a partner from viewing a voucher owned by another partner', async () => {
    prismaMock.voucherProduct.findUnique.mockResolvedValue(voucher(VoucherStatus.DRAFT, 'partner-b'))
    await expect(getPartnerVoucher('user-a', 'voucher-1')).rejects.toMatchObject({ statusCode: 403 })
  })

  it('forbids a partner from submitting another partner voucher', async () => {
    prismaMock.voucherProduct.findUnique.mockResolvedValue(voucher(VoucherStatus.DRAFT, 'partner-b'))
    await expect(submitVoucher('user-a', 'voucher-1')).rejects.toMatchObject({ statusCode: 403 })
    expect(prismaMock.voucherProduct.update).not.toHaveBeenCalled()
  })

  it('only submits a DRAFT voucher to PENDING_REVIEW', async () => {
    prismaMock.voucherProduct.findUnique.mockResolvedValue(voucher(VoucherStatus.DRAFT))
    await submitVoucher('user-a', 'voucher-1')
    expect(prismaMock.voucherProduct.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: VoucherStatus.PENDING_REVIEW })
      })
    )

    prismaMock.voucherProduct.findUnique.mockResolvedValue(voucher(VoucherStatus.APPROVED))
    await expect(submitVoucher('user-a', 'voucher-1')).rejects.toMatchObject({ statusCode: 422 })
  })

  it('requires a reason when rejecting a pending voucher', async () => {
    prismaMock.voucherProduct.findUnique.mockResolvedValue({
      ...voucher(VoucherStatus.PENDING_REVIEW),
      partner
    })
    await expect(reviewVoucher('voucher-1', 'reject')).rejects.toMatchObject({ statusCode: 400 })
  })

  it('allows admin to revoke APPROVED to REJECTED with a reason', async () => {
    prismaMock.voucherProduct.findUnique.mockResolvedValue({ ...voucher(VoucherStatus.APPROVED), partner })
    await reviewVoucher('voucher-1', 'reject', 'Thông tin chưa chính xác')
    expect(prismaMock.voucherProduct.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: VoucherStatus.REJECTED, rejectReason: 'Thông tin chưa chính xác' }
      })
    )
  })

  it('publishes only an approved, in-stock voucher of an active partner', async () => {
    prismaMock.voucherProduct.findUnique.mockResolvedValue({ ...voucher(VoucherStatus.APPROVED), partner })
    await changeVoucherStatus('voucher-1', 'publish')
    expect(prismaMock.voucherProduct.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: VoucherStatus.ON_SALE }
      })
    )
  })
})
