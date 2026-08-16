import { RoleName } from '@voucher/shared'
import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import app from '~/app'
import prisma from '~/configs/prisma'
import { authHeader, createUser, resetUsers, seedRoles } from '~/test/helpers'
import { userService } from './user.service'

beforeAll(seedRoles)
beforeEach(resetUsers)

describe('admin user RBAC', () => {
  it('returns 401 without authentication and 403 for non-admin roles', async () => {
    const customer = await createUser({ email: 'customer@example.com' })
    const partner = await createUser({ email: 'partner@example.com', role: RoleName.PARTNER })

    const anonymous = await request(app).get('/api/admin/users')
    const customerResponse = await request(app).get('/api/admin/users').set(authHeader(customer.id))
    const partnerResponse = await request(app).get('/api/admin/users').set(authHeader(partner.id, RoleName.PARTNER))

    expect(anonymous.status).toBe(401)
    expect(customerResponse.status).toBe(403)
    expect(partnerResponse.status).toBe(403)
  })

  it('protects every admin mutation route from anonymous and non-admin callers', async () => {
    const customer = await createUser({ email: 'customer@example.com' })
    const partner = await createUser({ email: 'partner@example.com', role: RoleName.PARTNER })
    const target = await createUser({ email: 'target@example.com' })
    const routes = [
      { path: `/api/admin/users/${target.id}/lock`, body: {} },
      { path: `/api/admin/users/${target.id}/unlock`, body: {} },
      { path: `/api/admin/users/${target.id}/role`, body: { role: 'PARTNER' } }
    ]

    for (const route of routes) {
      const anonymous = await request(app).patch(route.path).send(route.body)
      const customerResponse = await request(app).patch(route.path).set(authHeader(customer.id)).send(route.body)
      const partnerResponse = await request(app)
        .patch(route.path)
        .set(authHeader(partner.id, RoleName.PARTNER))
        .send(route.body)

      expect(anonymous.status).toBe(401)
      expect(customerResponse.status).toBe(403)
      expect(partnerResponse.status).toBe(403)
    }
  })

  it('allows an admin to search with AND filters and cursor pagination', async () => {
    const admin = await createUser({ email: 'admin@example.com', role: RoleName.ADMIN })
    await createUser({ email: 'active.customer@example.com', fullName: 'Matching Customer' })
    await createUser({ email: 'locked.customer@example.com', fullName: 'Matching Customer', status: 'LOCKED' })
    await createUser({ email: 'active.partner@example.com', role: RoleName.PARTNER, fullName: 'Matching Partner' })

    const filtered = await request(app)
      .get('/api/admin/users')
      .query({ q: 'Matching', role: 'CUSTOMER', status: 'ACTIVE' })
      .set(authHeader(admin.id, RoleName.ADMIN))
    const firstPage = await request(app)
      .get('/api/admin/users')
      .query({ limit: 2 })
      .set(authHeader(admin.id, RoleName.ADMIN))
    const secondPage = await request(app)
      .get('/api/admin/users')
      .query({ limit: 2, cursor: firstPage.body.data.nextCursor })
      .set(authHeader(admin.id, RoleName.ADMIN))

    expect(filtered.status).toBe(200)
    expect(filtered.body.data.items).toHaveLength(1)
    expect(filtered.body.data.items[0].email).toBe('active.customer@example.com')
    expect(firstPage.body.data.items).toHaveLength(2)
    expect(firstPage.body.data.nextCursor).toBeTypeOf('string')
    expect(secondPage.body.data.items.map((item: { id: string }) => item.id)).not.toContain(
      firstPage.body.data.items[1].id
    )
  })

  it('locks and unlocks a user, invalidating and restoring an existing token', async () => {
    const admin = await createUser({ email: 'admin@example.com', role: RoleName.ADMIN })
    const target = await createUser({ email: 'target@example.com' })
    const targetHeaders = authHeader(target.id)

    const locked = await request(app)
      .patch(`/api/admin/users/${target.id}/lock`)
      .set(authHeader(admin.id, RoleName.ADMIN))
    const blockedProfile = await request(app).get('/api/me').set(targetHeaders)
    const unlocked = await request(app)
      .patch(`/api/admin/users/${target.id}/unlock`)
      .set(authHeader(admin.id, RoleName.ADMIN))
    const restoredProfile = await request(app).get('/api/me').set(targetHeaders)

    expect(locked.body.data.status).toBe('LOCKED')
    expect(blockedProfile.status).toBe(403)
    expect(unlocked.body.data.status).toBe('ACTIVE')
    expect(restoredProfile.status).toBe(200)
  })

  it('applies a role change immediately to an existing token', async () => {
    const admin = await createUser({ email: 'admin@example.com', role: RoleName.ADMIN })
    const target = await createUser({ email: 'promoted@example.com' })
    const targetHeaders = authHeader(target.id)

    const changed = await request(app)
      .patch(`/api/admin/users/${target.id}/role`)
      .set(authHeader(admin.id, RoleName.ADMIN))
      .send({ role: 'ADMIN' })
    const adminAccess = await request(app).get('/api/admin/users').set(targetHeaders)

    expect(changed.status).toBe(200)
    expect(changed.body.data.role.name).toBe('ADMIN')
    expect(adminAccess.status).toBe(200)
  })

  it('removes admin access from an existing token immediately after demotion', async () => {
    const controllingAdmin = await createUser({ email: 'controller@example.com', role: RoleName.ADMIN })
    const demotedAdmin = await createUser({ email: 'demoted@example.com', role: RoleName.ADMIN })
    const oldAdminToken = authHeader(demotedAdmin.id, RoleName.ADMIN)

    const changed = await request(app)
      .patch(`/api/admin/users/${demotedAdmin.id}/role`)
      .set(authHeader(controllingAdmin.id, RoleName.ADMIN))
      .send({ role: 'CUSTOMER' })
    const denied = await request(app).get('/api/admin/users').set(oldAdminToken)

    expect(changed.status).toBe(200)
    expect(denied.status).toBe(403)
  })

  it('validates IDs and maps missing users to 404', async () => {
    const admin = await createUser({ email: 'admin@example.com', role: RoleName.ADMIN })
    const headers = authHeader(admin.id, RoleName.ADMIN)

    const invalid = await request(app).patch('/api/admin/users/not-a-uuid/lock').set(headers)
    const missing = await request(app).patch('/api/admin/users/00000000-0000-4000-8000-000000000000/lock').set(headers)

    expect(invalid.status).toBe(400)
    expect(missing.status).toBe(404)
  })

  it('supports legacy role rows while returning canonical role names', async () => {
    const admin = await createUser({ email: 'admin@example.com', role: RoleName.ADMIN })
    const legacyRole = await prisma.role.upsert({
      where: { name: 'KHACH_HANG' },
      update: {},
      create: { name: 'KHACH_HANG' }
    })
    await prisma.user.create({
      data: {
        email: 'legacy@example.com',
        passwordHash: 'not-used',
        fullName: 'Legacy Customer',
        roleId: legacyRole.id
      }
    })

    const response = await request(app)
      .get('/api/admin/users')
      .query({ role: 'CUSTOMER', q: 'legacy@example.com' })
      .set(authHeader(admin.id, RoleName.ADMIN))

    expect(response.status).toBe(200)
    expect(response.body.data.items).toHaveLength(1)
    expect(response.body.data.items[0].role.name).toBe('CUSTOMER')
  })

  it('fails closed when a configured role is missing', async () => {
    const target = await createUser({ email: 'target@example.com' })
    await prisma.role.delete({ where: { name: RoleName.PARTNER } })

    try {
      await expect(userService.changeRole(target.id, { role: RoleName.PARTNER })).rejects.toMatchObject({
        statusCode: 404
      })
    } finally {
      await prisma.role.create({ data: { name: RoleName.PARTNER } })
    }
  })
})
