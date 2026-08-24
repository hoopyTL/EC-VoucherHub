import { ApprovalStatus, OperatingStatus, OrderStatus, VoucherCodeStatus, VoucherStatus } from '@prisma/client'
import { RoleName } from '@voucher/shared'
import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import app from '~/app'
import prisma from '~/configs/prisma'
import { authHeader, createUser, resetUsers, seedRoles } from '~/test/helpers'

beforeAll(seedRoles)
beforeEach(resetUsers)

async function fixture(options: { multiUse?: boolean; remainingUses?: number } = {}) {
  const partnerUser = await createUser({ email: `partner-${crypto.randomUUID()}@example.com`, role: RoleName.PARTNER })
  const customer = await createUser({ email: `customer-${crypto.randomUUID()}@example.com` })
  const partner = await prisma.partner.create({
    data: {
      ownerUserId: partnerUser.id,
      legalName: 'Redemption Partner',
      taxCode: `TAX-${crypto.randomUUID().replaceAll('-', '').slice(0, 20)}`,
      representative: 'Owner',
      approvalStatus: ApprovalStatus.APPROVED,
      operatingStatus: OperatingStatus.ACTIVE,
      branches: {
        create: [
          { name: 'Applied', address: '1 Main', region: 'HCM' },
          { name: 'Other', address: '2 Main', region: 'HCM' }
        ]
      }
    },
    include: { branches: true }
  })
  const category = await prisma.category.create({ data: { name: `Category ${crypto.randomUUID()}` } })
  const voucher = await prisma.voucherProduct.create({
    data: {
      partnerId: partner.id,
      categoryId: category.id,
      name: 'Redeem voucher',
      description: 'Redeem test',
      originalPrice: 100000,
      salePrice: 80000,
      saleStart: new Date(Date.now() - 86_400_000),
      saleEnd: new Date(Date.now() + 86_400_000),
      usageStart: new Date(Date.now() - 86_400_000),
      usageEnd: new Date(Date.now() + 10 * 86_400_000),
      totalQuantity: 10,
      remainingQuantity: 9,
      status: VoucherStatus.ON_SALE,
      isMultiUse: options.multiUse ?? false,
      usesPerCode: options.multiUse ? (options.remainingUses ?? 3) : null,
      voucherProductBranches: { create: { branchId: partner.branches[0].id } }
    }
  })
  const order = await prisma.order.create({
    data: {
      customerId: customer.id,
      totalAmount: 80000,
      paymentMethod: 'TEST',
      status: OrderStatus.PAID,
      paidAt: new Date(),
      orderItems: { create: { voucherProductId: voucher.id, quantity: 1, unitPrice: 80000 } }
    },
    include: { orderItems: true }
  })
  const code = await prisma.issuedVoucherCode.create({
    data: {
      code: `VH-${crypto.randomUUID().replaceAll('-', '').slice(0, 20)}`,
      orderId: order.id,
      orderItemId: order.orderItems[0].id,
      voucherProductId: voucher.id,
      ownerUserId: customer.id,
      status: VoucherCodeStatus.UNUSED,
      remainingUses: options.remainingUses ?? 1,
      expiresAt: new Date(Date.now() + 10 * 86_400_000)
    }
  })
  return { partnerUser, customer, partner, code }
}

describe('TASK-013 redemption API', () => {
  it('lists only voucher codes owned by the authenticated customer', async () => {
    const mine = await fixture({ multiUse: true, remainingUses: 2 })
    await fixture()

    const response = await request(app).get('/api/my-vouchers').set(authHeader(mine.customer.id, RoleName.CUSTOMER))

    expect(response.status).toBe(200)
    expect(response.body.data).toHaveLength(1)
    expect(response.body.data[0]).toMatchObject({
      code: mine.code.code,
      status: VoucherCodeStatus.UNUSED,
      remainingUses: 2,
      totalUses: 2,
      voucher: { name: 'Redeem voucher', partnerName: 'Redemption Partner' }
    })
  })

  it('validates a code in the partner scope', async () => {
    const data = await fixture()
    const response = await request(app)
      .get(`/api/voucher-codes/${data.code.code}`)
      .set(authHeader(data.partnerUser.id, RoleName.PARTNER))

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({ code: data.code.code, valid: true, remainingUses: 1 })
  })

  it('redeems single-use once and writes an immutable usage log', async () => {
    const data = await fixture()
    const endpoint = `/api/voucher-codes/${data.code.code}/redemption`
    const headers = authHeader(data.partnerUser.id, RoleName.PARTNER)
    const first = await request(app).post(endpoint).set(headers).send({ branchId: data.partner.branches[0].id })
    const second = await request(app).post(endpoint).set(headers).send({ branchId: data.partner.branches[0].id })

    expect(first.status).toBe(200)
    expect(first.body.data).toMatchObject({ status: VoucherCodeStatus.USED, remainingUses: 0 })
    expect(second.status).toBe(409)
    expect(await prisma.usageLog.count({ where: { issuedCodeId: data.code.id } })).toBe(1)
  })

  it('decrements multi-use codes and only marks them used on the final use', async () => {
    const data = await fixture({ multiUse: true, remainingUses: 2 })
    const endpoint = `/api/voucher-codes/${data.code.code}/redemption`
    const headers = authHeader(data.partnerUser.id, RoleName.PARTNER)
    const first = await request(app).post(endpoint).set(headers).send({ branchId: data.partner.branches[0].id })
    const second = await request(app).post(endpoint).set(headers).send({ branchId: data.partner.branches[0].id })

    expect(first.body.data).toMatchObject({ status: VoucherCodeStatus.UNUSED, remainingUses: 1 })
    expect(second.body.data).toMatchObject({ status: VoucherCodeStatus.USED, remainingUses: 0 })
    expect(await prisma.usageLog.count({ where: { issuedCodeId: data.code.id } })).toBe(2)
  })

  it('rejects a branch outside the voucher applicability scope', async () => {
    const data = await fixture()
    const response = await request(app)
      .post(`/api/voucher-codes/${data.code.code}/redemption`)
      .set(authHeader(data.partnerUser.id, RoleName.PARTNER))
      .send({ branchId: data.partner.branches[1].id })

    expect(response.status).toBe(403)
    expect(await prisma.usageLog.count()).toBe(0)
  })

  it('exposes a report containing only the authenticated partner data', async () => {
    const mine = await fixture()
    await fixture()
    await prisma.voucherProduct.update({
      where: { id: mine.code.voucherProductId },
      data: { remainingQuantity: { decrement: 2 } }
    })
    await prisma.order.create({
      data: {
        customerId: mine.customer.id,
        totalAmount: 160000,
        paymentMethod: 'TEST',
        status: OrderStatus.PENDING_PAYMENT,
        orderItems: { create: { voucherProductId: mine.code.voucherProductId, quantity: 2, unitPrice: 80000 } }
      }
    })
    const response = await request(app)
      .get('/api/partner/reports')
      .set(authHeader(mine.partnerUser.id, RoleName.PARTNER))

    expect(response.status).toBe(200)
    expect(response.body.data.summary).toMatchObject({ revenue: 80000, issuedCount: 1, soldCount: 1 })
    expect(response.body.data.vouchers).toHaveLength(1)
    expect(response.body.data.vouchers[0].id).toBe(mine.code.voucherProductId)
  })
})
