import { RoleName } from '@voucher/shared'
import { Router } from 'express'
import { authenticate } from '~/middlewares/authenticate'
import { authorize } from '~/middlewares/authorize'
import { validate } from '~/middlewares/validate'
import { userController } from './user.controller'
import { changeRoleSchema, searchUsersSchema, userIdSchema } from './user.validation'

export const userRoutes = Router()

userRoutes.use('/admin/users', authenticate, authorize(RoleName.ADMIN))
userRoutes.get('/admin/users', validate({ query: searchUsersSchema }), userController.search)
userRoutes.patch('/admin/users/:id/lock', validate({ params: userIdSchema }), userController.lock)
userRoutes.patch('/admin/users/:id/unlock', validate({ params: userIdSchema }), userController.unlock)
userRoutes.patch(
  '/admin/users/:id/role',
  validate({ params: userIdSchema, body: changeRoleSchema }),
  userController.changeRole
)
