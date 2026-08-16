import { UserStatus, type Prisma } from '@prisma/client'
import prisma from '~/configs/prisma'
import { AppError } from '~/utils/app-error'
import { getCompatibleRoleNames, normalizeRoleName } from '~/utils/role'
import type { ChangeRoleDto, SearchUsersDto } from './user.validation'

const userSelect = {
  id: true,
  email: true,
  phone: true,
  fullName: true,
  status: true,
  role: { select: { name: true } }
} as const

async function updateUserStatus(id: string, status: UserStatus) {
  const user = await prisma.user.update({
    where: { id },
    data: { status },
    select: userSelect
  })
  return normalizeUserRole(user)
}

const normalizeUserRole = <T extends { role: { name: string } }>(user: T) => ({
  ...user,
  role: { name: normalizeRoleName(user.role.name) }
})

export const userService = {
  async searchUsers(dto: SearchUsersDto) {
    const where: Prisma.UserWhereInput = {
      ...(dto.q && {
        OR: [
          { email: { contains: dto.q, mode: 'insensitive' } },
          { phone: { contains: dto.q } },
          { fullName: { contains: dto.q, mode: 'insensitive' } }
        ]
      }),
      ...(dto.role && { role: { name: { in: getCompatibleRoleNames(dto.role) } } }),
      ...(dto.status && { status: dto.status })
    }

    const users = await prisma.user.findMany({
      where,
      take: dto.limit + 1,
      ...(dto.cursor && { cursor: { id: dto.cursor }, skip: 1 }),
      orderBy: { id: 'asc' },
      select: userSelect
    })
    const hasNextPage = users.length > dto.limit
    const items = (hasNextPage ? users.slice(0, dto.limit) : users).map(normalizeUserRole)

    return {
      items,
      nextCursor: hasNextPage ? (items.at(-1)?.id ?? null) : null
    }
  },

  lockUser(id: string) {
    return updateUserStatus(id, UserStatus.LOCKED)
  },

  unlockUser(id: string) {
    return updateUserStatus(id, UserStatus.ACTIVE)
  },

  async changeRole(id: string, dto: ChangeRoleDto) {
    const role = await prisma.role.findFirst({
      where: { name: { in: getCompatibleRoleNames(dto.role) } }
    })
    if (!role) {
      throw AppError.notFound('Vai trò')
    }
    const user = await prisma.user.update({
      where: { id },
      data: { roleId: role.id },
      select: userSelect
    })
    return normalizeUserRole(user)
  }
}
