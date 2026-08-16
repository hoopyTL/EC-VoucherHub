import { RoleName } from '@voucher/shared'
import fc from 'fast-check'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import prisma from '~/configs/prisma'
import { createUser, resetUsers, seedRoles, TEST_PASSWORD } from '~/test/helpers'
import { authService } from './auth.service'
import { userService } from '~/modules/user/user.service'
import { verifyPassword } from '~/utils/password'

beforeAll(seedRoles)
beforeEach(resetUsers)

describe('TASK-004 database properties', () => {
  it('Properties 18/19: persists a hash and rejects every duplicate identifier through registration', async () => {
    const passwordCharacters = [...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$']
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc
          .array(fc.constantFrom(...passwordCharacters), { minLength: 8, maxLength: 24 })
          .map((value) => value.join('')),
        fc.boolean(),
        async (id, password, usePhone) => {
          const phone = `09${id.replace(/\D/g, '').padEnd(8, '0').slice(0, 8)}`
          const dto = {
            ...(usePhone ? { phone } : { email: `${id}@example.com` }),
            password,
            fullName: 'Property User'
          }

          const created = await authService.register(dto)
          const stored = await prisma.user.findUniqueOrThrow({ where: { id: created.id } })

          expect(stored.passwordHash).not.toBe(password)
          expect(await verifyPassword(password, stored.passwordHash)).toBe(true)
          await expect(authService.register(dto)).rejects.toMatchObject({ statusCode: 409 })
          await prisma.user.delete({ where: { id: created.id } })
        }
      ),
      { numRuns: 100 }
    )
  }, 60000)

  it('Property 22: lock blocks login and unlock restores it for every round', async () => {
    const user = await createUser({ email: 'roundtrip@example.com' })

    await fc.assert(
      fc.asyncProperty(fc.nat(), async () => {
        await userService.lockUser(user.id)
        await expect(authService.login({ identifier: user.email!, password: TEST_PASSWORD })).rejects.toMatchObject({
          statusCode: 403
        })

        await userService.unlockUser(user.id)
        await expect(authService.login({ identifier: user.email!, password: TEST_PASSWORD })).resolves.toMatchObject({
          user: { id: user.id, role: RoleName.CUSTOMER }
        })
      }),
      { numRuns: 100 }
    )
  }, 60000)
})
