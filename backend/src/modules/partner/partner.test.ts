import { ApprovalStatus, OperatingStatus } from '@prisma/client'
import { RoleName } from '@voucher/shared'
import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import app from '~/app'
import prisma from '~/configs/prisma'
import { authHeader, createUser, resetUsers, seedRoles, TEST_PASSWORD } from '~/test/helpers'

const registration = {
  email: 'partner@example.com',
  password: TEST_PASSWORD,
  legalName: 'Công ty Đối tác Demo',
  taxCode: 'TAX-001',
  representative: 'Nguyễn Đại Diện',
  branches: [{ name: 'Chi nhánh Quận 1', address: '1 Nguyễn Huệ', region: 'Hồ Chí Minh' }]
}

beforeAll(seedRoles)
beforeEach(resetUsers)

async function createPartner(options: {
  email: string
  taxCode: string
  approvalStatus?: ApprovalStatus
  operatingStatus?: OperatingStatus
}) {
  const user = await createUser({ email: options.email, role: RoleName.PARTNER })
  const partner = await prisma.partner.create({
    data: {
      ownerUserId: user.id,
      legalName: `Doanh nghiệp ${options.taxCode}`,
      taxCode: options.taxCode,
      representative: 'Người đại diện',
      approvalStatus: options.approvalStatus ?? ApprovalStatus.APPROVED,
      operatingStatus: options.operatingStatus ?? OperatingStatus.ACTIVE,
      branches: { create: { name: 'Chi nhánh chính', address: '1 Main St', region: 'Hà Nội' } }
    },
    include: { branches: true }
  })
  return { user, partner, headers: authHeader(user.id, RoleName.PARTNER) }
}

describe('partner registration and approval', () => {
  it('validates the public registration payload before writing data', async () => {
    const response = await request(app)
      .post('/api/partners')
      .send({ ...registration, branches: [] })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
    expect(await prisma.user.count()).toBe(0)
    expect(await prisma.partner.count()).toBe(0)
  })

  it('creates the account, pending partner profile, and branches atomically', async () => {
    const response = await request(app).post('/api/partners').send(registration)

    expect(response.status).toBe(201)
    expect(response.body.data.user).toMatchObject({ email: registration.email, role: RoleName.PARTNER })
    expect(response.body.data.partner).toMatchObject({
      legalName: registration.legalName,
      taxCode: registration.taxCode,
      approvalStatus: ApprovalStatus.PENDING,
      operatingStatus: OperatingStatus.ACTIVE
    })
    expect(response.body.data.partner.branches).toHaveLength(1)
    expect(await prisma.user.count()).toBe(1)
    expect(await prisma.partner.count()).toBe(1)
    expect(await prisma.branch.count()).toBe(1)
  })

  it('returns 409 for a duplicate identity without creating partial records', async () => {
    expect((await request(app).post('/api/partners').send(registration)).status).toBe(201)

    const duplicate = await request(app)
      .post('/api/partners')
      .send({ ...registration, taxCode: 'TAX-002', branches: [{ ...registration.branches[0], name: 'Khác' }] })

    expect(duplicate.status).toBe(409)
    expect(await prisma.user.count()).toBe(1)
    expect(await prisma.partner.count()).toBe(1)
    expect(await prisma.branch.count()).toBe(1)
  })

  it('blocks pending login, then allows login immediately after admin approval', async () => {
    const registered = await request(app).post('/api/partners').send(registration)
    const partnerId = registered.body.data.partner.id as string
    const pendingLogin = await request(app)
      .post('/api/auth/login')
      .send({ identifier: registration.email, password: TEST_PASSWORD })
    const admin = await createUser({ email: 'admin@example.com', role: RoleName.ADMIN })
    const approved = await request(app)
      .patch(`/api/admin/partners/${partnerId}/approval`)
      .set(authHeader(admin.id, RoleName.ADMIN))
      .send({ action: 'approve' })
    const approvedLogin = await request(app)
      .post('/api/auth/login')
      .send({ identifier: registration.email, password: TEST_PASSWORD })

    expect(pendingLogin.status).toBe(403)
    expect(pendingLogin.body.error.message).toContain('chờ duyệt')
    expect(approved.status).toBe(200)
    expect(approved.body.data.approvalStatus).toBe(ApprovalStatus.APPROVED)
    expect(approvedLogin.status).toBe(200)
    expect(approvedLogin.body.data.user.role).toBe(RoleName.PARTNER)
  })

  it('requires a rejection reason and rejects repeated review actions', async () => {
    const pending = await createPartner({
      email: 'pending@example.com',
      taxCode: 'TAX-PENDING',
      approvalStatus: ApprovalStatus.PENDING
    })
    const admin = await createUser({ email: 'admin@example.com', role: RoleName.ADMIN })
    const headers = authHeader(admin.id, RoleName.ADMIN)

    const missingReason = await request(app)
      .patch(`/api/admin/partners/${pending.partner.id}/approval`)
      .set(headers)
      .send({ action: 'reject' })
    const rejected = await request(app)
      .patch(`/api/admin/partners/${pending.partner.id}/approval`)
      .set(headers)
      .send({ action: 'reject', reason: 'Mã số thuế không hợp lệ' })
    const repeated = await request(app)
      .patch(`/api/admin/partners/${pending.partner.id}/approval`)
      .set(headers)
      .send({ action: 'approve' })

    expect(missingReason.status).toBe(400)
    expect(rejected.status).toBe(200)
    expect(rejected.body.data).toMatchObject({
      approvalStatus: ApprovalStatus.REJECTED,
      rejectReason: 'Mã số thuế không hợp lệ'
    })
    expect(repeated.status).toBe(409)
  })

  it('allows only one concurrent review to leave the pending state', async () => {
    const pending = await createPartner({
      email: 'concurrent@example.com',
      taxCode: 'TAX-CONCURRENT',
      approvalStatus: ApprovalStatus.PENDING
    })
    const admin = await createUser({ email: 'admin@example.com', role: RoleName.ADMIN })
    const headers = authHeader(admin.id, RoleName.ADMIN)

    const responses = await Promise.all([
      request(app).patch(`/api/admin/partners/${pending.partner.id}/approval`).set(headers).send({ action: 'approve' }),
      request(app)
        .patch(`/api/admin/partners/${pending.partner.id}/approval`)
        .set(headers)
        .send({ action: 'reject', reason: 'Concurrent rejection' })
    ])

    expect(responses.map((response) => response.status).sort()).toEqual([200, 409])
    const stored = await prisma.partner.findUniqueOrThrow({ where: { id: pending.partner.id } })
    expect([ApprovalStatus.APPROVED, ApprovalStatus.REJECTED]).toContain(stored.approvalStatus)
  })
})

describe('partner RBAC and branch ownership', () => {
  it('protects admin partner listing from anonymous and non-admin callers', async () => {
    const customer = await createUser({ email: 'customer@example.com' })
    const partner = await createPartner({ email: 'seller@example.com', taxCode: 'TAX-SELLER' })

    const anonymous = await request(app).get('/api/admin/partners')
    const customerResponse = await request(app).get('/api/admin/partners').set(authHeader(customer.id))
    const partnerResponse = await request(app).get('/api/admin/partners').set(partner.headers)

    expect(anonymous.status).toBe(401)
    expect(customerResponse.status).toBe(403)
    expect(partnerResponse.status).toBe(403)
  })

  it('supports branch create, update, list, delete, and blocks cross-partner updates', async () => {
    const first = await createPartner({ email: 'first@example.com', taxCode: 'TAX-FIRST' })
    const second = await createPartner({ email: 'second@example.com', taxCode: 'TAX-SECOND' })

    const created = await request(app)
      .post('/api/partner/branches')
      .set(first.headers)
      .send({ name: 'Chi nhánh mới', address: '2 New St', region: 'Đà Nẵng' })
    const branchId = created.body.data.id as number
    const forbidden = await request(app)
      .patch(`/api/partner/branches/${branchId}`)
      .set(second.headers)
      .send({ name: 'Không được phép' })
    const updated = await request(app)
      .patch(`/api/partner/branches/${branchId}`)
      .set(first.headers)
      .send({ name: 'Chi nhánh đã sửa' })
    const listed = await request(app).get('/api/partner/branches').set(first.headers)
    const deleted = await request(app).delete(`/api/partner/branches/${branchId}`).set(first.headers)

    expect(created.status).toBe(201)
    expect(forbidden.status).toBe(403)
    expect(updated.body.data.name).toBe('Chi nhánh đã sửa')
    expect(listed.body.data.map((branch: { id: number }) => branch.id)).toContain(branchId)
    expect(deleted.status).toBe(204)
    expect(await prisma.branch.findUnique({ where: { id: branchId } })).toBeNull()
  })

  it('returns and updates the authenticated partner profile', async () => {
    const partner = await createPartner({ email: 'profile@example.com', taxCode: 'TAX-PROFILE' })

    const profile = await request(app).get('/api/partner').set(partner.headers)
    const updated = await request(app)
      .patch('/api/partner')
      .set(partner.headers)
      .send({ legalName: 'Tên pháp lý đã cập nhật', representative: 'Đại diện mới' })

    expect(profile.status).toBe(200)
    expect(profile.body.data.id).toBe(partner.partner.id)
    expect(updated.status).toBe(200)
    expect(updated.body.data).toMatchObject({
      legalName: 'Tên pháp lý đã cập nhật',
      representative: 'Đại diện mới'
    })
  })

  it('allows an admin to list partners and edit a branch only under the matching partner', async () => {
    const first = await createPartner({ email: 'first-admin@example.com', taxCode: 'TAX-ADMIN-FIRST' })
    const second = await createPartner({ email: 'second-admin@example.com', taxCode: 'TAX-ADMIN-SECOND' })
    const admin = await createUser({ email: 'admin@example.com', role: RoleName.ADMIN })
    const headers = authHeader(admin.id, RoleName.ADMIN)
    const branchId = first.partner.branches[0].id

    const listed = await request(app).get('/api/admin/partners').set(headers)
    const wrongScope = await request(app)
      .patch(`/api/admin/partners/${second.partner.id}/branches/${branchId}`)
      .set(headers)
      .send({ name: 'Sai phạm vi' })
    const updated = await request(app)
      .patch(`/api/admin/partners/${first.partner.id}/branches/${branchId}`)
      .set(headers)
      .send({ name: 'Admin đã cập nhật' })

    expect(listed.status).toBe(200)
    expect(listed.body.data.pagination.total).toBe(2)
    expect(wrongScope.status).toBe(403)
    expect(updated.status).toBe(200)
    expect(updated.body.data.name).toBe('Admin đã cập nhật')
  })

  it('applies partner lock and unlock immediately to an existing token', async () => {
    const partner = await createPartner({ email: 'locked@example.com', taxCode: 'TAX-LOCKED' })
    const admin = await createUser({ email: 'admin@example.com', role: RoleName.ADMIN })
    const adminHeaders = authHeader(admin.id, RoleName.ADMIN)

    expect((await request(app).get('/api/partner').set(partner.headers)).status).toBe(200)
    const locked = await request(app)
      .patch(`/api/admin/partners/${partner.partner.id}/lock`)
      .set(adminHeaders)
      .send({ action: 'lock' })
    const denied = await request(app).get('/api/partner').set(partner.headers)
    const unlocked = await request(app)
      .patch(`/api/admin/partners/${partner.partner.id}/lock`)
      .set(adminHeaders)
      .send({ action: 'unlock' })
    const restored = await request(app).get('/api/partner').set(partner.headers)

    expect(locked.body.data.operatingStatus).toBe(OperatingStatus.SUSPENDED)
    expect(denied.status).toBe(403)
    expect(unlocked.body.data.operatingStatus).toBe(OperatingStatus.ACTIVE)
    expect(restored.status).toBe(200)
  })
})
