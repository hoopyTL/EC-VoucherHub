import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import app from '~/app'
import prisma from '~/configs/prisma'
import { authService } from './auth.service'
import { verifyPassword } from '~/utils/password'
import { authHeader, createUser, resetUsers, seedRoles, TEST_PASSWORD } from '~/test/helpers'

beforeAll(seedRoles)
beforeEach(resetUsers)

describe('POST /api/auth/register', () => {
  it('registers a customer, normalizes email, and never exposes the password hash', async () => {
    const response = await request(app).post('/api/auth/register').send({
      email: '  NEW.User@Example.com ',
      password: TEST_PASSWORD,
      fullName: 'New User'
    })

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({
      success: true,
      data: { email: 'new.user@example.com', role: 'CUSTOMER' }
    })
    expect(response.body.data.verificationCode).toMatch(/^\d{6}$/)
    expect(response.body.data).not.toHaveProperty('password')
    expect(response.body.data).not.toHaveProperty('passwordHash')

    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'new.user@example.com' } })
    expect(user.passwordHash).not.toBe(TEST_PASSWORD)
    expect(await verifyPassword(TEST_PASSWORD, user.passwordHash)).toBe(true)
  })

  it('accepts phone as the only identifier', async () => {
    const response = await request(app).post('/api/auth/register').send({
      phone: '0901234567',
      password: TEST_PASSWORD,
      fullName: 'Phone User'
    })

    expect(response.status).toBe(201)
    expect(response.body.data).toMatchObject({ phone: '0901234567', email: null })
  })

  it.each([
    [{ password: TEST_PASSWORD, fullName: 'Missing Identifier' }, 'email'],
    [{ email: 'bad-email', password: TEST_PASSWORD, fullName: 'Bad Email' }, 'email'],
    [{ phone: 'abc123', password: TEST_PASSWORD, fullName: 'Bad Phone' }, 'phone'],
    [{ email: 'short@example.com', password: '1234567', fullName: 'Short Password' }, 'password'],
    [{ email: 'long@example.com', password: 'a'.repeat(73), fullName: 'Long Password' }, 'password'],
    [{ email: 'bytes@example.com', password: 'á'.repeat(40), fullName: 'Long Bytes' }, 'password']
  ])('rejects invalid registration input', async (body, field) => {
    const response = await request(app).post('/api/auth/register').send(body)

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
    expect(response.body.error.details.some((item: { field: string }) => item.field === field)).toBe(true)
  })

  it('returns 409 for duplicate email and phone', async () => {
    await request(app).post('/api/auth/register').send({
      email: 'duplicate@example.com',
      phone: '0901111111',
      password: TEST_PASSWORD,
      fullName: 'First User'
    })

    const duplicateEmail = await request(app).post('/api/auth/register').send({
      email: 'duplicate@example.com',
      password: TEST_PASSWORD,
      fullName: 'Second User'
    })
    const duplicatePhone = await request(app).post('/api/auth/register').send({
      phone: '0901111111',
      password: TEST_PASSWORD,
      fullName: 'Third User'
    })

    expect(duplicateEmail.status).toBe(409)
    expect(duplicatePhone.status).toBe(409)
  })

  it('fails closed when the customer role is not configured', async () => {
    await prisma.role.deleteMany({ where: { name: { in: ['CUSTOMER', 'KHACH_HANG'] } } })

    try {
      const response = await request(app).post('/api/auth/register').send({
        email: 'missing-role@example.com',
        password: TEST_PASSWORD,
        fullName: 'Missing Role'
      })

      expect(response.status).toBe(500)
      expect(response.body.error.code).toBe('INTERNAL_ERROR')
    } finally {
      await prisma.role.create({ data: { name: 'CUSTOMER' } })
    }
  })
})

describe('authentication and profile flow', () => {
  it('logs in case-insensitively and returns a usable JWT', async () => {
    const user = await createUser({ email: 'login@example.com' })

    const login = await request(app).post('/api/auth/login').send({
      identifier: 'LOGIN@EXAMPLE.COM',
      password: TEST_PASSWORD
    })
    const profile = await request(app).get('/api/me').set('Authorization', `Bearer ${login.body.data.token}`)

    expect(login.status).toBe(200)
    expect(login.body.data.user).toEqual({ id: user.id, role: 'CUSTOMER' })
    expect(profile.status).toBe(200)
    expect(profile.body.data).not.toHaveProperty('passwordHash')
  })

  it('logs in with a phone identifier', async () => {
    const user = await createUser({ email: 'phone-login@example.com' })
    await prisma.user.update({ where: { id: user.id }, data: { phone: '0902222222' } })

    const response = await request(app).post('/api/auth/login').send({
      identifier: '0902222222',
      password: TEST_PASSWORD
    })

    expect(response.status).toBe(200)
    expect(response.body.data.user.id).toBe(user.id)
  })

  it('uses the same unauthorized response for a missing account and wrong password', async () => {
    await createUser({ email: 'existing@example.com' })

    const missing = await request(app).post('/api/auth/login').send({
      identifier: 'missing@example.com',
      password: TEST_PASSWORD
    })
    const wrongPassword = await request(app).post('/api/auth/login').send({
      identifier: 'existing@example.com',
      password: 'WrongPassword123!'
    })

    expect(missing.status).toBe(401)
    expect(wrongPassword.status).toBe(401)
    expect(missing.body.error).toEqual(wrongPassword.body.error)
  })

  it('blocks a locked account at login', async () => {
    await createUser({ email: 'locked@example.com', status: 'LOCKED' })

    const response = await request(app).post('/api/auth/login').send({
      identifier: 'locked@example.com',
      password: TEST_PASSWORD
    })

    expect(response.status).toBe(403)
  })

  it('does not reveal whether a password-reset account exists', async () => {
    await createUser({ email: 'reset@example.com' })

    const existing = await request(app).post('/api/auth/password-reset').send({ identifier: 'reset@example.com' })
    const missing = await request(app).post('/api/auth/password-reset').send({ identifier: 'missing@example.com' })

    expect(existing.status).toBe(200)
    expect(missing.status).toBe(200)
    expect(existing.body.data).toMatchObject({ requested: true, resetCode: expect.stringMatching(/^\d{6}$/) })
    expect(missing.body.data).toMatchObject({ requested: true, resetCode: expect.stringMatching(/^\d{6}$/) })
    expect(Object.keys(existing.body.data)).toEqual(Object.keys(missing.body.data))
  })

  it('marks only a registered identifier as an internally deliverable reset request', async () => {
    await createUser({ email: 'deliverable@example.com' })

    const existing = await authService.requestPasswordReset({ identifier: 'deliverable@example.com' })
    const missing = await authService.requestPasswordReset({ identifier: 'missing@example.com' })

    expect(existing).toMatchObject({ deliverable: true, resetCode: expect.stringMatching(/^\d{6}$/) })
    expect(missing).toMatchObject({ deliverable: false, resetCode: expect.stringMatching(/^\d{6}$/) })
  })

  it('requires a valid bearer token for protected routes', async () => {
    const missing = await request(app).get('/api/me')
    const malformed = await request(app).get('/api/me').set('Authorization', 'Bearer invalid-token')
    const deletedUser = await request(app).get('/api/me').set(authHeader(crypto.randomUUID()))

    expect(missing.status).toBe(401)
    expect(malformed.status).toBe(401)
    expect(deletedUser.status).toBe(401)
  })

  it('updates the profile without exposing sensitive fields', async () => {
    const user = await createUser({ email: 'profile@example.com' })

    const response = await request(app)
      .patch('/api/me')
      .set(authHeader(user.id))
      .send({ fullName: 'Updated Name', email: 'UPDATED@EXAMPLE.COM' })

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({ fullName: 'Updated Name', email: 'updated@example.com' })
    expect(response.body.data).not.toHaveProperty('passwordHash')
  })

  it('rejects empty, malformed, and duplicate profile updates', async () => {
    const user = await createUser({ email: 'profile@example.com' })
    await createUser({ email: 'taken@example.com' })
    const headers = authHeader(user.id)

    const empty = await request(app).patch('/api/me').set(headers).send({})
    const malformed = await request(app).patch('/api/me').set(headers).send({ phone: 'not-a-phone' })
    const duplicate = await request(app).patch('/api/me').set(headers).send({ email: 'taken@example.com' })

    expect(empty.status).toBe(400)
    expect(malformed.status).toBe(400)
    expect(duplicate.status).toBe(409)
    expect(duplicate.body.error.code).toBe('DUPLICATE_ENTRY')
  })

  it('changes the password only when the current password is correct', async () => {
    const user = await createUser({ email: 'password@example.com' })
    const headers = authHeader(user.id)

    const wrong = await request(app)
      .patch('/api/auth/password')
      .set(headers)
      .send({ currentPassword: 'WrongPassword123!', newPassword: 'NewPassword123!' })
    const changed = await request(app)
      .patch('/api/auth/password')
      .set(headers)
      .send({ currentPassword: TEST_PASSWORD, newPassword: 'NewPassword123!' })
    const login = await request(app).post('/api/auth/login').send({
      identifier: 'password@example.com',
      password: 'NewPassword123!'
    })
    const oldPasswordLogin = await request(app).post('/api/auth/login').send({
      identifier: 'password@example.com',
      password: TEST_PASSWORD
    })
    const oldTokenAfterChange = await request(app).get('/api/me').set(headers)
    const invalidNewPassword = await request(app)
      .patch('/api/auth/password')
      .set('Authorization', `Bearer ${login.body.data.token}`)
      .send({ currentPassword: 'NewPassword123!', newPassword: 'short' })

    expect(wrong.status).toBe(401)
    expect(changed.status).toBe(200)
    expect(login.status).toBe(200)
    expect(oldPasswordLogin.status).toBe(401)
    expect(oldTokenAfterChange.status).toBe(401)
    expect(invalidNewPassword.status).toBe(400)
  })

  it('returns a stateless logout acknowledgement', async () => {
    const user = await createUser({ email: 'logout@example.com' })
    const headers = authHeader(user.id)
    const response = await request(app).post('/api/auth/logout').set(headers)
    const stillValid = await request(app).get('/api/me').set(headers)

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual({ loggedOut: true })
    expect(stillValid.status).toBe(200)
  })

  it('maps missing service resources to 404', async () => {
    const missingId = crypto.randomUUID()

    await expect(
      authService.changePassword(missingId, { currentPassword: TEST_PASSWORD, newPassword: 'NewPassword123!' })
    ).rejects.toMatchObject({ statusCode: 404 })
    await expect(authService.getProfile(missingId)).rejects.toMatchObject({ statusCode: 404 })
  })
})
