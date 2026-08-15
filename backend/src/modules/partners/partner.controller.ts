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

export const listBranches = asyncHandler(async (req: Request, res: Response) => {
  ApiResponse.success(res, await partnerService.listBranches(req.user!.id))
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

export const updatePartnerBranchAsAdmin = asyncHandler(async (req: Request, res: Response) => {
  const branch = await partnerService.updateBranchAsAdmin(
    String(req.params.partnerId),
    Number.parseInt(String(req.params.id), 10),
    req.body
  )
  ApiResponse.success(res, branch)
})

function toAdminPartnerView(partner: Awaited<ReturnType<typeof partnerService.listPartners>>['partners'][number]) {
  return {
    id: partner.id,
    email: partner.owner.email ?? '',
    phone: partner.owner.phone,
    businessName: partner.legalName,
    businessRegNumber: partner.taxCode,
    taxId: partner.taxCode,
    representativeName: partner.representative,
    representativeContact: partner.owner.phone ?? partner.owner.email ?? '',
    status: partner.approvalStatus === 'PENDING' ? 'PENDING_APPROVAL' : partner.approvalStatus,
    approvalStatus: partner.approvalStatus,
    operatingStatus: partner.operatingStatus,
    rejectionReason: partner.rejectReason,
    createdAt: partner.createdAt,
    updatedAt: partner.updatedAt,
    branches: partner.branches
  }
}

export const listPartnersForAdmin = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))
  const result = await partnerService.listPartners(page, limit)
  ApiResponse.success(res, {
    partners: result.partners.map(toAdminPartnerView),
    pagination: { page, limit, total: result.total }
  })
})

export const listPendingPartners = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))
  const result = await partnerService.listPendingPartners(page, limit)
  const partners = result.partners.map(toAdminPartnerView)
  ApiResponse.success(res, { partners, pagination: { page, limit, total: result.total } })
})
