import { Request, Response, NextFunction } from 'express'
import { AppError } from '~/utils/app-error'
import { RoleName } from '@voucher/shared'

export const authorize = (...allowedRoles: RoleName[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(AppError.unauthorized('Chưa xác thực danh tính'))
    }

    const hasPermission = allowedRoles.includes(req.user.role)

    if (!hasPermission) {
      return next(AppError.forbidden('Không đủ quyền truy cập'))
    }

    next()
  }
}
