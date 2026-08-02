import type { NextFunction, Request, Response } from 'express'

export function devAuth(req: Request, _res: Response, next: NextFunction) {
  const userId = req.header('x-user-id')
  const role = req.header('x-role')

  if (userId) {
    req.user = {
      id: userId,
      role: role ?? 'CUSTOMER'
    }
  }

  next()
}
