import { Request, Response, NextFunction } from 'express'
import prisma from '~/configs/prisma'
import { AppError } from '~/utils/app-error'
import { verifyAccessToken } from '~/utils/jwt'
import { normalizeRoleName } from '~/utils/role'

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return next(AppError.unauthorized())
  }

  const token = authHeader.split(' ')[1]
  let payload

  try {
    payload = verifyAccessToken(token)
  } catch {
    return next(AppError.unauthorized('Token không hợp lệ hoặc đã hết hạn'))
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: { role: true, partner: { select: { id: true } } }
  })
  if (!user) {
    return next(AppError.unauthorized('Tài khoản không còn tồn tại'))
  }
  if (user.status === 'LOCKED') {
    return next(AppError.forbidden('Tài khoản đã bị khoá'))
  }
  if (payload.ver !== user.tokenVersion) {
    return next(AppError.unauthorized('Token không còn hiệu lực'))
  }

  req.user = {
    sub: user.id,
    role: normalizeRoleName(user.role.name),
    ver: user.tokenVersion,
    ...(user.partner && { partnerId: user.partner.id })
  }
  next()
}
