import { ApiResponse } from '~/utils/api-response'
import { AppError } from '~/utils/app-error'
import { asyncHandler } from '~/utils/async-handler'
import { enforcePartnerStorageQuota, hasValidImageSignature, removeUploadedFile } from './voucher-upload'
import { voucherService } from './voucher.service'
import type {
  AdminVoucherStatusInput,
  CreateVoucherInput,
  PartnerVoucherStatusInput,
  PublicVoucherSearchInput,
  UpdateVoucherInput,
  VoucherApprovalInput,
  VoucherListInput
} from './voucher.validation'

export const voucherController = {
  searchPublic: asyncHandler(async (req, res) => {
    ApiResponse.success(res, await voucherService.searchPublic(req.validated?.query as PublicVoucherSearchInput))
  }),
  getPublicFilters: asyncHandler(async (_req, res) => {
    ApiResponse.success(res, await voucherService.getPublicFilters())
  }),
  getPublic: asyncHandler(async (req, res) => {
    const { id } = req.validated?.params as { id: string }
    ApiResponse.success(res, await voucherService.getPublic(id))
  }),
  uploadImage: asyncHandler(async (req, res) => {
    if (!req.file) throw AppError.validation('Ảnh voucher là bắt buộc')
    if (!hasValidImageSignature(req.file)) {
      removeUploadedFile(req.file)
      throw AppError.validation('Nội dung file không khớp định dạng ảnh')
    }
    enforcePartnerStorageQuota(req.file, req.user!.partnerId!)
    ApiResponse.created(res, { url: `/uploads/vouchers/${req.file.filename}` })
  }),
  create: asyncHandler(async (req, res) => {
    ApiResponse.created(res, await voucherService.create(req.user!.sub, req.validated?.body as CreateVoucherInput))
  }),
  listMine: asyncHandler(async (req, res) => {
    ApiResponse.success(res, await voucherService.listMine(req.user!.sub, req.validated?.query as VoucherListInput))
  }),
  getMine: asyncHandler(async (req, res) => {
    const { id } = req.validated?.params as { id: string }
    ApiResponse.success(res, await voucherService.getMine(req.user!.sub, id))
  }),
  update: asyncHandler(async (req, res) => {
    const { id } = req.validated?.params as { id: string }
    ApiResponse.success(res, await voucherService.update(req.user!.sub, id, req.validated?.body as UpdateVoucherInput))
  }),
  submit: asyncHandler(async (req, res) => {
    const { id } = req.validated?.params as { id: string }
    ApiResponse.success(res, await voucherService.submit(req.user!.sub, id))
  }),
  returnToDraft: asyncHandler(async (req, res) => {
    const { id } = req.validated?.params as { id: string }
    ApiResponse.success(res, await voucherService.returnToDraft(req.user!.sub, id))
  }),
  changeMineStatus: asyncHandler(async (req, res) => {
    const { id } = req.validated?.params as { id: string }
    ApiResponse.success(
      res,
      await voucherService.changeMineStatus(req.user!.sub, id, req.validated?.body as PartnerVoucherStatusInput)
    )
  }),
  listAdmin: asyncHandler(async (req, res) => {
    ApiResponse.success(res, await voucherService.listAdmin(req.validated?.query as VoucherListInput))
  }),
  review: asyncHandler(async (req, res) => {
    const { id } = req.validated?.params as { id: string }
    ApiResponse.success(res, await voucherService.review(id, req.validated?.body as VoucherApprovalInput))
  }),
  changeAdminStatus: asyncHandler(async (req, res) => {
    const { id } = req.validated?.params as { id: string }
    ApiResponse.success(res, await voucherService.changeAdminStatus(id, req.validated?.body as AdminVoucherStatusInput))
  })
}
