import { RoleName } from '@voucher/shared'
import type { NextFunction, Request, Response } from 'express'
import fc from 'fast-check'
import jwt from 'jsonwebtoken'
import { describe, expect, it, vi } from 'vitest'
import { authorize } from '~/middlewares/authorize'
import { rateLimit } from '~/middlewares/rate-limit'
import { env } from '~/configs/env'
import { signAccessToken, verifyAccessToken } from '~/utils/jwt'
import { hashPassword, verifyPassword } from '~/utils/password'
import { normalizeRoleName } from '~/utils/role'

describe('password security', () => {
  it('hashes and verifies every valid password sample', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 8, maxLength: 24 }), async (password) => {
        const hash = await hashPassword(password)
        expect(hash).not.toBe(password)
        expect(hash).toMatch(/^\$2[aby]\$10\$/)
        expect(await verifyPassword(password, hash)).toBe(true)
      }),
      { numRuns: 100 }
    )
  }, 30000)
})

describe('JWT security', () => {
  it('accepts only tokens with the configured algorithm, issuer, and audience', () => {
    const valid = signAccessToken({ sub: crypto.randomUUID(), role: RoleName.CUSTOMER })
    const wrongIssuer = jwt.sign({ sub: crypto.randomUUID(), role: RoleName.CUSTOMER }, env.JWT_SECRET, {
      algorithm: 'HS256',
      issuer: 'attacker',
      audience: 'voucherhub-client'
    })
    const wrongAudience = jwt.sign({ sub: crypto.randomUUID(), role: RoleName.CUSTOMER }, env.JWT_SECRET, {
      algorithm: 'HS256',
      issuer: 'voucherhub-api',
      audience: 'attacker-client'
    })
    const wrongAlgorithm = jwt.sign({ sub: crypto.randomUUID(), role: RoleName.CUSTOMER }, env.JWT_SECRET, {
      algorithm: 'HS384',
      issuer: 'voucherhub-api',
      audience: 'voucherhub-client'
    })
    const expired = jwt.sign({ sub: crypto.randomUUID(), role: RoleName.CUSTOMER }, env.JWT_SECRET, {
      algorithm: 'HS256',
      issuer: 'voucherhub-api',
      audience: 'voucherhub-client',
      expiresIn: -1
    })
    const missingSubject = jwt.sign({ role: RoleName.CUSTOMER }, env.JWT_SECRET, {
      algorithm: 'HS256',
      issuer: 'voucherhub-api',
      audience: 'voucherhub-client'
    })

    expect(verifyAccessToken(valid).role).toBe(RoleName.CUSTOMER)
    expect(() => verifyAccessToken(wrongIssuer)).toThrow()
    expect(() => verifyAccessToken(wrongAudience)).toThrow()
    expect(() => verifyAccessToken(wrongAlgorithm)).toThrow()
    expect(() => verifyAccessToken(expired)).toThrow()
    expect(() => verifyAccessToken(missingSubject)).toThrow()
  })
})

describe('RBAC property', () => {
  it('fails closed for unknown database role values', () => {
    expect(() => normalizeRoleName('UNKNOWN_ROLE')).toThrowError(/Vai trò người dùng không hợp lệ/)
  })

  it('requires authentication before checking roles', () => {
    const nextMock = vi.fn()

    authorize(RoleName.ADMIN)({} as Request, {} as Response, nextMock as NextFunction)

    expect(nextMock.mock.calls[0][0]).toMatchObject({ statusCode: 401, code: 'UNAUTHORIZED' })
  })

  it('always rejects every non-admin role from an admin guard', () => {
    fc.assert(
      fc.property(fc.constantFrom(RoleName.CUSTOMER, RoleName.PARTNER, RoleName.STAFF), (role) => {
        const req = { user: { sub: crypto.randomUUID(), role } } as Request
        const nextMock = vi.fn()

        authorize(RoleName.ADMIN)(req, {} as Response, nextMock as NextFunction)

        expect(nextMock).toHaveBeenCalledOnce()
        expect(nextMock.mock.calls[0][0]).toMatchObject({ statusCode: 403, code: 'FORBIDDEN' })
      }),
      { numRuns: 100 }
    )
  })
})

describe('rate limiting', () => {
  it('returns standard headers and a 429 error after the configured limit', () => {
    const middleware = rateLimit({ windowMs: 60000, maxRequests: 2 })
    const req = { ip: '127.0.0.1', socket: {} } as Request
    const setHeader = vi.fn()
    const res = { setHeader } as unknown as Response
    const nextMock = vi.fn()

    middleware(req, res, nextMock as NextFunction)
    middleware(req, res, nextMock as NextFunction)
    middleware(req, res, nextMock as NextFunction)

    expect(setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 2)
    expect(setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 0)
    expect(setHeader).toHaveBeenCalledWith('Retry-After', expect.any(Number))
    expect(nextMock.mock.calls[2][0]).toMatchObject({ statusCode: 429, code: 'RATE_LIMIT_EXCEEDED' })
  })
})
