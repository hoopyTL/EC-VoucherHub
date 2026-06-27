import type { Request } from 'express'
import { AppError } from '~/utils/app-error'

export interface CurrentUser {
  id: string
  role?: string
  partnerId?: string
  branchId?: number
}

/**
 * Adapter tạm trong lúc chờ Auth/RBAC.
 *
 * Hiện tại hỗ trợ:
 * - req.user nếu Auth của TV1 đã gắn
 * - header x-user-id để test local
 *
 * Sau khi Auth/RBAC hoàn thiện, chỉ cần chuẩn hóa lại hàm này.
 */
export function getCurrentUser(req: Request): CurrentUser {
  const requestWithUser = req as Request & {
    user?: {
      id?: string
      sub?: string
      role?: string
      partnerId?: string
      branchId?: number
    }
  }

  const id =
    requestWithUser.user?.id || requestWithUser.user?.sub || req.header('x-user-id') || req.header('x-actor-user-id')

  if (!id) {
    throw AppError.unauthorized('Authentication required')
  }

  const branchIdHeader = req.header('x-branch-id')
  const parsedBranchId = branchIdHeader ? Number(branchIdHeader) : undefined

  return {
    id,
    role: requestWithUser.user?.role || req.header('x-user-role') || undefined,
    partnerId: requestWithUser.user?.partnerId || req.header('x-partner-id') || undefined,
    branchId: requestWithUser.user?.branchId ?? (Number.isFinite(parsedBranchId) ? parsedBranchId : undefined)
  }
}
