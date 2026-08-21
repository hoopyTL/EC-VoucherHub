import { Request, Router } from 'express'
import { ApprovalStatus, OperatingStatus, UserStatus, VoucherStatus } from '@prisma/client'
import { asyncHandler } from '../middlewares/error.middleware'
import {
  cancelAdminOrder,
  archiveAdminContent,
  createAdminContent,
  getAdminDashboard,
  getAdminDashboardStats,
  getAdminAnalytics,
  getAdminOrder,
  listAdminAuditLogs,
  listAdminContent,
  listAdminIssuedCodes,
  listAdminPartners,
  listAdminOrders,
  listAdminUsageLogs,
  listAdminUsers,
  listAdminVouchers,
  refundAdminOrder,
  setAdminPartnerApproval,
  setAdminPartnerOperatingStatus,
  setAdminUserStatus,
  setAdminVoucherApproval,
  setAdminVoucherStatus,
  updateAdminContent
} from '../services/admin.service'
import { badRequest } from '../errors/http-error'

const router = Router()

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function actorEmail(req: Request) {
  const value = req.headers['x-admin-email']
  return Array.isArray(value) ? value[0] : value
}

router.get(
  '/dashboard/stats',
  asyncHandler(async (_req, res) => {
    res.status(200).json({ success: true, data: await getAdminDashboardStats() })
  })
)

router.get(
  '/analytics',
  asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, data: await getAdminAnalytics(Number(req.query.days)) })
  })
)

router.get(
  '/dashboard',
  asyncHandler(async (_req, res) => {
    const dashboard = await getAdminDashboard()
    res.status(200).json({ success: true, data: dashboard })
  })
)

router.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const orders = await listAdminOrders({
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      q: typeof req.query.q === 'string' ? req.query.q : undefined,
      from: typeof req.query.from === 'string' ? req.query.from : undefined,
      to: typeof req.query.to === 'string' ? req.query.to : undefined,
      limit: typeof req.query.limit === 'string' ? req.query.limit : undefined
    })
    res.status(200).json({ success: true, data: orders })
  })
)

router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const users = await listAdminUsers({
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      q: typeof req.query.q === 'string' ? req.query.q : undefined,
      limit: typeof req.query.limit === 'string' ? req.query.limit : undefined
    })
    res.status(200).json({ success: true, data: users })
  })
)

router.patch(
  '/users/:id/status',
  asyncHandler(async (req, res) => {
    const status = String(req.body?.status ?? '').toUpperCase()
    if (!Object.values(UserStatus).includes(status as UserStatus)) {
      throw badRequest('Trạng thái người dùng không hợp lệ')
    }
    const user = await setAdminUserStatus(singleParam(req.params.id) ?? '', status as UserStatus, actorEmail(req))
    res.status(200).json({ success: true, data: user })
  })
)

router.get(
  '/partners',
  asyncHandler(async (req, res) => {
    const partners = await listAdminPartners({
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      q: typeof req.query.q === 'string' ? req.query.q : undefined,
      limit: typeof req.query.limit === 'string' ? req.query.limit : undefined
    })
    res.status(200).json({ success: true, data: partners })
  })
)

router.patch(
  '/partners/:id/approval',
  asyncHandler(async (req, res) => {
    const status = String(req.body?.approvalStatus ?? '').toUpperCase()
    if (!Object.values(ApprovalStatus).includes(status as ApprovalStatus)) {
      throw badRequest('Trạng thái duyệt đối tác không hợp lệ')
    }
    const partner = await setAdminPartnerApproval(
      singleParam(req.params.id) ?? '',
      status as ApprovalStatus,
      typeof req.body?.rejectReason === 'string' ? req.body.rejectReason : undefined,
      actorEmail(req)
    )
    res.status(200).json({ success: true, data: partner })
  })
)

router.patch(
  '/partners/:id/operating-status',
  asyncHandler(async (req, res) => {
    const status = String(req.body?.operatingStatus ?? '').toUpperCase()
    if (!Object.values(OperatingStatus).includes(status as OperatingStatus)) {
      throw badRequest('Trạng thái hoạt động của đối tác không hợp lệ')
    }
    const partner = await setAdminPartnerOperatingStatus(
      singleParam(req.params.id) ?? '',
      status as OperatingStatus,
      actorEmail(req)
    )
    res.status(200).json({ success: true, data: partner })
  })
)

router.get(
  '/vouchers',
  asyncHandler(async (req, res) => {
    const vouchers = await listAdminVouchers({
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      q: typeof req.query.q === 'string' ? req.query.q : undefined,
      limit: typeof req.query.limit === 'string' ? req.query.limit : undefined
    })
    res.status(200).json({ success: true, data: vouchers })
  })
)

router.patch(
  '/vouchers/:id/approval',
  asyncHandler(async (req, res) => {
    const status = String(req.body?.status ?? '').toUpperCase()
    const allowedStatuses: readonly VoucherStatus[] = [VoucherStatus.APPROVED, VoucherStatus.REJECTED]
    if (!allowedStatuses.includes(status as VoucherStatus)) {
      throw badRequest('Trạng thái duyệt voucher không hợp lệ')
    }
    const voucher = await setAdminVoucherApproval(
      singleParam(req.params.id) ?? '',
      status as VoucherStatus,
      typeof req.body?.rejectReason === 'string' ? req.body.rejectReason : undefined,
      actorEmail(req)
    )
    res.status(200).json({ success: true, data: voucher })
  })
)

router.patch(
  '/vouchers/:id/status',
  asyncHandler(async (req, res) => {
    const status = String(req.body?.status ?? '').toUpperCase()
    const allowedStatuses: readonly VoucherStatus[] = [
      VoucherStatus.ON_SALE,
      VoucherStatus.PAUSED,
      VoucherStatus.DISCONTINUED
    ]
    if (!allowedStatuses.includes(status as VoucherStatus)) {
      throw badRequest('Trạng thái voucher không hợp lệ')
    }
    const voucher = await setAdminVoucherStatus(
      singleParam(req.params.id) ?? '',
      status as VoucherStatus,
      actorEmail(req)
    )
    res.status(200).json({ success: true, data: voucher })
  })
)

router.get(
  '/codes',
  asyncHandler(async (req, res) => {
    const codes = await listAdminIssuedCodes({
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      q: typeof req.query.q === 'string' ? req.query.q : undefined,
      limit: typeof req.query.limit === 'string' ? req.query.limit : undefined
    })
    res.status(200).json({ success: true, data: codes })
  })
)

router.get(
  '/usage-logs',
  asyncHandler(async (req, res) => {
    const logs = await listAdminUsageLogs({
      q: typeof req.query.q === 'string' ? req.query.q : undefined,
      limit: typeof req.query.limit === 'string' ? req.query.limit : undefined
    })
    res.status(200).json({ success: true, data: logs })
  })
)

router.get(
  '/content',
  asyncHandler(async (req, res) => {
    const content = await listAdminContent({
      type: typeof req.query.type === 'string' ? req.query.type : undefined,
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      q: typeof req.query.q === 'string' ? req.query.q : undefined,
      limit: typeof req.query.limit === 'string' ? req.query.limit : undefined
    })
    res.status(200).json({ success: true, data: content })
  })
)

router.post(
  '/content',
  asyncHandler(async (req, res) => {
    const content = await createAdminContent(req.body ?? {}, actorEmail(req))
    res.status(201).json({ success: true, data: content })
  })
)

router.patch(
  '/content/:id',
  asyncHandler(async (req, res) => {
    const content = await updateAdminContent(singleParam(req.params.id) ?? '', req.body ?? {}, actorEmail(req))
    res.status(200).json({ success: true, data: content })
  })
)

router.delete(
  '/content/:id',
  asyncHandler(async (req, res) => {
    const content = await archiveAdminContent(singleParam(req.params.id) ?? '', actorEmail(req))
    res.status(200).json({ success: true, data: content })
  })
)

router.get(
  '/audit-logs',
  asyncHandler(async (req, res) => {
    const logs = await listAdminAuditLogs({
      action: typeof req.query.action === 'string' ? req.query.action : undefined,
      entityType: typeof req.query.entityType === 'string' ? req.query.entityType : undefined,
      q: typeof req.query.q === 'string' ? req.query.q : undefined,
      limit: typeof req.query.limit === 'string' ? req.query.limit : undefined
    })
    res.status(200).json({ success: true, data: logs })
  })
)

router.get(
  '/orders/:id',
  asyncHandler(async (req, res) => {
    const order = await getAdminOrder(singleParam(req.params.id) ?? '')
    res.status(200).json({ success: true, data: order })
  })
)

router.patch(
  '/orders/:id/cancel',
  asyncHandler(async (req, res) => {
    const order = await cancelAdminOrder(singleParam(req.params.id) ?? '', actorEmail(req))
    res.status(200).json({ success: true, data: order })
  })
)

router.patch(
  '/orders/:id/refund',
  asyncHandler(async (req, res) => {
    const order = await refundAdminOrder(singleParam(req.params.id) ?? '', actorEmail(req))
    res.status(200).json({ success: true, data: order })
  })
)

export default router
