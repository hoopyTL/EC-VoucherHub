import type { NextFunction, Request, Response } from 'express'
import { RoleName } from '@voucher/shared'

export function devAuth(req: Request, _res: Response, next: NextFunction) {
  const userId = req.header('x-user-id')
  const role = req.header('x-role')

  if (userId) {
    req.user = { id: userId, role: role ? (role as RoleName) : RoleName.CUSTOMER } as any
  } else {
    // Provide a default admin user so the TV4 console can read admin APIs in local dev
    req.user = { id: 'dev-admin', role: RoleName.ADMIN } as any
  }

  next()
}
