import { Router } from 'express'

import { validate } from '~/middlewares/validate'

import {
  approvalPartnerSchema,
  branchIdParamSchema,
  createBranchSchema,
  createPartnerSchema,
  lockPartnerSchema,
  partnerIdParamSchema,
  updateBranchSchema,
  updatePartnerSchema
} from './partner.schema'

import {
  changePartnerStatus,
  createBranch,
  deleteBranch,
  getMyPartner,
  registerPartner,
  reviewPartner,
  updateBranch,
  updateMyPartner
} from './partner.controller'

const router = Router()

router.post('/partners', validate({ body: createPartnerSchema }), registerPartner)

router.get('/partner', getMyPartner)

router.patch('/partner', validate({ body: updatePartnerSchema }), updateMyPartner)

router.post('/partner/branches', validate({ body: createBranchSchema }), createBranch)

router.patch(
  '/partner/branches/:id',
  validate({
    params: branchIdParamSchema,
    body: updateBranchSchema
  }),
  updateBranch
)

router.delete('/partner/branches/:id', validate({ params: branchIdParamSchema }), deleteBranch)

router.patch(
  '/admin/partners/:id/approval',
  validate({
    params: partnerIdParamSchema,
    body: approvalPartnerSchema
  }),
  reviewPartner
)

router.patch(
  '/admin/partners/:id/lock',
  validate({
    params: partnerIdParamSchema,
    body: lockPartnerSchema
  }),
  changePartnerStatus
)

export default router
