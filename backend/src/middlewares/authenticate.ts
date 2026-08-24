import { Request, Response, NextFunction } from 'express'
import prisma from '~/configs/prisma'
import { AppError } from '~/utils/app-error'
import { verifyAccessToken } from '~/utils/jwt'
import { normalizeRoleName } from '~/utils/role'
import { ApprovalStatus, OperatingStatus, RoleName } from '@voucher/shared'

const assertPartnerCanAccess = (
  partner: {
    approvalStatus: string
    operatingStatus: string
  } | null
) => {
  if (!partner || partner.approvalStatus === ApprovalStatus.PENDING) {
    throw AppError.forbidden('Hồ sơ đối tác đang chờ duyệt')
  }
  if (partner.approvalStatus === ApprovalStatus.REJECTED) {
    throw AppError.forbidden('Hồ sơ đối tác đã bị từ chối')
  }
  if (partner.operatingStatus === OperatingStatus.SUSPENDED) {
    throw AppError.forbidden('Hồ sơ đối tác đang bị tạm khóa')
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  // Short-circuit when a previous middleware (e.g. devAuth) already set req.user
  if ((req as any).user) return next()
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
    include: {
      role: true,
      partner: { select: { id: true, approvalStatus: true, operatingStatus: true } },
      staffProfile: {
        select: {
          status: true,
          partner: { select: { id: true, approvalStatus: true, operatingStatus: true } }
        }
      }
    }
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

  const role = normalizeRoleName(user.role.name)
  if (role === RoleName.PARTNER) {
    assertPartnerCanAccess(user.partner)
  }
  if (role === RoleName.STAFF) {
    if (!user.staffProfile || user.staffProfile.status !== 'ACTIVE') {
      return next(AppError.forbidden('Tài khoản nhân viên đã ngừng hoạt động'))
    }
    assertPartnerCanAccess(user.staffProfile.partner)
  }

  req.user = {
    sub: user.id,
    role,
    ver: user.tokenVersion,
    ...(user.partner && { partnerId: user.partner.id }),
    ...(user.staffProfile && { partnerId: user.staffProfile.partner.id })
  }
  next()
}
