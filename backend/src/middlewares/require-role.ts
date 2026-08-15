import type { NextFunction, Request, Response } from 'express'

import { AppError } from '~/utils/app-error'

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(AppError.unauthorized('Authentication required'))
    if (!roles.includes(req.user.role))
      return next(AppError.forbidden('You do not have permission to perform this action'))
    next()
  }
}
