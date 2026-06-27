import { ApiResponse } from '~/utils/api-response'
import { asyncHandler } from '~/utils/async-handler'
import { getCurrentUser } from '~/modules/shared/current-user'

import { partnerService } from './partner.service'
import type {
  BranchInput,
  PartnerApprovalInput,
  PartnerLockInput,
  RegisterPartnerInput,
  UpdatePartnerInput
} from './partner.validation'

export const partnerController = {
  registerPartner: asyncHandler(async (req, res) => {
    const currentUser = getCurrentUser(req)
    const body = req.validated?.body as RegisterPartnerInput

    const partner = await partnerService.registerPartner(currentUser.id, body)
    ApiResponse.created(res, partner)
  }),

  getMyPartner: asyncHandler(async (req, res) => {
    const currentUser = getCurrentUser(req)

    const partner = await partnerService.getMyPartner(currentUser.id)
    ApiResponse.success(res, partner)
  }),

  updateMyPartner: asyncHandler(async (req, res) => {
    const currentUser = getCurrentUser(req)
    const body = req.validated?.body as UpdatePartnerInput

    const partner = await partnerService.updateMyPartner(currentUser.id, body)
    ApiResponse.success(res, partner)
  }),

  createBranch: asyncHandler(async (req, res) => {
    const currentUser = getCurrentUser(req)
    const body = req.validated?.body as BranchInput

    const branch = await partnerService.createBranch(currentUser.id, body)
    ApiResponse.created(res, branch)
  }),

  updateBranch: asyncHandler(async (req, res) => {
    const currentUser = getCurrentUser(req)
    const params = req.validated?.params as { id: number }
    const body = req.validated?.body as BranchInput

    const branch = await partnerService.updateBranch(currentUser.id, params.id, body)
    ApiResponse.success(res, branch)
  }),

  deleteBranch: asyncHandler(async (req, res) => {
    const currentUser = getCurrentUser(req)
    const params = req.validated?.params as { id: number }

    await partnerService.deleteBranch(currentUser.id, params.id)
    ApiResponse.noContent(res)
  }),

  reviewPartner: asyncHandler(async (req, res) => {
    const params = req.validated?.params as { id: string }
    const body = req.validated?.body as PartnerApprovalInput

    const partner = await partnerService.reviewPartner(params.id, body)
    ApiResponse.success(res, partner)
  }),

  setPartnerOperatingStatus: asyncHandler(async (req, res) => {
    const params = req.validated?.params as { id: string }
    const body = req.validated?.body as PartnerLockInput

    const partner = await partnerService.setPartnerOperatingStatus(params.id, body)
    ApiResponse.success(res, partner)
  })
}
