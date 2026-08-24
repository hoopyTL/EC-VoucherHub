import { ApiResponse } from '~/utils/api-response'
import { asyncHandler } from '~/utils/async-handler'
import { partnerService } from './partner.service'
import type {
  ApprovalDto,
  BranchDto,
  OperatingStatusDto,
  PartnerListDto,
  RegisterPartnerDto,
  UpdateBranchDto,
  UpdatePartnerDto
} from './partner.validation'

export const partnerController = {
  register: asyncHandler(async (req, res) => {
    const result = await partnerService.register(req.validated?.body as RegisterPartnerDto)
    ApiResponse.created(res, result)
  }),

  getMine: asyncHandler(async (req, res) => {
    ApiResponse.success(res, await partnerService.getMine(req.user!.sub))
  }),

  updateMine: asyncHandler(async (req, res) => {
    const result = await partnerService.updateMine(req.user!.sub, req.validated?.body as UpdatePartnerDto)
    ApiResponse.success(res, result)
  }),

  listBranches: asyncHandler(async (req, res) => {
    ApiResponse.success(res, await partnerService.listBranches(req.user!.sub))
  }),

  createBranch: asyncHandler(async (req, res) => {
    const result = await partnerService.createBranch(req.user!.sub, req.validated?.body as BranchDto)
    ApiResponse.created(res, result)
  }),

  updateBranch: asyncHandler(async (req, res) => {
    const params = req.validated?.params as { id: number }
    const result = await partnerService.updateBranch(req.user!.sub, params.id, req.validated?.body as UpdateBranchDto)
    ApiResponse.success(res, result)
  }),

  deleteBranch: asyncHandler(async (req, res) => {
    const params = req.validated?.params as { id: number }
    await partnerService.deleteBranch(req.user!.sub, params.id)
    ApiResponse.noContent(res)
  }),

  list: asyncHandler(async (req, res) => {
    ApiResponse.success(res, await partnerService.list(req.validated?.query as PartnerListDto))
  }),

  listPending: asyncHandler(async (req, res) => {
    ApiResponse.success(res, await partnerService.list(req.validated?.query as PartnerListDto, true))
  }),

  review: asyncHandler(async (req, res) => {
    const params = req.validated?.params as { id: string }
    ApiResponse.success(res, await partnerService.review(params.id, req.validated?.body as ApprovalDto))
  }),

  changeOperatingStatus: asyncHandler(async (req, res) => {
    const params = req.validated?.params as { id: string }
    const result = await partnerService.changeOperatingStatus(params.id, req.validated?.body as OperatingStatusDto)
    ApiResponse.success(res, result)
  }),

  updateBranchAsAdmin: asyncHandler(async (req, res) => {
    const params = req.validated?.params as { partnerId: string; id: number }
    const result = await partnerService.updateBranchAsAdmin(
      params.partnerId,
      params.id,
      req.validated?.body as UpdateBranchDto
    )
    ApiResponse.success(res, result)
  })
}
