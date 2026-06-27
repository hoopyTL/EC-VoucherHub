import { Router } from 'express'
import { validate } from '~/middlewares/validate'

import { partnerController } from './partner.controller'
import {
  branchBodySchema,
  branchIdParamsSchema,
  partnerApprovalSchema,
  partnerIdParamsSchema,
  partnerLockSchema,
  registerPartnerSchema,
  updatePartnerSchema
} from './partner.validation'

const router = Router()

router.post('/partners', validate({ body: registerPartnerSchema }), partnerController.registerPartner)

router.get('/partner', partnerController.getMyPartner)

router.patch('/partner', validate({ body: updatePartnerSchema }), partnerController.updateMyPartner)

router.post('/partner/branches', validate({ body: branchBodySchema }), partnerController.createBranch)

router.patch(
  '/partner/branches/:id',
  validate({
    params: branchIdParamsSchema,
    body: branchBodySchema
  }),
  partnerController.updateBranch
)

router.delete(
  '/partner/branches/:id',
  validate({
    params: branchIdParamsSchema
  }),
  partnerController.deleteBranch
)

router.patch(
  '/admin/partners/:id/approval',
  validate({
    params: partnerIdParamsSchema,
    body: partnerApprovalSchema
  }),
  partnerController.reviewPartner
)

router.patch(
  '/admin/partners/:id/lock',
  validate({
    params: partnerIdParamsSchema,
    body: partnerLockSchema
  }),
  partnerController.setPartnerOperatingStatus
)

export default router
