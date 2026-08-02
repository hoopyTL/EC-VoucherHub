import type { Request, Response } from 'express'

import { ApiResponse } from '~/utils/api-response'
import { asyncHandler } from '~/utils/async-handler'

import { partnerService } from './partner.service'

export const registerPartner = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id

  const partner = await partnerService.registerPartner(userId, req.body)

  ApiResponse.created(res, partner)
})

export const getMyPartner = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id

  const partner = await partnerService.getPartnerByOwner(userId)

  ApiResponse.success(res, partner)
})

export const updateMyPartner = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id

  const partner = await partnerService.updatePartner(userId, req.body)

  ApiResponse.success(res, partner)
})

export const createBranch = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id

  const branch = await partnerService.addBranch(userId, req.body)

  ApiResponse.created(res, branch)
})

export const updateBranch = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id
  const branchId = Number.parseInt(String(req.params.id), 10)

  const branch = await partnerService.updateBranch(userId, branchId, req.body)

  ApiResponse.success(res, branch)
})

export const deleteBranch = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id
  const branchId = Number.parseInt(String(req.params.id), 10)

  await partnerService.deleteBranch(userId, branchId)

  res.status(204).send()
})

export const reviewPartner = asyncHandler(async (req: Request, res: Response) => {
  const partnerId = String(req.params.id)

  const partner = await partnerService.reviewPartner(partnerId, req.body.action, req.body.reason)

  ApiResponse.success(res, partner)
})

export const changePartnerStatus = asyncHandler(async (req: Request, res: Response) => {
  const partnerId = String(req.params.id)

  const partner = await partnerService.changeOperatingStatus(partnerId, req.body.action)

  ApiResponse.success(res, partner)
})
