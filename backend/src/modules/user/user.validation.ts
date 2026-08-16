import { RoleName } from '@voucher/shared'
import { UserStatus } from '@prisma/client'
import { z } from 'zod'

export const searchUsersSchema = z.object({
  q: z.string().trim().min(1).max(255).optional(),
  role: z.enum([RoleName.ADMIN, RoleName.PARTNER, RoleName.CUSTOMER]).optional(),
  status: z.enum([UserStatus.ACTIVE, UserStatus.LOCKED]).optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20)
})

export const userIdSchema = z.object({
  id: z.string().uuid('ID người dùng không hợp lệ')
})

export const changeRoleSchema = z.object({
  role: z.enum([RoleName.ADMIN, RoleName.PARTNER, RoleName.CUSTOMER])
})

export type SearchUsersDto = z.infer<typeof searchUsersSchema>
export type UserIdDto = z.infer<typeof userIdSchema>
export type ChangeRoleDto = z.infer<typeof changeRoleSchema>
