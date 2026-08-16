import { RoleName } from '@voucher/shared'
import { Router } from 'express'

import { authenticate } from '~/middlewares/authenticate'
import { authorize } from '~/middlewares/authorize'
import { rateLimit } from '~/middlewares/rate-limit'
import { validate } from '~/middlewares/validate'
import { partnerController } from './partner.controller'
import {
  adminBranchIdSchema,
  approvalSchema,
  branchIdSchema,
  branchSchema,
  operatingStatusSchema,
  partnerIdSchema,
  partnerListSchema,
  registerPartnerSchema,
  updateBranchSchema,
  updatePartnerSchema
} from './partner.validation'

export const partnerRoutes = Router()
const registrationLimiter = rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 10 })

partnerRoutes.post(
  '/partners',
  registrationLimiter,
  validate({ body: registerPartnerSchema }),
  partnerController.register
)

partnerRoutes.use('/partner', authenticate, authorize(RoleName.PARTNER))
partnerRoutes.get('/partner', partnerController.getMine)
partnerRoutes.patch('/partner', validate({ body: updatePartnerSchema }), partnerController.updateMine)
partnerRoutes.get('/partner/branches', partnerController.listBranches)
partnerRoutes.post('/partner/branches', validate({ body: branchSchema }), partnerController.createBranch)
partnerRoutes.patch(
  '/partner/branches/:id',
  validate({ params: branchIdSchema, body: updateBranchSchema }),
  partnerController.updateBranch
)
partnerRoutes.delete('/partner/branches/:id', validate({ params: branchIdSchema }), partnerController.deleteBranch)

partnerRoutes.use('/admin/partners', authenticate, authorize(RoleName.ADMIN))
partnerRoutes.get('/admin/partners', validate({ query: partnerListSchema }), partnerController.list)
partnerRoutes.get('/admin/partners/pending', validate({ query: partnerListSchema }), partnerController.listPending)
partnerRoutes.patch(
  '/admin/partners/:id/approval',
  validate({ params: partnerIdSchema, body: approvalSchema }),
  partnerController.review
)
partnerRoutes.patch(
  '/admin/partners/:id/lock',
  validate({ params: partnerIdSchema, body: operatingStatusSchema }),
  partnerController.changeOperatingStatus
)
partnerRoutes.patch(
  '/admin/partners/:partnerId/branches/:id',
  validate({ params: adminBranchIdSchema, body: updateBranchSchema }),
  partnerController.updateBranchAsAdmin
)
