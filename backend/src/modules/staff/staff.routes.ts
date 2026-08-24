import { RoleName } from '@voucher/shared'
import { Router } from 'express'
import { authenticate } from '~/middlewares/authenticate'
import { authorize } from '~/middlewares/authorize'
import { validate } from '~/middlewares/validate'
import { staffController } from './staff.controller'
import { createStaffSchema, staffIdSchema, updateStaffSchema } from './staff.validation'
export const staffRoutes = Router()
staffRoutes.use('/partner/staff', authenticate, authorize(RoleName.PARTNER))
staffRoutes.get('/partner/staff', staffController.list)
staffRoutes.post('/partner/staff', validate({ body: createStaffSchema }), staffController.create)
staffRoutes.patch(
  '/partner/staff/:id',
  validate({ params: staffIdSchema, body: updateStaffSchema }),
  staffController.update
)
