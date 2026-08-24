import { RoleName, type RoleName as RoleNameValue } from '@voucher/shared'
import { AppError } from './app-error'

const legacyRoleNames: Record<RoleNameValue, string> = {
  [RoleName.ADMIN]: 'QUAN_TRI_VIEN',
  [RoleName.PARTNER]: 'DOI_TAC',
  [RoleName.STAFF]: 'NHAN_VIEN',
  [RoleName.CUSTOMER]: 'KHACH_HANG'
}

export function normalizeRoleName(role: string): RoleNameValue {
  const currentRole = Object.values(RoleName).find((value) => value === role)
  if (currentRole) return currentRole

  const legacyRole = Object.entries(legacyRoleNames).find(([, value]) => value === role)
  if (legacyRole) return legacyRole[0] as RoleNameValue

  throw AppError.internal('Vai trò người dùng không hợp lệ')
}

export function getCompatibleRoleNames(role: RoleNameValue): string[] {
  return [role, legacyRoleNames[role]]
}
