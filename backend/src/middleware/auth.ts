/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  PLACEHOLDER — sẽ được TV1 thay thế bằng JWT middleware thật   ║
 * ║  tại TASK-004 (Auth & RBAC).                                   ║
 * ║                                                                ║
 * ║  Hiện tại: đọc user info từ custom headers để test standalone. ║
 * ║    X-User-Id: uuid                                             ║
 * ║    X-User-Role: KHACH_HANG | DOI_TAC | QUAN_TRI_VIEN           ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */
import { Request, Response, NextFunction } from 'express'
import { UnauthorizedError, ForbiddenError } from './error-handler'

// Mở rộng Request để có req.user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        role: string
        partnerId?: string
      }
    }
  }
}

/**
 * Placeholder auth: đọc X-User-Id và X-User-Role từ header.
 * Khi TV1 hoàn thành TASK-004, thay toàn bộ file này bằng JWT verify.
 */
export const requireAuth = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const userId = req.headers['x-user-id'] as string | undefined
  const userRole = req.headers['x-user-role'] as string | undefined

  if (!userId || !userRole) {
    throw new UnauthorizedError('thiếu thông tin xác thực (placeholder: cần header X-User-Id và X-User-Role)')
  }

  req.user = {
    id: userId,
    role: userRole,
    partnerId: req.headers['x-partner-id'] as string | undefined,
  }

  next()
}

/**
 * Kiểm tra vai trò. Gọi sau requireAuth.
 */
export const requireRole = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('chưa xác thực')
    }

    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError('không đủ quyền')
    }

    next()
  }
}
