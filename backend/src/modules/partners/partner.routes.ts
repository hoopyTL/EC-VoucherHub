import { Router } from 'express'

import { validate } from '~/middlewares/validate'
import { requireRole } from '~/middlewares/require-role'

import {
  approvalPartnerSchema,
  adminPartnerBranchParamSchema,
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
  listBranches,
  listPendingPartners,
  listPartnersForAdmin,
  registerPartner,
  reviewPartner,
  updateBranch,
  updatePartnerBranchAsAdmin,
  updateMyPartner
} from './partner.controller'

const router = Router()

router.post('/partners', requireRole('CUSTOMER', 'PARTNER'), validate({ body: createPartnerSchema }), registerPartner)

router.get('/partner', requireRole('PARTNER'), getMyPartner)

router.patch('/partner', requireRole('PARTNER'), validate({ body: updatePartnerSchema }), updateMyPartner)

router.get('/partner/branches', requireRole('PARTNER'), listBranches)
router.post('/partner/branches', requireRole('PARTNER'), validate({ body: createBranchSchema }), createBranch)

router.patch(
  '/partner/branches/:id',
  requireRole('PARTNER'),
  validate({
    params: branchIdParamSchema,
    body: updateBranchSchema
  }),
  updateBranch
)

router.delete('/partner/branches/:id', requireRole('PARTNER'), validate({ params: branchIdParamSchema }), deleteBranch)

router.get('/admin/partners/pending', requireRole('ADMIN'), listPendingPartners)
router.get('/admin/partners', requireRole('ADMIN'), listPartnersForAdmin)

router.patch(
  '/admin/partners/:partnerId/branches/:id',
  requireRole('ADMIN'),
  validate({ params: adminPartnerBranchParamSchema, body: updateBranchSchema }),
  updatePartnerBranchAsAdmin
)

router.patch(
  '/admin/partners/:id/approval',
  requireRole('ADMIN'),
  validate({
    params: partnerIdParamSchema,
    body: approvalPartnerSchema
  }),
  reviewPartner
)

router.patch(
  '/admin/partners/:id/approve',
  requireRole('ADMIN'),
  validate({ params: partnerIdParamSchema }),
  (req, _res, next) => {
    req.body = { action: 'approve' }
    next()
  },
  reviewPartner
)

router.patch(
  '/admin/partners/:id/reject',
  requireRole('ADMIN'),
  validate({ params: partnerIdParamSchema }),
  (req, _res, next) => {
    req.body = { action: 'reject', reason: req.body.reason }
    next()
  },
  reviewPartner
)

router.patch(
  '/admin/partners/:id/lock',
  requireRole('ADMIN'),
  validate({
    params: partnerIdParamSchema,
    body: lockPartnerSchema
  }),
  changePartnerStatus
)

export default router
