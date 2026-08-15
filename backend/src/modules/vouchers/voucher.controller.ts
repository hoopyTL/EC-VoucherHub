import type { Request, Response } from 'express'

import { asyncHandler } from '~/utils/async-handler'
import { ApiResponse } from '~/utils/api-response'
import { AppError } from '~/utils/app-error'

import {
  changeVoucherStatus,
  createVoucher,
  getPartnerBranches,
  getPartnerVoucher,
  getPartnerVouchers,
  getAdminVouchers,
  returnRejectedVoucherToDraft,
  reviewVoucher,
  submitVoucher,
  updateVoucher
} from './voucher.service'

export const uploadVoucherImageHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw AppError.validation('Voucher image is required')
  }
  ApiResponse.created(res, { url: `/uploads/vouchers/${req.file.filename}` })
})

export const getAdminVouchersHandler = asyncHandler(async (_req: Request, res: Response) => {
  ApiResponse.success(res, await getAdminVouchers())
})

export const createVoucherHandler = asyncHandler(async (req: Request, res: Response) => {
  const voucher = await createVoucher(req.user!.id, req.body)

  ApiResponse.created(res, voucher)
})

export const getPartnerVouchersHandler = asyncHandler(async (req: Request, res: Response) => {
  const vouchers = await getPartnerVouchers(req.user!.id)

  ApiResponse.success(res, vouchers)
})

export const getPartnerVoucherHandler = asyncHandler(async (req: Request, res: Response) => {
  const voucher = await getPartnerVoucher(req.user!.id, String(req.params.id))

  ApiResponse.success(res, voucher)
})

export const getPartnerBranchesHandler = asyncHandler(async (req: Request, res: Response) => {
  const branches = await getPartnerBranches(req.user!.id)

  ApiResponse.success(res, branches)
})

export const updateVoucherHandler = asyncHandler(async (req: Request, res: Response) => {
  const voucher = await updateVoucher(req.user!.id, String(req.params.id), req.body)

  ApiResponse.success(res, voucher)
})

export const submitVoucherHandler = asyncHandler(async (req: Request, res: Response) => {
  const voucher = await submitVoucher(req.user!.id, String(req.params.id))

  ApiResponse.success(res, voucher)
})

export const returnVoucherToDraftHandler = asyncHandler(async (req: Request, res: Response) => {
  const voucher = await returnRejectedVoucherToDraft(req.user!.id, String(req.params.id))

  ApiResponse.success(res, voucher)
})

export const reviewVoucherHandler = asyncHandler(async (req: Request, res: Response) => {
  const voucher = await reviewVoucher(String(req.params.id), req.body.action, req.body.reason)

  ApiResponse.success(res, voucher)
})

export const changeVoucherStatusHandler = asyncHandler(async (req: Request, res: Response) => {
  const voucher = await changeVoucherStatus(String(req.params.id), req.body.action)

  ApiResponse.success(res, voucher)
})
