import fs from 'node:fs'
import path from 'node:path'

import { ApprovalStatus, OperatingStatus, OrderStatus, VoucherCodeStatus, VoucherStatus } from '@prisma/client'
import { RoleName } from '@voucher/shared'
import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import app from '~/app'
import prisma from '~/configs/prisma'
import { authHeader, createUser, resetUsers, seedRoles } from '~/test/helpers'

const future = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString()

beforeAll(seedRoles)
beforeEach(async () => {
  await resetUsers()
  await prisma.category.deleteMany()
})

async function createPartner(email: string, taxCode: string, approved = true) {
  const user = await createUser({ email, role: RoleName.PARTNER })
  const partner = await prisma.partner.create({
    data: {
      ownerUserId: user.id,
      legalName: `Doanh nghiệp ${taxCode}`,
      taxCode,
      representative: 'Người đại diện',
      approvalStatus: approved ? ApprovalStatus.APPROVED : ApprovalStatus.PENDING,
      operatingStatus: OperatingStatus.ACTIVE,
      branches: { create: { name: 'Chi nhánh chính', address: '1 Main St', region: 'Hà Nội' } }
    },
    include: { branches: true }
  })
  return { user, partner, headers: authHeader(user.id, RoleName.PARTNER) }
}

async function voucherPayload(branchIds: number[] = []) {
  const category = await prisma.category.create({ data: { name: `Danh mục ${crypto.randomUUID()}` } })
  return {
    categoryId: category.id,
    name: 'Voucher buffet cuối tuần',
    description: 'Áp dụng tại các chi nhánh đã chọn.',
    originalPrice: 500000,
    salePrice: 399000,
    saleStart: future(1),
    saleEnd: future(30),
    usageStart: future(1),
    usageEnd: future(60),
    totalQuantity: 100,
    isMultiUse: false,
    branchIds
  }
}

describe('voucher partner API', () => {
  it('requires an approved active partner and validates the complete payload', async () => {
    const pending = await createPartner('pending-voucher@example.com', 'VOUCHER-PENDING', false)
    const invalid = await voucherPayload(pending.partner.branches.map(({ id }) => id))

    const pendingResponse = await request(app).post('/api/vouchers').set(pending.headers).send(invalid)
    const customer = await createUser({ email: 'voucher-customer@example.com' })
    const customerResponse = await request(app).post('/api/vouchers').set(authHeader(customer.id)).send(invalid)

    expect(pendingResponse.status).toBe(403)
    expect(customerResponse.status).toBe(403)
    expect(await prisma.voucherProduct.count()).toBe(0)
  })

  it('creates a draft with category and owned branches in one transaction', async () => {
    const seller = await createPartner('create-voucher@example.com', 'VOUCHER-CREATE')
    const payload = await voucherPayload(seller.partner.branches.map(({ id }) => id))

    const response = await request(app).post('/api/vouchers').set(seller.headers).send(payload)

    expect(response.status).toBe(201)
    expect(response.body.data).toMatchObject({
      partnerId: seller.partner.id,
      categoryId: payload.categoryId,
      name: payload.name,
      status: VoucherStatus.DRAFT,
      remainingQuantity: payload.totalQuantity
    })
    expect(response.body.data.branches).toHaveLength(1)
    expect(response.body.data).toMatchObject({ issuedCodeCount: 0, usedCodeCount: 0, expiredCodeCount: 0 })
    expect(await prisma.voucherProductBranch.count()).toBe(1)
  })

  it('validates PostgreSQL integer bounds before querying relations', async () => {
    const seller = await createPartner('bounded-voucher@example.com', 'VOUCHER-BOUNDED')
    const response = await request(app)
      .post('/api/vouchers')
      .set(seller.headers)
      .send({ ...(await voucherPayload()), branchIds: [2_147_483_648] })

    expect(response.status).toBe(400)
    expect(await prisma.voucherProduct.count()).toBe(0)
  })

  it('rolls back creation when a branch belongs to another partner', async () => {
    const seller = await createPartner('owner-voucher@example.com', 'VOUCHER-OWNER')
    const other = await createPartner('other-voucher@example.com', 'VOUCHER-OTHER')
    const payload = await voucherPayload(other.partner.branches.map(({ id }) => id))

    const response = await request(app).post('/api/vouchers').set(seller.headers).send(payload)

    expect(response.status).toBe(403)
    expect(await prisma.voucherProduct.count()).toBe(0)
    expect(await prisma.voucherProductBranch.count()).toBe(0)
  })

  it('lists only owned vouchers and blocks cross-partner reads and updates', async () => {
    const first = await createPartner('first-voucher@example.com', 'VOUCHER-FIRST')
    const second = await createPartner('second-voucher@example.com', 'VOUCHER-SECOND')
    const created = await request(app)
      .post('/api/vouchers')
      .set(first.headers)
      .send(await voucherPayload(first.partner.branches.map(({ id }) => id)))
    const id = created.body.data.id as string

    const list = await request(app).get('/api/partner/vouchers?page=1&limit=10').set(first.headers)
    const forbiddenRead = await request(app).get(`/api/partner/vouchers/${id}`).set(second.headers)
    const forbiddenUpdate = await request(app).patch(`/api/vouchers/${id}`).set(second.headers).send({ name: 'Sai' })

    expect(list.body.data.pagination).toMatchObject({ page: 1, limit: 10, total: 1 })
    expect(list.body.data.vouchers[0].id).toBe(id)
    expect(forbiddenRead.status).toBe(403)
    expect(forbiddenUpdate.status).toBe(403)
  })

  it('counts only paid order items as sold instead of pending inventory reservations', async () => {
    const seller = await createPartner('paid-sales@example.com', 'VOUCHER-PAID-SALES')
    const created = await request(app)
      .post('/api/vouchers')
      .set(seller.headers)
      .send(await voucherPayload(seller.partner.branches.map(({ id }) => id)))
    const voucherId = created.body.data.id as string
    const customer = await createUser({ email: 'paid-sales-customer@example.com' })

    await prisma.voucherProduct.update({ where: { id: voucherId }, data: { remainingQuantity: { decrement: 3 } } })
    const order = await prisma.order.create({
      data: {
        customerId: customer.id,
        totalAmount: 1_197_000,
        paymentMethod: 'test',
        status: OrderStatus.PENDING_PAYMENT,
        orderItems: { create: { voucherProductId: voucherId, quantity: 3, unitPrice: 399_000 } }
      }
    })

    const whilePending = await request(app).get(`/api/partner/vouchers/${voucherId}`).set(seller.headers)
    expect(whilePending.body.data).toMatchObject({ remainingQuantity: 97, soldQuantity: 0 })

    await prisma.order.update({ where: { id: order.id }, data: { status: OrderStatus.PAID, paidAt: new Date() } })
    const afterPayment = await request(app).get(`/api/partner/vouchers/${voucherId}`).set(seller.headers)
    expect(afterPayment.body.data).toMatchObject({ remainingQuantity: 97, soldQuantity: 3 })
  })

  it('supports draft update, submit, review, publish, pause, resume, and discontinue', async () => {
    const seller = await createPartner('lifecycle-voucher@example.com', 'VOUCHER-LIFECYCLE')
    const admin = await createUser({ email: 'voucher-admin@example.com', role: RoleName.ADMIN })
    const adminHeaders = authHeader(admin.id, RoleName.ADMIN)
    const created = await request(app)
      .post('/api/vouchers')
      .set(seller.headers)
      .send(await voucherPayload(seller.partner.branches.map(({ id }) => id)))
    const id = created.body.data.id as string

    expect(
      (await request(app).patch(`/api/vouchers/${id}`).set(seller.headers).send({ name: 'Tên đã sửa' })).status
    ).toBe(200)
    expect((await request(app).post(`/api/vouchers/${id}/submission`).set(seller.headers)).body.data.status).toBe(
      VoucherStatus.PENDING_REVIEW
    )
    expect(
      (await request(app).patch(`/api/admin/vouchers/${id}/approval`).set(adminHeaders).send({ action: 'approve' }))
        .body.data.status
    ).toBe(VoucherStatus.APPROVED)
    expect(
      (await request(app).patch(`/api/admin/vouchers/${id}/status`).set(adminHeaders).send({ action: 'publish' })).body
        .data.status
    ).toBe(VoucherStatus.ON_SALE)
    expect(
      (await request(app).patch(`/api/vouchers/${id}/status`).set(seller.headers).send({ action: 'pause' })).body.data
        .status
    ).toBe(VoucherStatus.PAUSED)
    expect(
      (await request(app).patch(`/api/vouchers/${id}/status`).set(seller.headers).send({ action: 'resume' })).body.data
        .status
    ).toBe(VoucherStatus.ON_SALE)
    expect(
      (await request(app).patch(`/api/admin/vouchers/${id}/status`).set(adminHeaders).send({ action: 'discontinue' }))
        .body.data.status
    ).toBe(VoucherStatus.DISCONTINUED)
  })

  it('converts a multi-use draft back to single-use and clears uses per code', async () => {
    const seller = await createPartner('single-use-voucher@example.com', 'VOUCHER-SINGLE-USE')
    const created = await request(app)
      .post('/api/vouchers')
      .set(seller.headers)
      .send({ ...(await voucherPayload()), isMultiUse: true, usesPerCode: 3 })

    const response = await request(app)
      .patch(`/api/vouchers/${created.body.data.id}`)
      .set(seller.headers)
      .send({ isMultiUse: false, usesPerCode: null })

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({ isMultiUse: false, usesPerCode: null })
  })

  it('returns issued, used, and expired code counters without returning code rows', async () => {
    const seller = await createPartner('count-voucher@example.com', 'VOUCHER-COUNT')
    const created = await request(app)
      .post('/api/vouchers')
      .set(seller.headers)
      .send(await voucherPayload())
    const customer = await createUser({ email: 'code-owner@example.com' })
    const order = await prisma.order.create({
      data: {
        customerId: customer.id,
        totalAmount: 399000,
        paymentMethod: 'test',
        orderItems: {
          create: { voucherProductId: created.body.data.id, quantity: 3, unitPrice: 399000 }
        }
      },
      include: { orderItems: true }
    })
    await prisma.issuedVoucherCode.createMany({
      data: [VoucherCodeStatus.UNUSED, VoucherCodeStatus.USED, VoucherCodeStatus.EXPIRED].map((status, index) => ({
        code: `VOUCHER-CODE-${index}`,
        orderId: order.id,
        orderItemId: order.orderItems[0].id,
        voucherProductId: created.body.data.id,
        ownerUserId: customer.id,
        status,
        expiresAt: new Date(future(30))
      }))
    })

    const response = await request(app).get(`/api/partner/vouchers/${created.body.data.id}`).set(seller.headers)

    expect(response.body.data).toMatchObject({ issuedCodeCount: 3, usedCodeCount: 1, expiredCodeCount: 1 })
    expect(response.body.data.issuedVoucherCodes).toBeUndefined()
  })

  it('requires a rejection reason and permits rejected vouchers to return to draft', async () => {
    const seller = await createPartner('reject-voucher@example.com', 'VOUCHER-REJECT')
    const admin = await createUser({ email: 'reject-admin@example.com', role: RoleName.ADMIN })
    const adminHeaders = authHeader(admin.id, RoleName.ADMIN)
    const created = await request(app)
      .post('/api/vouchers')
      .set(seller.headers)
      .send(await voucherPayload())
    const id = created.body.data.id as string
    await request(app).post(`/api/vouchers/${id}/submission`).set(seller.headers)

    const missingReason = await request(app)
      .patch(`/api/admin/vouchers/${id}/approval`)
      .set(adminHeaders)
      .send({ action: 'reject' })
    const rejected = await request(app)
      .patch(`/api/admin/vouchers/${id}/approval`)
      .set(adminHeaders)
      .send({ action: 'reject', reason: 'Thông tin chưa đầy đủ' })
    const draft = await request(app).post(`/api/vouchers/${id}/draft`).set(seller.headers)

    expect(missingReason.status).toBe(400)
    expect(rejected.body.data).toMatchObject({ status: VoucherStatus.REJECTED, rejectReason: 'Thông tin chưa đầy đủ' })
    expect(draft.body.data.status).toBe(VoucherStatus.DRAFT)
  })

  it('never leaves a voucher on sale when partner locking races with publish', async () => {
    const seller = await createPartner('race-voucher@example.com', 'VOUCHER-RACE')
    const admin = await createUser({ email: 'race-admin@example.com', role: RoleName.ADMIN })
    const adminHeaders = authHeader(admin.id, RoleName.ADMIN)
    const created = await request(app)
      .post('/api/vouchers')
      .set(seller.headers)
      .send(await voucherPayload())
    const id = created.body.data.id as string
    await request(app).post(`/api/vouchers/${id}/submission`).set(seller.headers)
    await request(app).patch(`/api/admin/vouchers/${id}/approval`).set(adminHeaders).send({ action: 'approve' })

    const [publish, lock] = await Promise.all([
      request(app).patch(`/api/admin/vouchers/${id}/status`).set(adminHeaders).send({ action: 'publish' }),
      request(app).patch(`/api/admin/partners/${seller.partner.id}/lock`).set(adminHeaders).send({ action: 'lock' })
    ])

    expect([200, 422]).toContain(publish.status)
    expect(lock.status).toBe(200)
    const stored = await prisma.voucherProduct.findUniqueOrThrow({ where: { id } })
    expect(stored.status).not.toBe(VoucherStatus.ON_SALE)
  })

  it('rejects invalid or repeated state transitions', async () => {
    const seller = await createPartner('transition-voucher@example.com', 'VOUCHER-TRANSITION')
    const created = await request(app)
      .post('/api/vouchers')
      .set(seller.headers)
      .send(await voucherPayload())
    const id = created.body.data.id as string

    const pauseDraft = await request(app)
      .patch(`/api/vouchers/${id}/status`)
      .set(seller.headers)
      .send({ action: 'pause' })
    await request(app).post(`/api/vouchers/${id}/submission`).set(seller.headers)
    const repeatedSubmit = await request(app).post(`/api/vouchers/${id}/submission`).set(seller.headers)

    expect(pauseDraft.status).toBe(422)
    expect(repeatedSubmit.status).toBe(422)
  })
})

describe('voucher admin and supporting APIs', () => {
  it('provides a stable generated logo when a public partner has no uploaded logo', async () => {
    const seller = await createPartner('filter-logo@example.com', 'VOUCHER-FILTER-LOGO')
    const category = await prisma.category.create({ data: { name: 'Danh mục logo' } })
    await prisma.voucherProduct.create({
      data: {
        partnerId: seller.partner.id,
        categoryId: category.id,
        name: 'Voucher có logo đối tác',
        description: 'Dữ liệu kiểm thử logo trong bộ lọc công khai.',
        originalPrice: 200000,
        salePrice: 150000,
        saleStart: new Date(Date.now() - 86_400_000),
        saleEnd: new Date(future(30)),
        usageStart: new Date(),
        usageEnd: new Date(future(60)),
        totalQuantity: 10,
        remainingQuantity: 10,
        status: VoucherStatus.ON_SALE,
        voucherProductBranches: { create: { branchId: seller.partner.branches[0].id } }
      }
    })

    const response = await request(app).get('/api/vouchers/filters')
    const partner = response.body.data.partners.find(({ id }: { id: string }) => id === seller.partner.id)

    expect(response.status).toBe(200)
    expect(partner.logoUrl).toMatch(/^data:image\/svg\+xml,/)
  })

  it('protects admin listing and filters pending review vouchers', async () => {
    const seller = await createPartner('list-voucher@example.com', 'VOUCHER-LIST')
    const admin = await createUser({ email: 'list-admin@example.com', role: RoleName.ADMIN })
    const created = await request(app)
      .post('/api/vouchers')
      .set(seller.headers)
      .send(await voucherPayload())
    await request(app).post(`/api/vouchers/${created.body.data.id}/submission`).set(seller.headers)

    const anonymous = await request(app).get('/api/admin/vouchers')
    const listed = await request(app)
      .get('/api/admin/vouchers?status=PENDING_REVIEW')
      .set(authHeader(admin.id, RoleName.ADMIN))

    expect(anonymous.status).toBe(401)
    expect(listed.status).toBe(200)
    expect(listed.body.data.pagination.total).toBe(1)
    expect(listed.body.data.vouchers[0].status).toBe(VoucherStatus.PENDING_REVIEW)
  })

  it('lists categories without authentication', async () => {
    await prisma.category.createMany({ data: [{ name: 'Ăn uống' }, { name: 'Du lịch' }] })

    const response = await request(app).get('/api/categories')

    expect(response.status).toBe(200)
    const categoryNames = response.body.data.map(({ name }: { name: string }) => name)
    expect(categoryNames).toHaveLength(2)
    expect(categoryNames).toEqual(expect.arrayContaining(['Du lịch', 'Ăn uống']))
  })

  it('validates image content and serves a valid uploaded image', async () => {
    const seller = await createPartner('upload-voucher@example.com', 'VOUCHER-UPLOAD')
    const invalid = await request(app)
      .post('/api/vouchers/images')
      .set(seller.headers)
      .attach('image', Buffer.from('not an image'), { filename: 'fake.png', contentType: 'image/png' })
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64'
    )
    const valid = await request(app)
      .post('/api/vouchers/images')
      .set(seller.headers)
      .attach('image', png, { filename: 'voucher.png', contentType: 'image/png' })
    const imageUrl = valid.body.data.url as string
    const served = await request(app).get(imageUrl)

    expect(invalid.status).toBe(400)
    expect(valid.status).toBe(201)
    expect(served.status).toBe(200)
    fs.rmSync(path.resolve(process.cwd(), imageUrl.slice(1)), { force: true })
  })

  it('only accepts an existing image uploaded by the voucher owner', async () => {
    const owner = await createPartner('image-owner@example.com', 'VOUCHER-IMAGE-OWNER')
    const other = await createPartner('image-other@example.com', 'VOUCHER-IMAGE-OTHER')
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64'
    )
    const upload = await request(app)
      .post('/api/vouchers/images')
      .set(owner.headers)
      .attach('image', png, { filename: 'owned.png', contentType: 'image/png' })
    const imageUrl = upload.body.data.url as string

    const crossPartner = await request(app)
      .post('/api/vouchers')
      .set(other.headers)
      .send({ ...(await voucherPayload(other.partner.branches.map(({ id }) => id))), imageUrl })
    const missing = await request(app)
      .post('/api/vouchers')
      .set(owner.headers)
      .send({
        ...(await voucherPayload(owner.partner.branches.map(({ id }) => id))),
        imageUrl: `/uploads/vouchers/${owner.partner.id}-missing.png`
      })

    expect(upload.status).toBe(201)
    expect(crossPartner.status).toBe(403)
    expect(missing.status).toBe(400)
    fs.rmSync(path.resolve(process.cwd(), imageUrl.slice(1)), { force: true })
  })

  it('rate limits persistent image uploads per partner', async () => {
    const seller = await createPartner('upload-limit@example.com', 'VOUCHER-UPLOAD-LIMIT')
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64'
    )
    const uploadedPaths: string[] = []

    for (let index = 0; index < 20; index += 1) {
      const response = await request(app)
        .post('/api/vouchers/images')
        .set(seller.headers)
        .attach('image', png, { filename: `${index}.png`, contentType: 'image/png' })
      expect(response.status).toBe(201)
      uploadedPaths.push(response.body.data.url as string)
    }
    const limited = await request(app)
      .post('/api/vouchers/images')
      .set(seller.headers)
      .attach('image', png, { filename: 'limited.png', contentType: 'image/png' })

    expect(limited.status).toBe(429)
    for (const imageUrl of uploadedPaths) fs.rmSync(path.resolve(process.cwd(), imageUrl.slice(1)), { force: true })
  })

  it('removes an uploaded image when it would exceed the partner storage quota', async () => {
    const seller = await createPartner('upload-quota@example.com', 'VOUCHER-UPLOAD-QUOTA')
    const quotaFixture = path.resolve(process.cwd(), 'uploads', 'vouchers', `${seller.partner.id}-quota-fixture.png`)
    fs.writeFileSync(quotaFixture, Buffer.alloc(1))
    fs.truncateSync(quotaFixture, 100 * 1024 * 1024 - 1)
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64'
    )

    const response = await request(app)
      .post('/api/vouchers/images')
      .set(seller.headers)
      .attach('image', png, { filename: 'over-quota.png', contentType: 'image/png' })
    const remaining = fs
      .readdirSync(path.dirname(quotaFixture))
      .filter((name) => name.startsWith(`${seller.partner.id}-`))

    expect(response.status).toBe(422)
    expect(remaining).toEqual([path.basename(quotaFixture)])
    fs.rmSync(quotaFixture, { force: true })
  })
})
