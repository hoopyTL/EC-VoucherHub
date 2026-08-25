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
    const limit = dto.limit
    const q = dto.q?.trim()

    // Prefer a diacritics-insensitive search using Postgres `unaccent` if
    // available. Fall back to ORM `contains` (case-insensitive) if the raw
    // query fails (e.g. extension not present in the environment).
    if (q) {
      const like = `%${q}%`
      try {
        // role/status/cursor clauses use controlled enum values -> safe to
        // interpolate as literals. The search terms are parameterized.
        const roleClause = dto.role
          ? `AND r.name IN (${getCompatibleRoleNames(dto.role)
              .map((r) => `'${r}'`)
              .join(',')})`
          : ''
        const statusClause = dto.status ? `AND u.status = '${dto.status}'` : ''
        const cursorClause = dto.cursor ? `AND u.id > '${dto.cursor}'` : ''

        const rows: Array<{
          id: string
          email: string | null
          phone: string | null
          full_name: string
          status: string
          role_name: string
        }> = await prisma.$queryRawUnsafe(
          `
          SELECT u.id, u.email, u.phone, u.full_name, u.status, r.name AS role_name
          FROM users u
          JOIN roles r ON r.id = u.role_id
          WHERE (
            unaccent(lower(u.full_name)) LIKE unaccent(lower($1)) OR
            unaccent(lower(u.email)) LIKE unaccent(lower($1)) OR
            u.phone LIKE $2
          )
          ${roleClause}
          ${statusClause}
          ${cursorClause}
          ORDER BY u.id ASC
          LIMIT ${limit + 1}
        `,
          like,
          like
        )

        const hasNextPage = rows.length > limit
        const items = (hasNextPage ? rows.slice(0, limit) : rows).map((r) =>
          normalizeUserRole({
            id: r.id,
            email: r.email,
            phone: r.phone,
            fullName: r.full_name,
            status: r.status,
            role: { name: r.role_name }
          })
        )

        return {
          items,
          nextCursor: hasNextPage ? (items.at(-1)?.id ?? null) : null
        }
      } catch (err) {
        // If unaccent or raw query is not available, silently fall back to
        // Prisma's findMany with case-insensitive contains. This restores
        // functionality in environments without the extension.
      }
    }

    // Fallback behavior (or empty query): use Prisma's safe API. This is
    // case-insensitive for `email` and `fullName`. `phone` uses simple
    // contains matching.
    const where: Prisma.UserWhereInput = {
      ...(q && {
        OR: [
          { email: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } },
          { fullName: { contains: q, mode: 'insensitive' } }
        ]
      }),
      ...(dto.role && { role: { name: { in: getCompatibleRoleNames(dto.role) } } }),
      ...(dto.status && { status: dto.status })
    }

    const users = await prisma.user.findMany({
      where,
      take: limit + 1,
      ...(dto.cursor && { cursor: { id: dto.cursor }, skip: 1 }),
      orderBy: { id: 'asc' },
      select: userSelect
    })
    const hasNextPage = users.length > limit
    const items = (hasNextPage ? users.slice(0, limit) : users).map(normalizeUserRole)

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
