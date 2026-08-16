import jwt, { SignOptions } from 'jsonwebtoken'
import { env } from '~/configs/env'
import { RoleName } from '@voucher/shared'
import { z } from 'zod'

export interface JwtPayload {
  sub: string // User ID
  role: RoleName // RoleName: ADMIN, PARTNER, CUSTOMER
  partnerId?: string // Optional
  ver?: number // Credential version; defaults to zero for pre-migration tokens
}

const jwtPayloadSchema = z.object({
  sub: z.string().uuid(),
  role: z.enum([RoleName.ADMIN, RoleName.PARTNER, RoleName.CUSTOMER]),
  partnerId: z.string().uuid().optional(),
  ver: z.number().int().nonnegative().default(0)
})

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign({ ...payload, ver: payload.ver ?? 0 }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    algorithm: 'HS256',
    issuer: 'voucherhub-api',
    audience: 'voucherhub-client'
  } as SignOptions)
}

export function verifyAccessToken(token: string): JwtPayload {
  const payload = jwt.verify(token, env.JWT_SECRET, {
    algorithms: ['HS256'],
    issuer: 'voucherhub-api',
    audience: 'voucherhub-client'
  })
  return jwtPayloadSchema.parse(payload)
}
