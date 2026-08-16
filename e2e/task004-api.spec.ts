import { expect, test, type APIRequestContext } from '@playwright/test'

import { E2E_NEW_PASSWORD, E2E_PASSWORD, e2eUsers } from './fixtures/task004'

const apiBaseUrl = 'http://127.0.0.1:4100/api'

interface LoginData {
  token: string
  user: { id: string; role: string }
}

async function login(request: APIRequestContext, identifier: string, password = E2E_PASSWORD): Promise<LoginData> {
  const response = await request.post(`${apiBaseUrl}/auth/login`, { data: { identifier, password } })
  expect(response.status()).toBe(200)
  const body = (await response.json()) as { success: boolean; data: LoginData }
  expect(body.success).toBe(true)
  return body.data
}

function bearer(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` }
}

test.describe.serial('TASK-004 backend API', () => {
  test('@FLOW-001 covers registration, login, profile, password reset/change and logout', async ({ request }) => {
    const email = 'registered.e2e@voucherhub.test'

    await test.step('reject malformed registration', async () => {
      const response = await request.post(`${apiBaseUrl}/auth/register`, {
        data: { email: 'invalid', password: 'short', fullName: '' }
      })
      expect(response.status()).toBe(400)
      await expect(response.json()).resolves.toMatchObject({ success: false })
    })

    await test.step('register and enforce identifier uniqueness', async () => {
      const payload = { email, password: E2E_PASSWORD, fullName: 'Registered E2E Customer' }
      const created = await request.post(`${apiBaseUrl}/auth/register`, { data: payload })
      expect(created.status()).toBe(201)
      const body = await created.json()
      expect(body).toMatchObject({ success: true, data: { email, role: 'CUSTOMER' } })
      expect(JSON.stringify(body)).not.toContain('passwordHash')

      const duplicate = await request.post(`${apiBaseUrl}/auth/register`, { data: payload })
      expect(duplicate.status()).toBe(409)
    })

    await test.step('return a generic failure for invalid credentials', async () => {
      const response = await request.post(`${apiBaseUrl}/auth/login`, {
        data: { identifier: email, password: 'WrongPassword123!' }
      })
      expect(response.status()).toBe(401)
      await expect(response.json()).resolves.toMatchObject({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Sai thông tin đăng nhập' }
      })
    })

    const session = await login(request, email)

    await test.step('read and update the authenticated profile', async () => {
      const profile = await request.get(`${apiBaseUrl}/me`, { headers: bearer(session.token) })
      expect(profile.status()).toBe(200)
      await expect(profile.json()).resolves.toMatchObject({
        success: true,
        data: { email, role: { name: 'CUSTOMER' } }
      })

      const updated = await request.patch(`${apiBaseUrl}/me`, {
        headers: bearer(session.token),
        data: { fullName: 'Updated E2E Customer' }
      })
      expect(updated.status()).toBe(200)
      await expect(updated.json()).resolves.toMatchObject({ data: { fullName: 'Updated E2E Customer' } })
    })

    await test.step('keep password reset responses indistinguishable', async () => {
      const known = await request.post(`${apiBaseUrl}/auth/password-reset`, { data: { identifier: email } })
      const unknown = await request.post(`${apiBaseUrl}/auth/password-reset`, {
        data: { identifier: 'unknown.e2e@voucherhub.test' }
      })
      expect(known.status()).toBe(200)
      expect(unknown.status()).toBe(200)
      expect(Object.keys((await known.json()).data)).toEqual(Object.keys((await unknown.json()).data))
    })

    await test.step('change password and revoke the previous token', async () => {
      const wrongCurrent = await request.patch(`${apiBaseUrl}/auth/password`, {
        headers: bearer(session.token),
        data: { currentPassword: 'WrongPassword123!', newPassword: E2E_NEW_PASSWORD }
      })
      expect(wrongCurrent.status()).toBe(401)

      const changed = await request.patch(`${apiBaseUrl}/auth/password`, {
        headers: bearer(session.token),
        data: { currentPassword: E2E_PASSWORD, newPassword: E2E_NEW_PASSWORD }
      })
      expect(changed.status()).toBe(200)

      const oldToken = await request.get(`${apiBaseUrl}/me`, { headers: bearer(session.token) })
      expect(oldToken.status()).toBe(401)

      const oldPassword = await request.post(`${apiBaseUrl}/auth/login`, {
        data: { identifier: email, password: E2E_PASSWORD }
      })
      expect(oldPassword.status()).toBe(401)
    })

    const renewedSession = await login(request, email, E2E_NEW_PASSWORD)
    const logout = await request.post(`${apiBaseUrl}/auth/logout`, { headers: bearer(renewedSession.token) })
    expect(logout.status()).toBe(200)
    expect((await request.get(`${apiBaseUrl}/me`, { headers: bearer(renewedSession.token) })).status()).toBe(200)
  })

  test('@FLOW-009 enforces RBAC and applies lock/unlock/role changes immediately', async ({ request }) => {
    const [admin, customer, partner, lockTarget] = await Promise.all([
      login(request, e2eUsers.admin.email),
      login(request, e2eUsers.customer.email),
      login(request, e2eUsers.partner.email),
      login(request, e2eUsers.lockTarget.email)
    ])

    const routes: { method: 'get' | 'patch'; path: string; data?: Record<string, string> }[] = [
      { method: 'get', path: '/admin/users' },
      { method: 'patch', path: `/admin/users/${lockTarget.user.id}/lock` },
      { method: 'patch', path: `/admin/users/${lockTarget.user.id}/unlock` },
      { method: 'patch', path: `/admin/users/${lockTarget.user.id}/role`, data: { role: 'CUSTOMER' } }
    ]

    for (const route of routes) {
      const anonymous = await request.fetch(`${apiBaseUrl}${route.path}`, { method: route.method, data: route.data })
      expect(anonymous.status()).toBe(401)

      for (const session of [customer, partner]) {
        const forbidden = await request.fetch(`${apiBaseUrl}${route.path}`, {
          method: route.method,
          headers: bearer(session.token),
          data: route.data
        })
        expect(forbidden.status()).toBe(403)
      }
    }

    const promoted = await request.patch(`${apiBaseUrl}/admin/users/${customer.user.id}/role`, {
      headers: bearer(admin.token),
      data: { role: 'ADMIN' }
    })
    expect(promoted.status()).toBe(200)
    expect((await request.get(`${apiBaseUrl}/admin/users`, { headers: bearer(customer.token) })).status()).toBe(200)

    const demoted = await request.patch(`${apiBaseUrl}/admin/users/${customer.user.id}/role`, {
      headers: bearer(admin.token),
      data: { role: 'CUSTOMER' }
    })
    expect(demoted.status()).toBe(200)
    expect((await request.get(`${apiBaseUrl}/admin/users`, { headers: bearer(customer.token) })).status()).toBe(403)

    const listed = await request.get(`${apiBaseUrl}/admin/users`, {
      headers: bearer(admin.token),
      params: { q: 'lock-target', role: 'CUSTOMER', status: 'ACTIVE', limit: 1 }
    })
    expect(listed.status()).toBe(200)
    await expect(listed.json()).resolves.toMatchObject({
      success: true,
      data: { items: [{ id: lockTarget.user.id, role: { name: 'CUSTOMER' }, status: 'ACTIVE' }] }
    })

    const locked = await request.patch(`${apiBaseUrl}/admin/users/${lockTarget.user.id}/lock`, {
      headers: bearer(admin.token)
    })
    expect(locked.status()).toBe(200)
    expect((await request.get(`${apiBaseUrl}/me`, { headers: bearer(lockTarget.token) })).status()).toBe(403)

    const unlocked = await request.patch(`${apiBaseUrl}/admin/users/${lockTarget.user.id}/unlock`, {
      headers: bearer(admin.token)
    })
    expect(unlocked.status()).toBe(200)
    expect((await request.get(`${apiBaseUrl}/me`, { headers: bearer(lockTarget.token) })).status()).toBe(200)

    const changedRole = await request.patch(`${apiBaseUrl}/admin/users/${lockTarget.user.id}/role`, {
      headers: bearer(admin.token),
      data: { role: 'PARTNER' }
    })
    expect(changedRole.status()).toBe(200)
    await expect(changedRole.json()).resolves.toMatchObject({ data: { role: { name: 'PARTNER' } } })
  })
})
